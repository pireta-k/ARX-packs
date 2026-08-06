import { Entity, system, world } from "@minecraft/server"
import { sleep } from "./arxLib/time"
import { Vector } from "./arxLib/math"
import { Chat } from "./chat"
import { md5 } from "./arxLib/converters"
import { sDP } from "./arxLib/DPOperations"

const defaultTimeout = 30 // Seconds
const baitListeningTickSpeed = 2 // Ticks
const dPPrefix = 'NPCManager:'

/** A head of a sequence
 * @typedef {Object} SequenceHead
 * @property {String} [id] - unique id. Sets automatically as sequence key in sequences obj
 * @property {String} [baitBlockId] - an Id of needed bait block
 * @property {String[]} [canBeAppliedOn] - an array of entity typeIDs that a sequence can be applied to
 * @property {LightPostMap} [lightPostMap] - A map of lightposts. Creates automatically
 */

/** An element of a sequence body
 * @typedef {SequenceArrayElementGoTo | 
 * SequenceArrayElementWait | 
 * SequenceArrayElementPlayAnimation | 
 * SequenceArrayElementMerge | 
 * SequenceArrayElementCycle | 
 * SequenceArrayElementLightPost | 
 * SequenceArrayElementJumpToLightPost | 
 * SequenceArrayElementTransit | 
 * SequenceArrayElementFork | 
 * SequenceArrayElementSay | 
 * SequenceArrayElementExpectChatMessage | 
 * SequenceArrayElementSetLocalName |
 * SequenceArrayElementSubsequence} SequenceArrayElement
 */

/** Goto
 * Go to a desired location
 * @typedef {Object} SequenceArrayElementGoTo
 * @property {"goto"} type
 * @property {import("@minecraft/server").Vector3} location
 */

/** Wait
 * Wait in ticks or seconds.
 * @typedef {Object} SequenceArrayElementWait
 * @property {"wait"} type
 * @property {Number} [ticks]
 * @property {Number} [seconds]
 */

/** Animation
 * Play animation
 * @typedef {Object} SequenceArrayElementPlayAnimation
 * @property {"playAnimation"} type
 * @property {String} animationId
 */

/** TO-DO Merge
 * Makes all inner steps to fire immediately. End depends on mode.
 * @typedef {Object} SequenceArrayElementMerge
 * @property {"merge"} type
 * @property {'awaitAll' | 'awaitFirst' | 'awaitOnlyAt0Position'} mode
 * @property {SequenceArrayElement[]} sequence
 */

/** Cycle
 * Make inner steps to run in cycle. Intended to use with merge (a NPC goes in circles and waits when you'll give her food)
 * @typedef {Object} SequenceArrayElementCycle
 * @property {"cycle"} type
 * @property {SequenceArrayElement[]} sequence
 * @property {Number} [repeatTimes]
 */

/**
 * TO-DO Fork
 * Decision. Two doors. Or three? Don't mind.
 * Allows you to choose between given ForkElement. 
 * After one was chosen, all other cannot be chosen.
 * @typedef {Object} SequenceArrayElementFork
 * @property {"fork"} type
 * @property {ForkElement[]} elements
 */

/**
 * TO-DO Fork element
 * Element that uses in SequenceArrayElementFork
 * @typedef {Object} ForkElement
 * @property {SequenceArrayElement[]} trigger - If trigger sequence finishes, counts as the chosen option.
 * @property {SequenceArrayElement[]} then - Then, will occur something. Maybe even SequenceArrayElementTransit
 */

/**
 * Say
 * Send a message to local chat
 * @typedef {Object} SequenceArrayElementSay
 * @property {"say"} type
 * @property {String} key - Localization key
 * @property {MessageType} [messageType='local']
 * @property {Boolean} [sayRawKey=false]
 */

/**
 * ExpectChatMessage
 * Waits to hear something
 * @typedef {Object} SequenceArrayElementExpectChatMessage
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
 * @typedef {Object} SequenceArrayElementSetLocalName
 * @property {"setLocalName"} type
 * @property {String} [localizationKey]
 */

/**
 * Subsequence. An embedded array of sequence steps
 * @typedef {Object} SequenceArrayElementSubsequence
 * @property {"subsequence"} type
 * @property {Boolean} [await] - Wait for the end of a subsequence
 * @property {SequenceArrayElement[]} sequence
 */

