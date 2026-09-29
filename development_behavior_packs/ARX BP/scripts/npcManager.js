import { Entity, system, world } from "@minecraft/server"
import { sleep } from "./arxLib/time"
import { Vector } from "./arxLib/math"
import { Chat } from "./chat"
import { md5 } from "./arxLib/converters"
import { gDP, sDP } from "./arxLib/DPOperations"

/*====================================
Dynamic NPC Manager (DNPCM)
Manages Dynamic NPCs behaviour. 
One of the most complex arx systems.
====================================*/

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
 * @property {Boolean} [await=true] - Wait for the end of a subsequence
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

/** 
 * [] - this path points at the whole sequence body. It is the one and only root path.
 * [3] - this path points at third element at zero depth (starting from 0, not 1).
 * [2, 4, 1] - this path points at 2nd element of the main sequence, 4th in it, then 1st in it. 
 * @typedef {Number[]} PathArray 
 */
/** @typedef {PathArray[]} ThreadTable */

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
            // { type: 'jumpToLightPost', name: 'start' },
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
    },

    eve_simple: {
        head: {
            baitBlockId: 'arx:bait_eve',
            canBeAppliedOn: ['arx:eve']
        },
        body: [
            { type: "goto", location: { x: 5, y: -60, z: 5 } },
            { type: 'wait', seconds: 1 },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
        ]
    },
}

/**
 * @typedef {Object} ElementDeclaration
 * @property {function(Element): Promise<SequenceElementResponce>} run
 * @property {Boolean} [isContainer=false]
 * @property {'always' | 'never' | 'auto'} [isAsync='auto']
 */
/**
 * @type {Record<String, ElementDeclaration>}
 */
