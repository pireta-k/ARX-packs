import { Block, Entity, ItemStack, World } from "@minecraft/server"
import { str2obj, obj2str } from "./converters"

const specialDataTypePrefix = 'JSON$'

/**
 * Set Dynamic Property
 * Saves value to Dynamic Property with extended data types
 * @param {Entity | Block | ItemStack | World} object 
 * @param {string} DPName 
 * @param {*} value 
 */
export function sDP(object, DPName, value) {
    if (!object || !DPName) {
        console.warn(`Called sDP() without necessary vars`)
        return undefined
    }
    if (typeof value === 'function') {
        console.warn('Cannot write function to DP with sDP()')
        return undefined
    }
    if (typeof value === 'string' && value.startsWith(specialDataTypePrefix)) {
        console.warn(`sDP(): cannot write a string that starts with ${specialDataTypePrefix}`)
        return undefined
    }

    // Get the old value of this DP
    const oldValue = object.getDynamicProperty(DPName)

    // Special data format that can't be hadled just by obj.setDynamicProperty()
    if (value !== null && typeof value === 'object') {
        value = specialDataTypePrefix + obj2str(value)
    }
    // If the new value is not equal to the old value, write the new value
    if (oldValue !== value) {
        try { // I use try - catch, because sometimes system can throw an error when trying to sDP at imcopletely loaded player. It just can be ignored
            object.setDynamicProperty(DPName, value)
        }
        catch {
            console.log(`sDP(): an unexpected problem with writing DP to Entity`)
        }
    }

    return true
}

/** Increase Dyncamic Property
 * If you will try to increase non-existent DP, it will be set to the value that you are trying to add to this DP.
 * @param {Entity | Block | ItemStack | World} object 
 * @param {String} DPName 
 * @param {*} valueToIncrease 
 * @returns Result value of DP
 */
export function iDP(object, DPName, valueToIncrease = 1) {
    if (!object || !DPName) {
        console.warn(`Called iDP() without necessary vars`)
        return undefined
    }
    if (typeof valueToIncrease === 'object' || typeof valueToIncrease === 'function') {
        console.warn('iDP(): cannot use a function or an object as valueToIncrease')
        return undefined
    }

    // Get the current DP value
    const currentValue = gDP(object, DPName)

    // If DP is empty (minecraft returns undefined if DP is empty), set it to valueToIncrease
    if (currentValue === undefined) {
        sDP(object, DPName, valueToIncrease)
        return valueToIncrease
    }
    // If DP is a string
    else if (typeof currentValue === 'string') {
        const newVlaue = currentValue + String(valueToIncrease)
        sDP(object, DPName, newVlaue)
        return newVlaue
    }
    // If DP is a number
    else if (typeof currentValue === 'number') {
        if (typeof valueToIncrease !== 'number') {
            console.warn(`iDP(): cannot increase a number ${currentValue} by a non-number value <${valueToIncrease}> (type ${typeof valueToIncrease})`)
            return undefined
        }
        const newVlaue = currentValue + valueToIncrease
        sDP(object, DPName, newVlaue)
        return newVlaue
    }
    // If DP is an array
    else if (Array.isArray(currentValue)) {
        currentValue.push(valueToIncrease)
        sDP(object, DPName, currentValue)
        return currentValue
    }
    // Fallback (I don't see the way this code activates, but why not)
    else {
        console.warn('iDP(): cannot use this funcion with current values')
        return undefined
    }
}

/**
 * Get Dynamic Property
 * Supports arrays and objects
 * @param {Entity | Block | ItemStack | World} object 
 * @param {string} DPName 
 * @param {*} fallback - Fallback will be returned, if result = undefined
 * @returns {*}
 */
export function gDP(object, DPName, fallback = undefined) {
    // Check input
    if (!object || !DPName) {
        console.warn(`Called gDP() without necessary vars`)
        return undefined
    }

    // Get DP
    let value = object.getDynamicProperty(DPName)

    // If DP is obj
    if (typeof value === 'string' && value.startsWith(specialDataTypePrefix)) {
        try {
            const result = str2obj(value.slice(specialDataTypePrefix.length))
            value = result
        }
        // An error occured with this JSON var
        catch {
            console.warn(`gDP(): dp ${DPName} cannot be deserialized (value: ${value})`)
            // Reset it
            sDP(object, DPName, undefined)
            return undefined
        }
    }

    if (value === undefined) return fallback
    return value
}

export class DPManager {
    static clearOnRPDeath(player) {
        const dPs = player.getDynamicPropertyIds().filter(dp => !strongDPs.includes(dp))
        for (const dp of dPs) {
            player.sDP(dp, undefined)
        }
    }

    /**
     * DP that won't be cleared after RP death
     */
    static strongDPs = [
        'statistics:time_played_sec',
        'myRule:manaDisplayMode',
        'myRule:showAttackCDMode',
        'myRule:chatPrefixes',
        'myRule:canSeeServerSpeedInInfoBook',
        'myRule:devMode',
    ]
}