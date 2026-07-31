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
 * SequenceArrayElementSetLocalName |
 * SequenceArrayElementSubsequence} SequenceArrayElement
 */

/** Goto
 * Go to a desired location
 * @typedef SequenceArrayElementGoTo
 * @property {"goto"} type
 * @property {import("@minecraft/server").Vector3} location
 */

/** Wait
 * Wait in ticks or seconds.
 * @typedef SequenceArrayElementWait
 * @property {"wait"} type
 * @property {Number} [ticks]
 * @property {Number} [seconds]
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
 * @property {SequenceArrayElement[]} sequence
 */

/** Cycle
 * Make inner steps to run in cycle. Intended to use with merge (a NPC goes in circles and waits when you'll give her food)
 * @typedef SequenceArrayElementCycle
 * @property {"cycle"} type
 * @property {SequenceArrayElement[]} sequence
 */

/** TO-DO JumpToStep
 * Jumps to a certain step of a current sequence
 * @typedef SequenceArrayElementJumpToStep
 * @property {"jumpToStep"} type
 * @property {Number[]} step
 */

/** Transit
 * Switches current sequence to a new one
 * @typedef SequenceArrayElementTransit
 * @property {"transit"} type
 * @property {String} sequenceId
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

/** @typedef { 'equal' | 'includes' | 'notEqual' | 'notIncludes' | 'any'} ExpectChatMessageMode*/ // Any means that text does not matter at all
/** @typedef {'any' | 'clear' | 'messed'} ExpectChatMessageMess*/
/** @typedef {'local' | 'global' | 'shout' | 'whisper' | 'action'} MessageType*/

/**
 * SetLocalName. Takes a localization key
 * @typedef SequenceArrayElementSetLocalName
 * @property {"setLocalName"} type
 * @property {String} [localizationKey]
 */

/**
 * Subsequence. An embedded array of sequence steps
 * @typedef SequenceArrayElementSubsequence
 * @property {"subsequence"} type
 * @property {SequenceArrayElement[]} sequence
 */

/** A head and a body
 * @typedef SequenceObject
 * @property {SequenceHead} head
 * @property {SequenceArrayElement[]} body
 */

/** All the sequences
 * @type {Record<String, SequenceObject>}
 */
const sequences = {
    eve_test: {
        head: {
            baitBlockId: 'arx:bait_eve',
            canBeAppliedOn: ['arx:eve']
        },
        body: [
            {
                type: 'subsequence', // Initialize
                sequence: [
                    { type: "setLocalName", localizationKey: 'eve.name' },
                    { type: "say", text: 'I\'m here!' },
                ]
            },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            {
                type: "subsequence",
                sequence: [
                    { type: "goto", location: { x: 5, y: -60, z: 5 } },
                    { type: "playAnimation", animationId: "animation.killing_time.b" },
                    { type: "wait", ticks: 80 },
                    {
                        type: "subsequence",
                        sequence: [
                            { type: "say", text: 'Give me a code: 12343' },
                            { type: "expectChatMessage", mode: "includes", text: '12343', isMessed: "clear" },
                            { type: "wait", seconds: 1 },
                            { type: "say", text: 'Thanks' },
                        ]
                    },
                ]
            },
            { type: "goto", location: { x: -5, y: -60, z: 5 } },
            { type: "goto", location: { x: -5, y: -60, z: -5 } },
            { type: "goto", location: { x: 5, y: -60, z: -5 } },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "playAnimation", animationId: "animation.killing_time.c" },
            { type: 'transit', sequenceId: 'eve_test2' },
            {
                type: 'cycle',
                sequence: [
                    { type: "wait", ticks: 200 },
                    { type: "say", text: 'Hmmm...' },
                ]
            },
            { type: "say", text: 'That\'s all' }
        ]
    },

    eve_test2: {
        head: {
            baitBlockId: 'arx:bait_eve',
            canBeAppliedOn: ['arx:eve']
        },
        body: [
            { type: "say", text: 'I was transferred to eve_test2' },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "say", messageType: 'action', text: "Yawn" },
            { type: 'wait', seconds: 1 },
            { type: "say", text: "Mmmmh... I'm tired" },
        ]
    }
}

/**
 * Checks, are the sequences OK.
 */
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

/** @typedef {Number[]} SequenceStep */

/**
 * A class that represents an action sequence for an NPC
 */
class NPCSequence {