const elementsRegistry = {
    subsequence: {
        run: async (element) => {
            await new Thread(element.path).run()
        },
        isSubsequence: true,
    },
    goto: {
        run: async (element) => {
            const e = element.path.sequence.entity

            e.triggerEvent('arx:add_bait_sensor')
            const resolvedLocation = NPCManager.addOffset(e, element.object.location)
            await new Promise((resolve, reject) => {
                const b = e.dimension.getBlock(resolvedLocation)
                if (!b) {
                    console.warn(`Cannot create a block object while processing a sequence (id: ${NPCManager.getSequenceId(e)}, step ${step}). The entity was teleported to desired location instead of classic navigation`)
                    e.teleport(resolvedLocation)
                    resolve(true)
                    return 'fail'
                }
                b.setType(element.path.sequence.baitBlockId)

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
        }
    },
    wait: {
        run: async (element) => {
            const ticks = Math.round(element.object.ticks ?? element.object.seconds * 20)
            if (!ticks || typeof ticks !== 'number' || ticks < 0) {
                console.error(`NPCSequence: Wait element ${step} on seq ${element.path.sequence.id}: invalid (ticks | seconds) value provided`)
            } else {
                await sleep(ticks)
            }
            return 'success'
        }
    },
    playAnimation: {
        async run(element) {
            element.path.sequence.entity.playAnimation(element.object.animationId)
        }
    },
    expectChatMessage: {
        async run(element) {

            const seqElement = element.object
            const e = element.path.sequence.entity
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
        }
    },
    say: {
        async run(element) {
            const seqElement = element.object
            const e = element.path.sequence.entity

            if (!seqElement.key) console.warn('Trying to run Say element without key')
            if (seqElement.sayRawKey === true) { // Just a text message
                new Chat.Message(e, seqElement.key, { type: seqElement.messageType }).send()
            } else { // Localization key message
                new Chat.Message(e, seqElement.key, { type: seqElement.messageType, contentIsLocalizationKey: true }).send()
            }
            return 'success'
        }
    },
    setLocalName: {
        async run(element) {
            element.path.sequence.entity.sDP('localizationName', element.object.localizationKey)
        }
    },
    transit: {
        async run(element) {
            const seqElement = element.object
            const e = element.path.sequence.entity

            if (!(seqElement.sequenceId in sequences)) {
                console.error(`Trying to transit to a non-existent sequence ${seqElement.sequenceId} from seq ${element.path.sequence.id}`)
                return 'fail'
            }
            NPCManager.runSequence(e, seqElement.sequenceId, { allowOverride: true })
            return 'finishThread'
        }
    },
    lightPost: {
        async run() { } // Do nothing
    },
    jumpToLightPost: {
        async run(element) {
            const seqElement = element.object
            const stepToJumpTo = element.path.sequence.lightPostMap.get(seqElement.name)

            if (!stepToJumpTo) {
                console.warn(`Lightpost with name ${seqElement.name} do not exist on sequence ${element.path.sequence.id}`)
                return 'fail'
            }
            return {
                forceNextStep: stepToJumpTo
            }
        }
    },
    cycle: {
        async run(element) {
            // TO-DO
        },
        isContainer: true
    }
}

/**
 * A path in a sequence. 
 */
class Path {

    /**
     * @param {NPCSequence} seqInstance
     * @param {PathArray} pathArray
     */
    constructor(seqInstance, pathArray) {
        /** @type {PathArray} */
        this.pathArray = pathArray
        this.sequence = seqInstance
        this.isRoot = pathArray?.length === 0 // Path is an empty array
        this.depth = pathArray?.length // e.g. pathArray [8] === depth 1

        this.isValid = this.#isValid() ? true : false

        NPCManager.log(`Path ${pathArray} was initialised for sequence ${seqInstance.id}`)
    }

    /** @returns {Boolean} */
    #isValid() {
        let result = true
        if (!Array.isArray(this.pathArray)) result = false
        if (!this.#exists()) result = false

        return result
    }

    /**
     * Does this path exists in the sequence?
     * @returns {boolean}
     */
    #exists() {
        if (this.isRoot) return true

        for (const { path } of walkSequence(this.sequence.body)) {
            if (arePathArraysEqual(path, this.pathArray)) return true
        }
        return false
    }

    /** 
     * Is the element first on its level?
     * @returns {Boolean} 
     */
    isFirst() {
        return this.getHeader() === 0
    }

    /** 
     * Is the element last on its level?
     * @returns {Boolean}
     */
    isLast() {
        return this.getNextPathOnTheSameLevel() === null
    }

    /**
     * Get the top index for this path. For path [1, 9, 2, 42] it is 42
     * @returns {number}
     */
    getHeader() {
        return this.pathArray.at(-1)
    }

    /**
     * Get a parent path
     * @returns {Path | null}
     */
    getParentPath() {
        if (this.isRoot) return null
        return new Path(this.sequence, this.pathArray.toSpliced(-1, 1))
    }

    /**
     * Get a next path (e.g. current is [0, 1, 5], the next will be [0, 1, 6] if it exists. If not, null will be returned)
     * @returns {Path | null}
     */
    getNextPathOnTheSameLevel() {
        const newPath = new Path(this.sequence, this.pathArray.with(-1, this.getHeader() + 1))

        if (newPath.isValid) return newPath
        return null
    }

    /** @returns {Path | null} */
    getDeeperPath() {
        const allow = this.getElement().isSubsequence
        if (!allow) return null
        return new Path(this.sequence, [...this.pathArray, 0])
    }

    /**
     * Get an element at this path
     * @returns {Element}
     */
    getElement() {
        return new Element(this)
    }
}

/**
 * Single element of a sequence
 */
class Element {
    /**
     * @param {Path} path 
     */
    constructor(path) {
        // Check
        this.isValid = true
        if (!(path instanceof Path) || !path?.isValid) {
            console.warn(`Trying to create an Element with an invalid Path (Class = ${path?.constructor?.name}, path validness = ${path?.isValid} path?.pathArray = ${path?.pathArray})`)
            this.isValid = false
            return
        }

        this.path = path

        /** An object of a sequence at the specified path */
        this.object = this.#getObject()

        // Requires Object
        this.isSubsequence = this.#isSubsequence()

        NPCManager.log(`New Element got for Path ${path.pathArray}`)
    }

    /**
     * Returns new Element that is inside this one. 
     * If this one is not a container, return null
     * @returns {Element | null}
     */
    dive() {
        if (!this.isSubsequence) return null
        return new Element(this.path.getDeeperPath())
    }

    #isSubsequence() {
        if (!this.object) return false
        const subsequenceTypes = ['subsequence', 'cycle', 'merge']
        return subsequenceTypes.includes(this.object.type)
    }

    /**
     * Get SequenceArrayElement
     * @returns {SequenceArrayElement | null}
     */
    #getObject() {
        let resultObject = null

        // If we're getting a root object. It's also sorta container
        if (this.path.isRoot) {
            resultObject = {
                type: 'subsequence',
                sequence: this.path.sequence.body
            }
        }

        // Walk sequence
        else {
            for (const { path, element } of walkSequence(this.path.sequence.body)) {
                if (arePathArraysEqual(path, this.path.pathArray)) {
                    resultObject = element
                    break
                }
            }
        }

        if (this.#isObjectValid(resultObject)) {
            return resultObject
        } else {
            console.warn(`Object for Element in seq ${this.path.sequence.id}, path ${this.path.pathArray} is not valid`)
            this.isValid = false
            return null
        }
    }

    /**
     * Is Element's object valid?
     * @param {SequenceArrayElement} sequenceObject 
     * @returns {boolean}
     */
    #isObjectValid(sequenceObject) {
        return (typeof sequenceObject === 'object' && sequenceObject.type in elementsRegistry)
    }

    /**
     * Execute the element and wait for its end
     */
    async execute() {
        /** @type {SequenceElementResponce} */
        let response = 'fail'
        try {
            response = await elementsRegistry[this.object.type].run(this)
        }
        catch (error) {
            console.error(`Cannot execute an element at path ${this.path.pathArray}, sequence ${this.path.sequence}, type ${this.object.type}: \n${error}${error.stack}`)
        }
        return response
    }
}

