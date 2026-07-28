import { Entity, system, world } from "@minecraft/server"
import { sleep } from "./arxLib/time"
import { Vector } from "./arxLib/math"
import { Chat } from "./chat"

const defaultTimeout = 30 // Seconds
const baitListeningTickSpeed = 2 // Ticks
const dPPrefix = 'NPCManager:'

/** A head of a sequence
 * @typedef SequenceHead
 * @property {String} [id] - unique id. Sets automatically as sequence key in sequences obj
 * @property {String} [baitBlockId] - an Id of needed bait block
 * @property {String[]} [canBeAppliedOn] - an array of entity typeIDs that a sequence can be applied to
 */

/** An element of a sequence body
 * @typedef {SequenceArrayElementGoTo | 
 * SequenceArrayElementWait | 
 * SequenceArrayElementPlayAnimation | 
 * SequenceArrayElementMerge | 
 * SequenceArrayElementCycle | 
 * SequenceArrayElementJumpToStep | 
 * SequenceArrayElementTransit | 
 * SequenceArrayElementFork | 
 * SequenceArrayElementSay | 
 * SequenceArrayElementExpectChatMessage | 
 * SequenceArrayElementSetLocalName} SequenceArrayElement
 */

/** Goto
 * Go to a desired location
 * @typedef SequenceArrayElementGoTo
 * @property {"goto"} type
 * @property {import("@minecraft/server").Vector3} location
 */

/** TO-UPDATE Wait
 * Wait in ticks. Can also take as an input a function that will return a number.
 * @typedef SequenceArrayElementWait
 * @property {"wait"} type
 * @property {Number | Function} ticks
 */

/** Animation
 * Play animation
 * @typedef SequenceArrayElementPlayAnimation
 * @property {"playAnimation"} type
 * @property {String} animationId
 */

/** TO-DO Merge
 * Makes all inner steps to fire immediately. End depends on mode.
 * @typedef SequenceArrayElementMerge
 * @property {"merge"} type
 * @property {'awaitAll' | 'awaitFirst' | 'awaitOnlyAt0Position'} mode
 * @property {SequenceArrayElement[]}
 */

/** TO-DO Cycle
 * Make inner steps to run in cycle. Breaks when breakOn is true. Intended to use with merge (a NPC goes in circles and waits when you'll give her food)
 * @typedef SequenceArrayElementCycle
 * @property {"cycle"} type
 * @property {Function} [breakOn]
 * @property {SequenceArrayElement[]}
 */

/** TO-DO JumpToStep
 * Jumps to a certain step of a current sequence
 * @typedef SequenceArrayElementJumpToStep
 * @property {"jumpToStep"} type
 * @property {Number} step
 */

/** TO-DO Transit
 * Switches current sequence to a new one
 * @typedef SequenceArrayElementTransit
 * @property {"transit"} type
 * @property {String} sequence
 * @property {Number} [step]
 */

/**
 * TO-DO Fork
 * Decision. Two doors. Or three? Don't mind.
 * @typedef SequenceArrayElementFork
 * @property {"fork"} type
 * @property {ForkElement[]} 
 */

/**
 * TO-DO Fork element
 * Element that uses in SequenceArrayElementFork
 * @typedef ForkElement
 * @property {SequenceArrayElement} trigger - If await returns, counts as chosen.
 * @property {SequenceArrayElement} then - Then, will occur something. Maybe even SequenceArrayElementTransit
 */

/**
 * TO-UPDATE Say
 * Send a message to local chat
 * @typedef SequenceArrayElementSay
 * @property {"say"} type
 * @property {MessageType} [messageType] - Local by default
 * @property {String} [text]
 * @property {String} [localizationKey]
 */

/**
 * ExpectChatMessage
 * Waits to hear something
 * @typedef SequenceArrayElementExpectChatMessage
 * @property {"expectChatMessage"} type
 * @property {String} [text] - Listen for a certain text
 * @property {ExpectChatMessageMode} [mode] - Does the desired text have to match with a heard text exactly? 'includes' by default
 * @property {ExpectChatMessageMess} [isMessed] - Is messed
 * @property {MessageType[]} [messageType] - Type of a message. If defined, messageTypeExclude will be ignored
 * @property {MessageType[]} [messageTypeExclude] - Type of a message that are not OK. ['global' by default]
 */

/**
 * @typedef { 'equal' | 'includes' | 'notEqual' | 'notIncludes'} ExpectChatMessageMode
 */