/**
 * TO-DO Execute
 * USE WITH CAUTION
 * @typedef {Object} SequenceArrayElementExecute
 * @property {"execute"} type
 * @property {Function} run - async function
 */

/** TO-UPDATE Transit
 * Switches current sequence to a new one.
 * Kills all threads on a current sequence
 * @typedef {Object} SequenceArrayElementTransit
 * @property {"transit"} type
 * @property {String} sequenceId
 * @property {String} [lightPost]
 */

/**
 * LightPost
 * Does nothing by itself. Works as a marker. Can be jumped on with transit or jumpToLightPost
 * @typedef {Object} SequenceArrayElementLightPost
 * @property {"lightPost"} type
 * @property {String} name
 */

/** JumpToLightPost
 * Jumps to a certain lightPost of a current sequence
 * @typedef {Object} SequenceArrayElementJumpToLightPost
 * @property {"jumpToLightPost"} type
 * @property {String} name
 */

/** A head and a body
 * @typedef {Object} SequenceObject
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
                    { type: "say", key: 'chat.eve.hello' },
                ]
            },
            { type: 'lightPost', name: 'start' },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            {
                type: 'subsequence',
                await: false,
                sequence: [
                    { type: "wait", seconds: 1 },
                    { type: "say", key: 'What are we doing, exactly?', sayRawKey: true },
                    { type: "wait", seconds: 1.5 },
                    { type: "say", key: 'Am I a laboratory rat?', sayRawKey: true },
                ]
            },
            {
                type: "subsequence",
                sequence: [
                    { type: "goto", location: { x: 5, y: -60, z: 5 } },
                    { type: "playAnimation", animationId: "animation.killing_time.b" },
                    { type: "wait", ticks: 80 },
                    {
                        type: "subsequence",
                        sequence: [
                            { type: "say", key: 'Give me a code: 12343', sayRawKey: true },
                            { type: "expectChatMessage", mode: "includes", text: '12343', isMessed: "any" },
                            { type: "wait", seconds: 1 },
                            { type: "say", key: 'Thanks', sayRawKey: true },
                        ]
                    },
                ]
            },
            { type: "goto", location: { x: -5, y: -60, z: 5 } },
            { type: "goto", location: { x: -5, y: -60, z: -5 } },
            { type: "goto", location: { x: 5, y: -60, z: -5 } },
            { type: 'lightPost', name: 'finish' },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "playAnimation", animationId: "animation.killing_time.c" },
            // { type: 'transit', sequenceId: 'eve_test2' },
            {
                type: 'cycle',
                repeatTimes: 3,
                sequence: [
                    { type: "wait", seconds: 2 },
                    { type: "say", key: 'Hmmm...', sayRawKey: true },
                ]
            },
            { type: 'jumpToLightPost', name: 'start' },
            { type: "say", key: 'That\'s all', sayRawKey: true }
        ]
    },

    eve_test2: {
        head: {
            baitBlockId: 'arx:bait_eve',
            canBeAppliedOn: ['arx:eve']
        },
        body: [
            { type: "say", key: 'I\'ve started eve_test2', sayRawKey: true },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "say", messageType: 'action', key: "Yawn", sayRawKey: true },
            { type: 'wait', seconds: 1 },
            { type: "say", key: "Mmmmh... I'm tired", sayRawKey: true },
        ]
    }
}

/** @typedef {Number[]} SequenceStep */
/** @typedef {SequenceStep[]} StepHub */

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
        this.lightPostMap = sequence.head.lightPostMap

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
        if (!this.#isStep(step)) {
            console.warn(`Incorrect step recieved in #getStepObj for ${this.id}: ${step}`)
            return null
        }

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
            if (!NPCSequence.isElementAnySubsequence(thisSequenceElement)) {
                console.warn('Subsequence expected but not exists')
                return null
            }

            // Dive deeper. Make a currentSequence a deeper subsequence
            currentSequence = currentSequence[sequenceElementIndex].sequence
        }
        return null
    }

    /**
     * Check, is a value looks like a SequenceStap
     * @param {any} step 
     * @returns {Boolean}
     */
    #isStep(step) {
        if (!Array.isArray(step)) return false
        return step.every(item => typeof item === 'number')
    }

    /**
     * Returns a step that is parent to a given one
     * @param {SequenceStep} step 
     * @returns {SequenceStep | null}
     */
    #getParentStep(step) {
        if (!this.#isStep(step)) {
            console.warn('getParentStep: invalid step provided')
            return null
        }
        if (step.length > 1) { // Not root
            return step.slice(0, -1)
        } else { // Root
            return null
        }
    }

    /**
     * Returns a next step
     * Returns true if a sequence is completed
     * Returns false if something unexpected occured
     * Not intended to run "just to check". It changes saved data
     * @returns {SequenceStep | Boolean}
     */
    #fetchNextStep(step) {

        if (!this.#doStepExists(step)) {
            console.warn('fetchNextStep: Step is invalid')
            return false
        }

        let resultStep = [...step]

        // === If no next step on this sequence: Exit sequence/subsequence  ===
        // Check for multiple endings (Maybe we have to exit 2 depth levels simultaneously, who knows.)
        while (true) {

            const nextStepOnTheSameLevel = [...resultStep]
            nextStepOnTheSameLevel[nextStepOnTheSameLevel.length - 1] += 1

            // No further step in this sequence
            if (!this.#doStepExists(nextStepOnTheSameLevel)) {

                // The root sequence is completed
                if (resultStep.length <= 1) return true

                // Are we in a cycle?
                const parentStep = this.#getParentStep(resultStep)
                const parentElement = this.#getStepObj(parentStep)
                if (parentElement.type === 'cycle') {

                    if (parentElement.repeatTimes) {
                        const repeatsDone = this.#getCycleCounter(parentStep)
                        if (repeatsDone < parentElement.repeatTimes - 1) {
                            this.#setCycleCounter(parentStep, repeatsDone + 1)
                            return [...parentStep, 0] // Repeat
                        }
                    } else { // Snap to a start of a cycle instantly
                        return [...parentStep, 0]
                    }
                }

                // Exit subsequence
                resultStep = resultStep.slice(0, -1)
            } else { break }
        }

        // === Same-level transition ===
        const thisSequenceElement = this.#getStepObj(resultStep)
        // Check
        if (!thisSequenceElement) {
            console.warn('NPCSequence.#fetchNextStep(): Unexpected error occured')
            return false
        }
        // Transit further
        resultStep[resultStep.length - 1] += 1

        // === Enter sequence ===
        // Also check for multiple entrances, maybe we have to go 2 or 3 levels up
        while (true) {
            const element = this.#getStepObj(resultStep)
            if (!NPCSequence.isElementAnySubsequence(element)) break
            if (element.type === "cycle") this.#setCycleCounter(resultStep, 0)
            resultStep.push(0)
        }

        return resultStep
    }

    /**
     * Get a current value of a cycle counter for a step
     * @param {String} seqId 
     * @param {SequenceStep} step - Step of a cycle element
     * @returns {number}
     */
    #getCycleCounter(step) {
        const element = this.#getStepObj(step)
        if (element.type !== "cycle") {
            throw new Error('Trying to get a cycle counter of not-cycle sequence')
        }
        const dp = this.#getCycleCounterDp(step)
        return this.entity.gDP(dp) || 0
    }
    #setCycleCounter(step, value) {
        if (typeof value !== 'number') {
            throw new Error('Trying to set a not-number value to a cycle counter')
        }
        const element = this.#getStepObj(step)
        if (element.type !== "cycle") {
            throw new Error('Trying to set a cycle counter of not-cycle sequence')
        }
        const dp = this.#getCycleCounterDp(step)
        this.entity.sDP(dp, value)
    }
    #getCycleCounterDp(step) {
        return dPPrefix + 'cycleCounter:' + this.id + ':' + step.toString()
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
    static isElementAnySubsequence(seq) {
        try {
            const subsequenceTypes = ['subsequence', 'cycle', 'merge']
            if (subsequenceTypes.includes(seq.type)) return true
        }
        catch { }
        return false
    }

    /** @typedef {'finishThread' | 'success' | 'fail' | Record<any, any>} SequenceElementResponce */
    /** @typedef {'doNotClearSequenceData' | undefined} SequenceResponce */

    /**
     * Runs a single thread and waits for it's end
     * Can create new threads
     * @param {SequenceStep} step 
     */
    async #runThread(e, step) {
        // Check step
        if (!this.#doStepExists(step)) {
            console.warn(`NPCSequence.runThread(): Unexistent step ${step} has gotten from an entity. A thread was killed`)
            return 'fail'
        }

        NPCManager.StepHub.addStep(e, step)

        while (true) {
            let newStep

            // Check, if an entity is valid
            if (!e || !e.isValid) {
                console.warn('Entity is invalid or is not loaded, stopping sequence')
                NPCManager.removeEntity(e)
                NPCManager.unregisterChatListener(e)
                return 'doNotClearSequenceData'
            }
            // Check, if an entity is in an unloaded chunk
            if (!e.dimension.isChunkLoaded(e.location)) {
                NPCManager.Freeze.freeze(e)
                return 'doNotClearSequenceData'
            }
            // Check, if the entity is in loading list
            if (!NPCManager.isEntityProcessing(e)) {
                console.warn(`Sequence ${this.id} step ${step} started, but the entity is not in the active Entities list.`)
                return 'doNotClearSequenceData'
            }
            // Run
            /** @type {SequenceElementResponce} */
            const responce = await this.#runStep(step)

            // Responce
            if (responce === 'fail') console.warn(`A sequence ${this.id} element on step ${step} has reported a failure`)
            if (responce === 'finishThread') {
                NPCManager.StepHub.removeStep(e, step)
                break
            }
            if (typeof responce === 'object' && responce.forceNextStep) {
                if (!this.#doStepExists(responce.forceNextStep)) console.warn(`Forced a non-existent step ${responce.forceNextStep}`)
                newStep = responce.forceNextStep
            }
            else {
                const nextStepOnTheSameLevel = [...step]
                nextStepOnTheSameLevel[nextStepOnTheSameLevel.length - 1] += 1

                if (!this.#doStepExists(nextStepOnTheSameLevel)) return 'success' // End of a level sequence
                newStep = nextStepOnTheSameLevel
            }

            // Save new step
            NPCManager.StepHub.replaceStepWith(e, step, newStep)

            // Assign step to run a new cycle iteration
            step = newStep
        }
    }

    /**
     * === The main function of this class ===
     * Runs a sequence from a last-saved ?? 0 step
     * @returns {SequenceResponce}
     */
    async run() {
        const e = this.entity
        const stepHub = NPCManager.StepHub.getNumberOfSteps(e) > 0 ? NPCManager.StepHub.load(e) : NPCManager.StepHub.setToStart(e)

        // == Threads processing ===
        for (const step of stepHub) {
            await this.#runThread(e, step)
        }

        // Finished
        NPCManager.clearSequence(e)
    }

    /**
     * Execute single sequence step and wait for it to end
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
            return 'fail'
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
                        return 'fail'
                    }
                    b.setType(this.baitBlockId)

                    let secondsElapsed = 0
                    const intervalId = system.runInterval(() => {
                        if (!e.isValid) {
                            system.clearRun(intervalId)
                            reject('Entity is not valid')
                            return 'fail'
                        }
                        if (secondsElapsed > defaultTimeout) {
                            system.clearRun(intervalId)
                            if (b) b.setType('minecraft:air')
                            e.teleport(resolvedLocation) // Teleport entity to the desired location
                            resolve(true)
                            return 'success'
                        }
                        if (e.getTags().includes('bait_reached')) {
                            // console.warn(`Successfully reached the block`)
                            e.removeTag('bait_reached')
                            b.setType('air')
                            system.clearRun(intervalId)
                            resolve(true)
                            return 'success'
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
                return 'success'
                break

            case 'playAnimation':
                e.playAnimation(seqElement.animationId)
                return 'success'
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
                return 'success'
                break

            case 'say':
                if (!seqElement.key) console.warn('Trying to run Say element without key')
                if (seqElement.sayRawKey === true) { // Just a text message
                    new Chat.Message(e, seqElement.key, { type: seqElement.messageType }).send()
                } else { // Localization key message
                    new Chat.Message(e, seqElement.key, { type: seqElement.messageType, contentIsLocalizationKey: true }).send()
                }
                return 'success'
                break

            case 'setLocalName':
                e.sDP('localizationName', seqElement.localizationKey)
                break

            case 'transit':
                if (!(seqElement.sequenceId in sequences)) {
                    console.error(`Trying to transit to a non-existent sequence ${seqElement.sequenceId} from seq ${this.id}`)
                    return 'fail'
                }
                NPCManager.runSequence(this.entity, seqElement.sequenceId, { allowOverride: true })
                return 'finishThread'
                break

            case 'lightPost': // Do nothing
                return 'success'
                break

            case 'jumpToLightPost':
                const stepToJumpTo = this.lightPostMap.get(seqElement.name)
                if (!stepToJumpTo) {
                    console.warn(`Lightpost with name ${seqElement.name} do not exist on sequence ${this.id}`)
                    return 'fail'
                }
                return {
                    forceNextStep: stepToJumpTo
                }
                break

            // Subsequences
            case 'subsequence':
                const deeperStep = [...step, 0]
                if (seqElement.await) {
                    await this.#runThread(e, deeperStep)
                } else {
                    this.#runThread(e, deeperStep)
                }
                break

            case 'cycle':
                // I'll do it later
                break

            default:
                console.error(`Unexpected action in sequence ${this.id}: ${seqElement.type}`)
                return 'fail'
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
    static activeEntities = []
    /**
     * Add an entity to processing list
     * @param {Entity} e 
     */
    static addEntity(e) {
        if (this.isEntityProcessing(e)) {
            console.warn(`Can't add the entity to active entities: it is already added`)
            return false
        }
        else this.activeEntities.push(e.id)
    }
    /**
     * Remove Entites from processing list
     * @param {Entity} e 
     * @returns {Boolean} Was the entity in the list before?
     */
    static removeEntity(e) {
        if (this.isEntityProcessing(e)) {
            this.activeEntities = this.activeEntities.filter(id => id !== e.id)
            // console.warn('An entity was removed from active entities')
            return true
        }
        return false
    }
    /**
     * Is the entity listed in activeEntities?
     * @param {Entity} e 
     */
    static isEntityProcessing(e) { return this.activeEntities.includes(e.id) }

    // Any direct interactions with DPs are PROHIBITED! Use only functions below.
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
            NPCManager.setSequenceId(e, undefined)
            NPCManager.StepHub.reset(e)

            // Clear cycle data
            const cycleCounterPrefix = dPPrefix + 'cycleCounter'
            e.getDynamicPropertyIds().forEach(element => {
                if (element.startsWith(cycleCounterPrefix)) e.sDP(element, undefined)
            });
        }
        this.removeEntity(e)
        this.unregisterChatListener(e)
        return true
    }
    /** @param {Entity} e */
    static getSequenceId(e) { return e.gDP(dPPrefix + 'sequenceId') }
    /** @param {Entity} e */
    static hasSavedSequence(e) { return NPCManager.getSequenceId(e) !== undefined }
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
            let responce
            try {
                responce = await seq.run()
            } catch (error) {
                console.warn(`NPCManager - ${error.stack}${error}`)
            } finally {
                if (responce !== 'doNotClearSequenceData') {
                    NPCManager.clearSequence(e)
                }
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

    /**
     * Freezing an entity means removing it from active entities cuz it's not fully loaded. 
     * As an example, an entity can be loaded and valid, but a this entity's chunk is not loaded.
     * Then freezing will be applied
     */
    static Freeze = class {
        /**
         * Freeze an entity. It means that it stays in the world but is not completely loaded
         * @param {Entity} e 
         */
        static freeze(e) {
            console.warn(`Entity ${e.typeId} freezed`)
            NPCManager.removeEntity(e)
            NPCManager.unregisterChatListener(e)
            this.applyFreezeStatus(e)
        }
        static unfreeze(e) {
            console.warn(`Entity ${e.typeId} unfreezed`)
            NPCManager.restoreSequence(e)
            this.removeFreezeStatus(e)
        }
        /**
         * Apply freeze status. Only affects saved data
         * @param {Entity} e 
         */
        static applyFreezeStatus(e) {
            if (!this.getFreezeStatus(e)) {
                const currentEntities = world.gDP(this.freezedEntitiesDp, [])
                currentEntities.push(e.id)
                world.sDP(this.freezedEntitiesDp, currentEntities)
            }
        }
        /**
         * Remove freeze status. Only affects saved data
         * @param {Entity} e 
         */
        static removeFreezeStatus(e) {
            const currentEntities = world.gDP(this.freezedEntitiesDp, [])
            world.sDP(this.freezedEntitiesDp, currentEntities.filter(id => id !== e.id))
        }
        static getFreezeStatus(e) {
            return (world.gDP(this.freezedEntitiesDp, []).includes(e.id))
        }
        static freezedEntitiesDp = dPPrefix + 'freezedEntities'
    }

    /**
     * A hub that keeps all the active threads. Always saves to entity
     */
    static StepHub = class {
        /**
         * Get an index of the provided step in entity's stephub. If step is not in hub, return undefined
         * @param {Entity} e 
         * @param {SequenceStep} stepToCheck 
         * @returns {Number}
         */
        static #getIndexOfStep(e, stepToCheck) {

            const hub = this.load(e)
            if (!hub) return undefined

            for (let i = 0; i < hub.length; i++) {
                if (JSON.stringify(hub[i]) === JSON.stringify(stepToCheck)) return i
            }
            return undefined
        }
        /**
         * Replaces a step in a hub with a new one
         * @param {Entity} e 
         * @param {SequenceStep} stepToReplace 
         * @param {SequenceStep} stepToReplaceWith 
         * @returns {Boolean}
         */
        static replaceStepWith(e, stepToReplace, stepToReplaceWith) {
            const hub = this.load(e)
            const index = this.#getIndexOfStep(e, stepToReplace)
            if (index === undefined) {
                console.warn(`Trying to replace a step ${stepToReplace}, which is not yet saved.`)
                return false
            }
            hub[index] = stepToReplaceWith
            this.save(e, hub)
            return true
        }
        /**
         * Adds a new step to stepHub
         * @param {Entity} e 
         * @param {SequenceStep} step 
         */
        static addStep(e, step) {
            const hub = this.load(e)
            hub.push(step)
            this.save(e, hub)
        }
        /**
         * Removes given step.
         * If no step provided, clears all the stepHub
         * @param {Entity} e 
         * @param {SequenceStep} [step]
         */
        static removeStep(e, step) {
            const index = this.#getIndexOfStep(e, step)
            if (index === undefined) {
                console.warn(`Cannot remove a step ${step} that is not in the hub rn`)
                return
            }
            const hub = this.load(e)
            hub.splice(index, 1)
            this.save(e, hub)
        }
        /**
         * Clears stephub for an entity
         * @param {Entity} e 
         */
        static reset(e) {
            this.save(e, undefined)
        }
        /** 
         * @param {Entity} e
         * @returns {StepHub}
         */
        static load(e) { return e.gDP(dPPrefix + 'stepHub') }
        /** 
         * @param {Entity} e
         * @param {StepHub} stepHub
         */
        static save(e, stepHub) { return e.sDP(dPPrefix + 'stepHub', stepHub) }
        static getNumberOfSteps(e) {
            const hub = this.load(e)
            return Array.isArray(hub) ? hub.length : 0
        }
        /**
         * Set and return a new stephub
         * @param {Entity} e 
         * @returns {StepHub}
         */
        static setToStart(e) {
            const startHub = [[0]]
            this.save(e, startHub)
            return startHub
        }
    }
}