    /** @param {SequenceObject} sequence; @param {Entity} entity  */
    constructor(sequence, entity) {
        // Check sequence
        if (typeof sequence !== 'object' || !sequence.head || !sequence.body || !entity) {
            console.error('Trying to initialize an incorrect sequnence')
            return
        }

        // Assign properties
        this.id = sequence.head.id
        this.numOfRootSteps = sequence.body.length
        this.entity = entity
        this.baitBlockId = sequence.head.baitBlockId
        this.canBeAppliedOn = sequence.head.canBeAppliedOn

        this.body = sequence.body
    }

    /**
     * Get a step object via step.
     * Processes all kinds of subsequences
     * @param {SequenceStep} step
     * @param {boolean} [shutUp=false] - Do not write in log, if the index is non-existent
     * @returns {SequenceArrayElement | null}
     */
    #getStepObj(step, shutUp = false) {
        let currentSequence = this.body

        for (let i = 0; i < step.length; i++) {
            const sequenceElementIndex = step[i]

            // Step do not exist
            if (sequenceElementIndex >= currentSequence.length) {
                if (!shutUp) console.warn(`Trying to adress a non-existent index ${sequenceElementIndex} of sequence ${this.id}`)
                return null
            }

            const thisSequenceElement = currentSequence[sequenceElementIndex]

            // This is a target highest-level step
            if (i === step.length - 1) {
                return thisSequenceElement
            }

            // This is not a subsequence, but a step declares that we have to open it as a subsequence. Abort
            if (!NPCSequence.#isElementAnySubsequence(thisSequenceElement)) {
                console.warn('Subsequence expected but not exists')
                return null
            }

            // Dive deeper. Make a currentSequence a deeper subsequence
            currentSequence = currentSequence[sequenceElementIndex].sequence
        }
        return null
    }

    /**
     * Returns a next step
     * Returns true if a sequence is completed
     * Returns false if something unexpected occured
     * @returns {SequenceStep | Boolean}
     */
    #getNextStep(step) {
        const originalSequenceElement = this.#getStepObj(step)
        if (!originalSequenceElement) {
            console.warn('Step is invalid')
            return false
        }

        let resultStep = [...step]

        // === Exit sequence/subsequence: no next step on this sequence ===
        // Returns true if a sequence is completed
        // If a subsequence(s) was completed, exit it and proceed to "Same-level transition"
        // Check for multiple endings (Maybe we have to exit 2 depth levels simultaneously, who knows.)
        while (true) {

            const nextStepOnTheSameLevel = [...resultStep]
            nextStepOnTheSameLevel[nextStepOnTheSameLevel.length - 1] += 1

            // No further step in this sequence
            if (!this.#doStepExists(nextStepOnTheSameLevel)) {
                // The root sequence is completed
                if (resultStep.length <= 1) return true
                // Are we in a cycle?
                const parentStep = resultStep.slice(0, -1)
                const parentElement = this.#getStepObj(parentStep)
                if (parentElement.type === 'cycle') {
                    return [...parentStep, 0]
                }
                // Exit subsequence
                resultStep = resultStep.slice(0, -1)
            } else { break }
        }

        // === Same-level transition ===
        const thisSequenceElement = this.#getStepObj(resultStep)
        // Check
        if (!thisSequenceElement) {
            console.warn('NPCSequence.#getNextStep(): Unexpected error occured')
            return false
        }
        // Transit further
        resultStep[resultStep.length - 1] += 1

        // === Enter sequence ===
        // Also check for multiple entrances, maybe we have to go 2 or 3 levels up
        while (NPCSequence.#isElementAnySubsequence(this.#getStepObj(resultStep))) {
            resultStep.push(0)
        }

        return resultStep
    }

    /**
     * Checks an existance of a step
     * @param {SequenceStep} step 
     * @returns {Boolean}
     */
    #doStepExists(step) {
        return !!this.#getStepObj(step, true)
    }

    /**
     * Checks if an element is a subsequence
     * @param {SequenceArrayElement} seq 
     * @returns {Boolean}
     */
    static #isElementAnySubsequence(seq) {
        try {
            const subsequenceTypes = ['subsequence', 'cycle', 'merge']
            if (subsequenceTypes.includes(seq.type)) return true
        }
        catch { }
        return false
    }

    /** @typedef {'killSequence' | undefined} SequenceElementResponce */

    /**
     * === The main function of this class ===
     * Runs a sequence from a last-saved ?? 0 step
     */
    async run() {
        const e = this.entity
        let currentStep = NPCManager.getSequenceStep(e) ?? [0]
        // Check step
        if (!this.#doStepExists(currentStep)) {
            console.warn(`NPCSequence.run(): Unexistent step ${currentStep} has gotten from an entity. Current step was set to zero.`)
            currentStep = [0]
        }
        while (true) {
            // If is is a subsequence (or a set of them)
            while (NPCSequence.#isElementAnySubsequence(this.#getStepObj(currentStep))) {
                currentStep.push(0)
            }
            // Run
            /** @type {SequenceElementResponce} */
            const responce = await this.#runStep(currentStep)
            if (responce === 'killSequence') break

            currentStep = this.#getNextStep(currentStep)
            if (currentStep === false) {
                console.warn('An error occured while processing a sequence step. Sequence aborted')
                break // End with an error
            } else if (currentStep === true) {
                break // Sucessful end
            }
            NPCManager.setSequenceStep(e, currentStep)
        }
        // Finished
        NPCManager.clearSequence(e)
    }

    /**
     * Execute sequence step and wait for it to end
     * @param {Number[]} step
     * @returns {SequenceElementResponce}
     */
    async #runStep(step) {
        // Check
        if (!Array.isArray(step)) {
            console.warn(`#runStep: Invalid step (${step}, type ${typeof step}) provided for seq ${this.id}`)
        }

        const e = this.entity

        /** @type {SequenceArrayElement} */
        const seqElement = this.#getStepObj(step)
        if (!seqElement) {
            console.error(`Trying to run non-existent step ${step} for ${this.id}`)
            return
        }
        switch (seqElement.type) {
            case 'goto':
                e.triggerEvent('arx:add_bait_sensor')
                const resolvedLocation = NPCManager.addOffset(e, seqElement.location)
                await new Promise((resolve, reject) => {
                    const b = e.dimension.getBlock(resolvedLocation)
                    if (!b) {
                        console.warn(`Cannot create a block object while processing a sequence (id: ${NPCManager.getSequenceId(e)}, step ${step}). The entity was teleported to desired location instead of classic navigation`)
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
                const ticks = Math.round(seqElement.ticks ?? seqElement.seconds * 20)
                if (!ticks || typeof ticks !== 'number' || ticks < 0) {
                    console.warn(`NPCSequence: Wait element ${step} on seq ${this.id}: invalid (ticks | seconds) value provided`)
                } else {
                    await sleep(ticks)
                }
                break

            case 'playAnimation':
                e.playAnimation(seqElement.animationId)
                break

            case 'expectChatMessage':
                let currentResolve
                try {
                    await new Promise((resolve, reject) => {
                        currentResolve = resolve
                        /** @type {ChatListenerOptions} */
                        const options = {
                            text: seqElement.text,
                            mode: seqElement.mode ?? 'includes',
                            isMessed: seqElement.isMessed ?? 'any',
                            messageType: seqElement.messageType,
                            messageTypeExclude: seqElement.messageTypeExclude ?? ['global']
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
                if (seqElement.text) new Chat.Message(e, seqElement.text, { type: seqElement.messageType }).send()
                else if (seqElement.localizationKey) { } // to-do
                else console.warn('A message has no text nor localization key')
                break

            case 'setLocalName':
                e.sDP('localizationName', seqElement.localizationKey)
                break

            case 'transit':
                if (!(seqElement.sequenceId in sequences)) {
                    console.error(`Trying to transit to a non-existent sequence ${seqElement.sequenceId} from seq ${this.id}`)
                    return
                }
                NPCManager.runSequence(this.entity, seqElement.sequenceId, { allowOverride: true })
                return 'killSequence'

            default:
                console.error(`Unexpected action in sequence ${this.id}: ${seqElement.type}`)
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

                        case 'any':
                            allowByContent = true
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
    /** 
     * @param {Entity} e
     * @returns {SequenceStep}
     */
    static getSequenceStep(e) { return e.gDP(dPPrefix + 'sequenceStep') }
    /** 
     * @param {Entity} e 
     * @param {SequenceStep} step  
     */
    static setSequenceStep(e, step) { return e.sDP(dPPrefix + 'sequenceStep', step) }
    /** 
     * Sets sequence Id to an entity
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