/**
 * @typedef {'any' | 'clear' | 'messed'} ExpectChatMessageMess
 */
/**
 * @typedef {'local' | 'global' | 'shout' | 'whisper' | 'action'} MessageType
 */

/**
 * TO-DO SetLocalName. Takes a localization key
 * @typedef SequenceArrayElementSetLocalName
 * @property {"setLocalName"} type
 * @property {String} [localizationKey]
 */

/** A head and a body
 * @typedef SingleSequence
 * @property {SequenceHead} head
 * @property {SequenceArrayElement[]} body
 */

/** All the sequences
 * @type {Record<String, SingleSequence>}
 */
const sequences = {
    eve_test: {
        head: {
            baitBlockId: 'arx:bait_eve',
            canBeAppliedOn: ['arx:eve']
        },
        body: [
            { type: "setLocalName", localizationKey: 'eve.name' },
            { type: "say", text: 'I\'m here!' },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "playAnimation", animationId: "animation.killing_time.a" },
            { type: "wait", ticks: 80 },
            { type: "goto", location: { x: 5, y: -60, z: 5 } },
            { type: "playAnimation", animationId: "animation.killing_time.b" },
            { type: "wait", ticks: 80 },
            { type: "say", text: 'Give me a code: 12343' },
            { type: "expectChatMessage", mode: "includes", text: '12343', isMessed: "clear" },
            { type: "say", text: 'Thanks' },
            { type: "goto", location: { x: -5, y: -60, z: 5 } },
            { type: "goto", location: { x: -5, y: -60, z: -5 } },
            { type: "goto", location: { x: 5, y: -60, z: -5 } },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "playAnimation", animationId: "animation.killing_time.c" },
            { type: "say", text: 'That\'s all' }
        ]
    }
}

function checkSequences() {
    function warn(text) {
        const seqWarnPrefix = `[§eSequenceCheckWarning§r]`
        console.warn(seqWarnPrefix + ': ' + text)
    }

    for (const key in sequences) {
        const seq = sequences[key]
        // Basic
        if (!('head' in seq)) {
            warn(`No head in ${key} sequence`)
            delete sequences[key]
            continue
        }
        if (!('body' in seq)) {
            warn(`No body in ${key} sequence`)
            delete sequences[key]
            continue
        }
        // Add ID
        seq.head.id = key
        // Head details
        if (!seq.head.baitBlockId && seq.body.filter(step => step.type === 'goto').length > 0) {
            warn(`Goto exist in ${key}, but there is no baitBlockId given`)
        }
        // Body details
        if (!Array.isArray(seq.body)) warn(`Body is not an array in ${key}`)
    }
}
checkSequences()

/**
 * A class that represents an action sequence for an NPC
 */
class NPCSequence {

    /** @param {SingleSequence} sequence; @param {Entity} entity  */
    constructor(sequence, entity) {
        // Check sequence
        if (typeof sequence !== 'object' || !sequence.head || !sequence.body || !entity) {
            console.error('Trying to initialize an incorrect sequnence')
            return
        }

        // Assign properties
        this.id = sequence.head.id
        this.numOfSteps = sequence.body.length
        this.entity = entity
        this.baitBlockId = sequence.head.baitBlockId
        this.canBeAppliedOn = sequence.head.canBeAppliedOn

        this.body = sequence.body
    }