// An entity was loaded. Check for sequences
world.afterEvents.entityLoad.subscribe(async event => {
    const e = event.entity
    if (NPCManager.hasSavedSequence(e) && !NPCManager.isEntityProcessing(e)) {
        NPCManager.restoreSequence(e)
    }
})

// Entity death or unloading (Does not trigger if an entity just leaves a loaded chuck)
world.beforeEvents.entityRemove.subscribe(async event => {
    const e = event.removedEntity
    // console.warn(`Unloaded ${e.typeId}`)
    NPCManager.removeEntity(e)
    NPCManager.unregisterChatListener(e)

    // Remove freeze.
    NPCManager.Freeze.removeFreezeStatus(e)
})

// A code was initialized (fix sequence death on /reload)
system.run(() => {
    for (const d of world.getAllDimensions()) {
        for (const e of d.getEntities()) {
            if (NPCManager.hasSavedSequence(e) && !NPCManager.isEntityProcessing(e)) {
                NPCManager.restoreSequence(e)
            }
        }
    }
})

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
        seq.head.lightPostMap = createLightPostMap(seq)
    }
}
/** @typedef {Map<String, SequenceStep>} LightPostMap */
/**
 * @param {SequenceObject} sequenceObject 
 * @returns {LightPostMap}
 */
function createLightPostMap(sequenceObject) {
    /** @type {LightPostMap} */
    const map = new Map()

    /**
     * @param {SequenceArrayElement[]} seq 
     */
    function createFromSequence(seq, currentStep) {
        for (const [index, element] of seq.entries()) {
            const step = [...currentStep, index]

            if (element.type === 'lightPost') {
                if (!element.name) {
                    console.warn(`Lightpost on step ${step} has no name!`)
                    continue
                }
                map.set(element.name, step)
            }
            if (NPCSequence.isElementAnySubsequence(element)) {
                createFromSequence(element.sequence, step)
            }
        }
    }

    createFromSequence(sequenceObject.body, [])

    return map
}
checkSequences()