/**
 * A thread. 
 * Has only one step.
 * Creates from a NPC Sequence instance and path
 */
class Thread {

    /**
     * @param {Path} path
     */
    constructor(path) {
        this.isValid = true

        // Check
        {
            if (!path.isValid) {
                console.warn('Trying to create a thread instance with an invalid Path')
                this.isValid = false
                return
            }
        }

        // Initialize
        this.path = path
        this.isPending = false

        NPCManager.log(`A thread created for path <${path.isRoot ? 'Root' : path.pathArray}>, seq ${path.sequence.id}`)
    }


    // === Pending logic ===
    // Thread can be pended. It means, it waits for something. As example, a thread waits for it's child thread to end. 
    // Using of Promise system to await child thread isn't reliable: it will break on world reload.
    static pendingThreads = new Map()

    pend() {
        this.isPending = true
        Thread.pendingThreads.set(this.path, this)
        NPCManager.log(`A thread was pended for path ${path.pathArray}, seq ${NPCSequenceInstance.id}`)
    }

    unpend() {
        this.isPending = false
        Thread.pendingThreads.delete(this.path)
        NPCManager.log(`A thread was unpended for path ${path.pathArray}, seq ${NPCSequenceInstance.id}`)
    }

    /**
     * Run the thread and wait for its end
     * @param {number} [fromStep=0]
     * @returns {Promise<ThreadResponce>}
     */
    async run(fromStep = 0) {
        NPCManager.log(`A thread RUNNED for sequence ${this.path.sequence.id}, path ${this.path.pathArray}, from step ${fromStep}`)
        const e = this.path.sequence.entity

        // Thread is not valid
        if (!this.isValid) {
            console.warn(`Cannot RUN an invalid thread`)
            return
        }

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
            console.warn(`Thread ${this.path.sequence.id} on path ${this.path.pathArray} started, but the entity is not in the active Entities list.`)
            return 'doNotClearSequenceData'
        }