    #doStepExists(stepId) {
        return stepId < this.numOfSteps
    }


    /**
     * === The main function of this class ===
     * Runs a sequence from a last-saved ?? 0 step
     */
    async run() {
        const e = this.entity
        let currentStep = NPCManager.getSequenceStep(e) ?? 0
        do {
            await this.#runStep(currentStep)
            currentStep++
            NPCManager.setSequenceStep(e, currentStep)
        } while (this.numOfSteps > currentStep)
        // Finished
        NPCManager.clearSequence(e)
    }

    /**
     * Execute sequence step and wait for it to end
     * @param {Number} step 
     */
    async #runStep(stepId) {
        // console.warn(`Started step ${stepId} of sequence ${this.id}`)
        const e = this.entity

        // Step do not exist
        if (!this.#doStepExists(stepId)) {
            console.error('Trying to run non-existent step')
            return
        }

        /** @type {SequenceArrayElement} */
        const step = this.body[stepId]
        switch (step.type) {
            case 'goto':
                e.triggerEvent('arx:add_bait_sensor')
                const resolvedLocation = NPCManager.addOffset(e, step.location)
                await new Promise((resolve, reject) => {
                    const b = e.dimension.getBlock(resolvedLocation)
                    if (!b) {
                        console.warn(`Cannot create a block object while processing a sequence (id: ${NPCManager.getSequenceId(e)}, step: ${stepId}). The entity was teleported to desired location instead of classic navigation`)
                        e.teleport(resolvedLocation)
                        resolve(true)
                        return
                    }
                    b.setType(this.baitBlockId)

                    let secondsElapsed = 0
                    const intervalId = system.runInterval(() => {
                        if (!e.isValid) {
                            system.clearRun(intervalId)
                            reject('Entity is not valid')
                            return
                        }
                        if (secondsElapsed > defaultTimeout) {
                            system.clearRun(intervalId)
                            b.setType('minecraft:air')
                            e.teleport(resolvedLocation) // Teleport entity to the desired location
                            resolve(true)
                            return
                        }
                        if (e.getTags().includes('bait_reached')) {
                            // console.warn(`Successfully reached the block`)
                            e.removeTag('bait_reached')
                            b.setType('air')
                            system.clearRun(intervalId)
                            resolve(true)
                            return
                        }
                        secondsElapsed += 0.05 * baitListeningTickSpeed
                    }, baitListeningTickSpeed)
                })
                break

            case 'wait':
                await sleep(step.ticks)
                break

            case 'playAnimation':
                e.playAnimation(step.animationId)
                break

            case 'expectChatMessage':
                let currentResolve
                try {
                    await new Promise((resolve, reject) => {
                        currentResolve = resolve
                        /** @type {ChatListenerOptions} */
                        const options = {
                            text: step.text,
                            mode: step.mode ?? 'includes',
                            isMessed: step.isMessed ?? 'any',
                            messageType: step.messageType,
                            messageTypeExclude: step.messageTypeExclude ?? ['global']
                        }
                        NPCManager.registerChatListener(e, options, resolve) // Register chat listener and wait for it to be resolved
                    })
                } catch (error) {
                    console.error(`An error occoured in expectChatMessage: ${error.stack}${error}`)
                } finally {
                    if (currentResolve) NPCManager.unregisterChatListener(e, currentResolve)
                }
                break

            case 'say':
                if (step.text) new Chat.Message(e, step.text, { type: step.messageType }).send()
                else if (step.localizationKey) { } // to-do
                else console.warn('A message has no text nor localization key')
                break

            case 'setLocalName':
                e.sDP('localizationName', step.localizationKey)
                break

            default:
                console.error(`Unexpected action in sequence ${this.id} in step ${stepId}: ${step.type}`)
        }
    }
}

export class NPCManager {

    // === Chat listeners ===

    /**
     * @typedef ChatListener
     * @property {ChatListenerOptions} options
     * @property {Function} resolve
     */
    /** @type {Map<Entity.id, ChatListener[]>} */
    static chatListeners = new Map()
    /**
     * @typedef ChatListenerOptions
     * @property {String} text
     * @property {ExpectChatMessageMode} mode
     * @property {ExpectChatMessageMess} isMessed
     * @property {MessageType[]} [messageType] - An array of message types that are OK
     * @property {MessageType[]} [messageTypeExclude] - An array of message types that are not OK. ['global' by default]
     */

    /**
     * Add a listener to chatListeners
     * @param {Entity} e 
     * @param {ChatListenerOptions} options
     * @param {Function} resolve 
     */
    static registerChatListener(e, options, resolve) {
        // console.warn(`Chat listener has beed added for ${e.typeId}`)
        // Create an empty listeners array if it don't exist
        if (!this.chatListeners.has(e.id)) {
            this.chatListeners.set(e.id, [])
        }

        // Add a new listener
        const existingListeners = this.chatListeners.get(e.id)
        existingListeners.push({
            options: options,
            resolve: resolve
        })
    }
    /**
     * Remove chat listener
     * @param {Entity} e 
     * @param {Function} [resolve] - Unique resolve "button" for a current listener. Removes all listeners if not specified
     */
    static unregisterChatListener(e, resolve) {
        // console.warn(`Chat listener has beed removed for ${e.typeId}`)
        const listeners = this.chatListeners.get(e.id)
        if (!listeners) return

        if (resolve) {
            const index = listeners.findIndex(listener => listener.resolve === resolve)
            if (index !== -1) {
                listeners.splice(index, 1)
            }
        } else {
            this.chatListeners.delete(e.id)
        }

        // No listeners left
        if (listeners.length === 0) {
            this.chatListeners.delete(e.id)
        }
    }
    /**
     * Triggers externally when a dynamicNPC recieves an arx message 
     * @param {Entity} listenerEntity 
     * @param {Chat.Message} message 
     * @param {String} text - Heard text
     * @param {Boolean} isClear - Is the message clear 
     * @returns 
     */
    static processChatTrigger(listenerEntity, message, inputText, isClear) {
        // console.warn(`Chat was processed for ${listenerEntity.typeId}`)
        /** @type { ChatListener[] } */
        const listeners = this.chatListeners.get(listenerEntity.id)
        if (!listeners) return false // Entity doesn't have chat listeners

        for (let i = listeners.length - 1; i >= 0; i--) {
            const listener = listeners[i]
            // === Check options ===
            // Check content
            let allowByContent = false
            {
                if (!listener.options.text) allowByContent = true
                else {
                    switch (listener.options.mode) {
                        case 'equal':
                            if (inputText == listener.options.text) allowByContent = true
                            break

                        case 'notEqual':
                            if (inputText != listener.options.text) allowByContent = true
                            break

                        case 'includes':
                            if (inputText.includes(listener.options.text)) allowByContent = true
                            break

                        case 'notIncludes':
                            if (!inputText.includes(listener.options.text)) allowByContent = true
                            break

                        default:
                            console.warn(`processChatTrigger: desired text provided, but a mode is incorrect: ${listener.options.mode}`)
                    }
                }
            }

            // Check mess
            let allowByMess = false
            {
                switch (listener.options.isMessed) {
                    case "any":
                    case undefined:
                        allowByMess = true
                        break

                    case "clear":
                        if (isClear) allowByMess = true
                        break

                    case "messed":
                        if (!isClear) allowByMess = true
                        break

                    default:
                        console.warn(`processChatTrigger: unexpected isMessed value (${listener.options.isMessed}). Consider as 'any'.`)
                        allowByMess = true
                        break
                }
            }

            // Check type
            let allowByType = false
            {
                if ((listener.options.messageType?.length ?? 0) > 0) { // Analyze only messageType
                    if (listener.options.messageType.includes(message.type)) allowByType = true
                } else { // Analyze only messageTypeExclude
                    if (!listener.options.messageTypeExclude.includes(message.type)) allowByType = true
                }
            }

            if (allowByContent && allowByMess && allowByType) {
                listener.resolve({
                    heardText: inputText,
                    sourceName: message.sourceName,
                })
            }
        }
    }


    // Entities that are processing now
    static entities = []
    /**
     * Add an entity to processing list
     * @param {Entity} e 
     */
    static addEntity(e) {
        if (this.isEntityProcessing(e)) {
            console.warn(`Can't add the entity to active entities: it is already added`)
            return false
        }
        else this.entities.push(e.id)
    }
    /**
     * Remove Entites from processing list
     * @param {Entity} e 
     * @returns {Boolean} Was the entity in the list before?
     */
    static removeEntity(e) {
        if (this.isEntityProcessing(e)) {
            this.entities = this.entities.filter(id => id !== e.id)
            // console.warn('An entity was removed from active entities')
            return true
        }
        return false
    }
    /**
     * Is the entity listed in entities?
     * @param {Entity} e 
     */
    static isEntityProcessing(e) { return this.entities.includes(e.id) }

    // Any direct interactions with DPs are PROHIBITED! Use only functions below.
    /** @param {Entity} e */
    static doEntityHasActiveSequence(e) { return e.gDP(dPPrefix + 'sequenceId') !== undefined }
    /** @param {Entity} e */
    static getSequenceStep(e) { return e.gDP(dPPrefix + 'sequenceStep') }
    /** 
     * @param {Entity} e 
     * @param {Number} step  
     */
    static setSequenceStep(e, step) { return e.sDP(dPPrefix + 'sequenceStep', step) }
    /** 
     * @param {Entity} e 
     * @param {Number} step  
     */
    static setSequenceId(e, id) { return e.sDP(dPPrefix + 'sequenceId', id) }
    /** 
     * Clears entity's sequence and all sequence-related data
     * @param {Entity} e 
     * */
    static clearSequence(e) {
        if (e && e.isValid) {
            e.sDP(dPPrefix + 'sequenceId', undefined)
            e.sDP(dPPrefix + 'sequenceStep', undefined)
        }
        this.removeEntity(e)
        this.unregisterChatListener(e)
        return true
    }
    /** @param {Entity} e */
    static getSequenceId(e) { return e.gDP(dPPrefix + 'sequenceId') }
    /**
     * Get a sequence instance that is registered on an entity right now
     * @param {Entity} e 
     * @returns {NPCSequence | undefined}
     */
    static getSequence(e) {
        const id = this.getSequenceId(e)
        if (id) {
            return new NPCSequence(sequences[id], e)
        }
        else return undefined
    }
    /**
     * @typedef RunSequenceOptions
     * @property {'auto' | 'clear'} [mode] - auto - start a sequence from last-saved step, clear - start from a beginning
     * @property {Boolean} [allowOverride] - allow override of an existing sequence
     */