        /** @type {Path} */
        let pathToElement = new Path(this.path.sequence, [...this.path.pathArray, fromStep])
        /** @type {Element} */
        let element
        /** @type {SequenceElementResponce} */
        let response

        this.path.sequence.threadTable.addPath(pathToElement.pathArray)

        while (true) {
            // Get element
            element = new Element(pathToElement)

            // Run element
            response = await element.execute()

            // Process responce
            if (response === 'fail') console.warn(`An sequence ${this.path.sequence.id} element on path ${pathToElement.pathArray} has reported a failure`)
            else if (response === 'finishThread') {
                NPCManager.log(`Thread ${this.path.pathArray} of sequence ${this.path.sequence.id} FINISHED by flag "finishThread"`)
                this.path.sequence.threadTable.removePath(pathToElement.pathArray)
                return 'success'
            }

            if (pathToElement.isLast()) { // Last element
                NPCManager.log(`Thread ${this.path.pathArray} of sequence ${this.path.sequence.id} FINISHED by last element`)
                this.path.sequence.threadTable.removePath(pathToElement.pathArray)
                return 'success'
            } else { // Not last
                const nextPath = pathToElement.getNextPathOnTheSameLevel()
                this.path.sequence.threadTable.replacePathWith(pathToElement.pathArray, nextPath.pathArray)
                pathToElement = nextPath
            }
        }
    }
}

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
        this.threadTable = NPCManager.ThreadTable.get(entity)

        this.body = sequence.body

        NPCManager.log(`New NPCSequence ${this.id} initialized on Entity ${entity.typeId}`)
    }

    /** @typedef {'finishThread' | 'success' | 'fail' | Record<any, any>} SequenceElementResponce */

    /** @typedef {Record<PathArray, ThreadResponceData>} ThreadResponce */
    /**
     * @typedef {Object} ThreadResponceData
     * @property {'success' | 'fail'} status
     * @property {Boolean} [clearSequenceData=true]
     */

    /**
     * === The main function of this class ===
     * Runs a sequence from a last-saved ?? start step(s)
     */
    async start() {
        const e = this.entity
        const threadTable = NPCManager.ThreadTable.get(e)

        // == Threads launch ===
        await Promise.all(
            threadTable.hub.map(path => new Thread(new Path(this, path).getParentPath()).run(path.at(-1)))
        )

        // Finished
        NPCManager.clearSequence(e)
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
    static assingSequenceId(e, id) { return e.sDP(dPPrefix + 'sequenceId', id) }
    /** 
     * Clears entity's sequence and all sequence-related data
     * @param {Entity} e 
     * @returns {boolean} - Did an entity have any sequence?
     */
    static clearSequence(e) {
        let hasCurrentSeq
        if (e && e.isValid) {
            NPCManager.assingSequenceId(e, undefined)
            // Current seq
            hasCurrentSeq = !!this.getSequenceId(e)

            NPCManager.ThreadTable.get(e).reset()

            // Clear cycle data
            const cycleCounterPrefix = dPPrefix + 'cycleCounter'
            e.getDynamicPropertyIds().forEach(element => {
                if (element.startsWith(cycleCounterPrefix)) e.sDP(element, undefined)
            });
        }
        this.removeEntity(e)
        this.unregisterChatListener(e)
        return hasCurrentSeq
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
     * @property {'auto' | 'clear'} [mode] - auto - start a sequence from last-saved step, clear - start from the beginning
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
        this.assingSequenceId(e, seqId)
        // Get sequence instance
        const seq = this.getSequence(e)
        // Entity filter check
        if (seq.canBeAppliedOn && !seq.canBeAppliedOn.includes(e.typeId)) {
            console.warn('Trying to apply a sequence to an inappropriate entity')
            return
        }
        NPCManager.log(`Sequence ${seq.id} was started`)
        if (seq) {
            this.addEntity(e)
            let responce
            try {
                responce = await seq.start()
            } catch (error) {
                console.error(`NPCManager - ${error.stack}${error}`)
            } finally {
                if (responce !== 'doNotClearSequenceData') {
                    NPCManager.clearSequence(e)
                }
            }
        }
        else console.error(`Cannot start sequence: Unexpected error occured`)
        NPCManager.log(`Sequence ${seq.id} finished`)
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
            NPCManager.log(`Entity ${e.typeId} freezed`)
            NPCManager.removeEntity(e)
            NPCManager.unregisterChatListener(e)
            this.applyFreezeStatus(e)
        }
        static unfreeze(e) {
            NPCManager.log(`Entity ${e.typeId} unfreezed`)
            NPCManager.restoreSequence(e)
            this.removeFreezeStatus(e)
        }
        /**
         * Apply freeze status. Only affects saved data
         * @param {Entity} e 
         */
        static applyFreezeStatus(e) {
            NPCManager.log(`Called applyFreezeStatus on ` + e.typeId)
            if (!this.getFreezeStatus(e)) {
                NPCManager.log(`Applied freeze on ` + e.typeId + ': it wasn\'t freesed')
                const currentEntities = world.gDP(this.freezedEntitiesDp, [])
                currentEntities.push(e.id)
                world.sDP(this.freezedEntitiesDp, currentEntities)
            } else {
                NPCManager.log('Freeze is already applied on ' + e.typeId)
            }
        }
        /**
         * Remove freeze status. Only affects saved data
         * @param {Entity} e 
         */
        static removeFreezeStatus(e) {
            NPCManager.log(`Called removeFreezeStatus on ` + e.typeId)
            const currentEntities = world.gDP(this.freezedEntitiesDp, [])
            world.sDP(this.freezedEntitiesDp, currentEntities.filter(id => id !== e.id))
        }
        static getFreezeStatus(e) {
            NPCManager.log(`Got freeze status for ` + e.typeId)
            return (world.gDP(this.freezedEntitiesDp, []).includes(e.id))
        }
        static freezedEntitiesDp = dPPrefix + 'freezedEntities'
    }

    /**
     * A hub that keeps all the active threads. Saves to entity
     */
    static ThreadTable = class {

        /** @returns {ThreadTable} */
        static getNewThreadTable() {
            return [[0]]
        }

        static #map = new WeakMap()

        /**
         * Get a threadTable for an entity
         * @param {Entity} e 
         * @returns {InstanceType<NPCManager.ThreadTable>}
         */
        static get(e) {
            return this.#map.get(e) || this.#map.set(e, new NPCManager.ThreadTable(e)).get(e)
        }

        /** 
         * Load a threadTable from entity's DP
         * @returns {ThreadTable}
         */
        #load() {
            return this.e.gDP(dPPrefix + 'threadTable')
        }

        /** 
         * Save a threadTable to entity's DP
         * Executes automatically in threadTable's function after changing threadTable
         * @param {ThreadTable} threadTable
         */
        #save() {
            this.e.sDP(dPPrefix + 'threadTable', this.hub)
            return this
        }

        /** @param {Entity} e */
        constructor(e) {
            /** @type {Entity} */
            this.e = e
            /** @type {ThreadTable} */
            this.hub = this.#load() || NPCManager.ThreadTable.getNewThreadTable()
        }

        /**
         * Get an index of the provided path in entity's Threadtable. If path is not in hub, return undefined
         * @param {PathArray} pathArrayToCheck 
         * @returns {number | undefined}
         */
        #getIndexOfPath(pathArrayToCheck) {
            for (let i = 0; i < this.hub.length; i++) {
                if (arePathArraysEqual(this.hub[i], pathArrayToCheck)) return i
            }
            return undefined
        }

        /**
         * Replaces a step in a hub with a new one
         * @param {PathArray} stepToReplace 
         * @param {PathArray} stepToReplaceWith 
         * @returns {Boolean}
         */
        replacePathWith(stepToReplace, stepToReplaceWith) {
            const index = this.#getIndexOfPath(stepToReplace)
            if (index === undefined) {
                console.warn(`Trying to replace a step ${stepToReplace}, which is not yet saved to threadTable.`)
                return false
            }
            this.hub[index] = stepToReplaceWith
            this.#save()
            return true
        }

        /**
         * Adds a new step to threadTable
         * @param {PathArray} step 
         */
        addPath(step) {
            if (this.#getIndexOfPath(step) !== undefined) {
                // console.warn(`Trying to add to a hub a step that is already in hub - aborted.`)
                return this
            }
            this.hub.push(step)
            this.#save()
            return this
        }

        /**
         * Removes given step.
         * If no step provided, clears all the threadTable
         * @param {PathArray} [step]
         */
        removePath(step) {
            const index = this.#getIndexOfPath(step)
            if (index === undefined) {
                console.warn(`Cannot remove a step ${step} that is not in the hub rn`)
                return
            }
            this.hub.splice(index, 1)
            this.#save()
        }

        /**
         * Clears stephub for an entity
         */
        reset() {
            this.hub = NPCManager.ThreadTable.getNewThreadTable()
            this.#save()
        }

        /**
         * Get a number of currently saved steps
         * @returns {Number}
         */
        getNumberOfPaths() {
            return this.hub.length
        }
    }

    /**
     * Send a message to log
     * @param {string} msg 
     */
    static log(msg) {
        const NPCManagerLogPrefix = `[§wNPCManager§f]: `

        if (gDP(world, 'enableDNPCMLog')) console.log(NPCManagerLogPrefix + msg)
    }
}