    /**
     * MAIN INPUT for all the Arx NPC system
     * Runs ALL the sequence
     * @param {Entity} e 
     * @param {String} seqId - id of a sequence, e.g. eve_test
     * @param {RunSequenceOptions} [options]
     * @returns 
     */
    static async runSequence(e, seqId, options = { mode: 'auto', allowOverride: false }) {
        // Basic check
        if (!e || !(e instanceof Entity)) {
            console.error(`runSequence: Invalid entity provided`)
            return
        }
        if (!seqId || typeof seqId !== 'string') {
            console.error(`runSequence: Cannot launch a sequence, no id (or invalid id) provided`)
            return
        }
        // Do the provided sequence exists?
        if (!(seqId in sequences)) {
            console.error(`runSequence: Trying to run a non-existent sequence ${seqId}`)
            return
        }
        // Override check
        const hasAnotherSeq = this.getSequenceId(e) && this.getSequenceId(e) !== seqId
        if (hasAnotherSeq) {
            if (!options.allowOverride) {
                console.error(`runSequence: Trying to override existing sequence with ${seqId} on ${e.typeId}. Declined.`)
                return
            } else {
                // Override occures
                NPCManager.clearSequence(e)
            }
        }

        // Run
        this.setSequenceId(e, seqId)
        // Get sequence
        const seq = this.getSequence(e)
        // Entity filter check
        if (seq.canBeAppliedOn && !seq.canBeAppliedOn.includes(e.typeId)) {
            console.warn('Trying to apply a sequence to an inappropriate entity')
            return
        }
        if (seq) {
            this.addEntity(e)
            try {
                await seq.run()
            } catch (error) {
                console.warn(`NPCManager - ${error.stack}${error}`)
            } finally {
                NPCManager.clearSequence(e)
            }
        }
        else console.error(`Cannot start sequence: Unexpected error occured`)
    }
    /**
     * Restore sequence processing (e.g. after reloading a world)
     * @param {Entity} e 
     */
    static async restoreSequence(e) {
        const currentSeqId = this.getSequenceId(e)
        if (!currentSeqId) {
            console.warn('restoreSequence: No sequence to restore')
            return
        }
        // We don't have to await this
        this.runSequence(e, currentSeqId, { mode: 'auto' })
    }
    /**
     * Set an offset to an entity that will be included to any positional code
     * It can be used to coordinate entity's movement in location with known coordinates (location coords will be the offset then)
     * @param {Entity} e 
     * @param {import("@minecraft/server").Vector3} offset 
     */
    static setNavigationOffset(e, offset) {
        e.sDP(dPPrefix + 'offset', offset)
    }
    /**
     * Add entity's offset to a vector
     * @param {Entity} e 
     * @param {import("@minecraft/server").Vector3} vector 
     * @returns {import("@minecraft/server").Vector3}
     */
    static addOffset(e, vector) {
        const offset = e.gDP(dPPrefix + 'offset') ?? { x: 0, y: 0, z: 0 }
        return Vector.sum(vector, offset)
    }
}

// An entity was loaded. Check for sequences
world.afterEvents.entityLoad.subscribe(async event => {
    const e = event.entity
    if (NPCManager.doEntityHasActiveSequence(e) && !NPCManager.isEntityProcessing(e)) {
        NPCManager.restoreSequence(e)
    }
})

// Entity death or unloading
world.beforeEvents.entityRemove.subscribe(async event => {
    const e = event.removedEntity
    NPCManager.removeEntity(e)
    NPCManager.unregisterChatListener(e)
})