// An entity was loaded. Check for sequences
world.afterEvents.entityLoad.subscribe(async event => {
    const e = event.entity
    if (NPCManager.hasSavedSequence(e) && !NPCManager.isEntityProcessing(e)) {
        NPCManager.log(`An entity ${e.typeId} was loaded and it\'s sequence was restored`)
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

    NPCManager.log(`Entity ${e.typeId} was removed, all DNPCM data was unregistered`)
})

// A code was initialized (fix sequence death on /reload)
system.run(() => {
    for (const d of world.getAllDimensions()) {
        for (const e of d.getEntities()) {
            if (NPCManager.hasSavedSequence(e) && !NPCManager.isEntityProcessing(e)) {
                NPCManager.restoreSequence(e)

                NPCManager.log(`Entity ${e.typeId} was restored, apparently after /reload command`)
            }
        }
    }
})

/**
 * Checks, are the sequences OK.
 * Also adds some data to sequences
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
/** @typedef {Map<String, PathArray>} LightPostMap */
/**
 * @param {SequenceObject} sequenceObject 
 * @returns {LightPostMap}
 */
function createLightPostMap(sequenceObject) {
    /** @type {LightPostMap} */
    const map = new Map()

    for (const { path, element } of walkSequence(sequenceObject.body)) {
        if (element.type === 'lightPost' && element.name) {
            map.set(element.name, path);
        }
    }


    return map
}
checkSequences()

/**
 * Walk the sequence
 * @param {SequenceArrayElement[]} body - the sequence body
 * @param {PathArray} currentPath - for recursive calls. Never define this argument.
 * @yields {{path: PathArray, element: SequenceArrayElement }}
 */
function* walkSequence(body, currentPath = []) {
    for (let i = 0; i < body.length; i++) {
        const element = body[i]
        const path = [...currentPath, i]

        yield { path, element }

        if (element.sequence && Array.isArray(element.sequence)) {
            yield* walkSequence(element.sequence, path)
        }
    }
}

/**
 * Are the pathArrays equal?
 * @param {PathArray} pathArray1 
 * @param {PathArray} pathArray2 
 * @returns {boolean}
 */
function arePathArraysEqual(pathArray1, pathArray2) {
    return (pathArray1.length === pathArray2.length && pathArray1.every((val, i) => val === pathArray2[i]))
}