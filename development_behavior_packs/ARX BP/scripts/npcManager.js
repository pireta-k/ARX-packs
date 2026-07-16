import { Entity, system, world } from "@minecraft/server"
import { sleep } from "./arxLib/time"

const defaultTimeout = 1000 // Ticks

/** A head of a sequence
 * @typedef SequenceHead
 * @property {String} id
 * @property {Boolean} fix_y_axis
 * @property {String} initialDimensionId
 */

/** An element of a sequence body
 * @typedef {SequenceArrayElementGoTo | SequenceArrayElementWait | SequenceArrayElementPlayAnimation} SequenceArrayElement
 */

/** Goto
 * @typedef SequenceArrayElementGoTo
 * @property {"goto"} type
 * @property {import("@minecraft/server").Vector3} location
 */

/** Wait
 * @typedef SequenceArrayElementWait
 * @property {"wait"} type
 * @property {Number} ticks
 */

/** Animation
 * @typedef SequenceArrayElementPlayAnimation
 * @property {"playAnimation"} type
 * @property {String} animationId
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
            id: 'eve_test',
            fix_y_axis: true,
            baitBlockId: 'arx:bait_eve'
        },
        body: [
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "playAnimation", animationId: "animation.killing_time.a" },
            { type: "wait", ticks: 80 },
            { type: "goto", location: { x: 5, y: -60, z: 5 } },
            { type: "playAnimation", animationId: "animation.killing_time.b" },
            { type: "wait", ticks: 80 },
            { type: "goto", location: { x: -5, y: -60, z: 5 } },
            { type: "goto", location: { x: -5, y: -60, z: -5 } },
            { type: "goto", location: { x: 5, y: -60, z: -5 } },
            { type: "goto", location: { x: 0, y: -60, z: 0 } },
            { type: "playAnimation", animationId: "animation.killing_time.c" },
        ]
    }
}

// Edit entity prototype
function editPrototypes() {
    Entity.prototype.hasActiveSequence = function () { return (this.gDP('activeSequenceId') !== undefined) }

    Entity.prototype.getActiveSequenceStep = function () { return this.gDP('activeSequenceStep') }
    Entity.prototype.setActiveSequenceStep = function (step) { return this.sDP('activeSequenceStep', step) }

    Entity.prototype.clearActiveSequence = function () {
        this.sDP('activeSequenceId', undefined)
        this.sDP('activeSequenceStep', undefined)
    }


    Entity.prototype.getActiveSequenceId = function () { return this.gDP('activeSequenceId') }
    Entity.prototype.setActiveSequence = async function (id) {
        if (!id) {
            console.error(`Cannot launch a sequence, no id provided`)
            return
        }
        const hasSeq = this.hasActiveSequence()
        if (hasSeq) {
            console.error(`Trying to override existing sequence with ${id} on ${this.typeId}. Declined.`)
            return
        }
        this.sDP('activeSequenceId', id)
        this.sDP('activeSequenceStep', 0)
        // Run
        const seq = this.getActiveSequence()
        if (seq) await seq.run()
        else console.error(`Cannot start sequence: Unexpected error occured`)
    }
    Entity.prototype.getActiveSequence = function () {
        const id = this.getActiveSequenceId()
        if (id) {
            return new NPCSequence(sequences[id], this)
        }
        else return undefined
    }
}
editPrototypes()

/**
 * A class that represents an action sequence for an NPC
 */
export class NPCSequence {

    /** @param {SingleSequence} sequence; @param {Entity} entity  */
    constructor(sequence, entity) {
        // Check sequence
        if (typeof sequence !== 'object' || !sequence.head || !sequence.body || !entity) {
            console.error('Trying to initialize an incorrect sequnence')
            return
        }

        // Assign properties
        this.fix_y_axis = sequence.head.fix_y_axis
        this.id = sequence.head.id
        this.numOfSteps = sequence.body.length
        this.entity = entity
        this.baitBlockId = sequence.head.baitBlockId

        this.body = sequence.body
    }

    doStepExists(stepId) {
        return stepId < this.numOfSteps
    }


    async run() {
        let currentStep = this.entity.getActiveSequenceStep()
        if (!currentStep) currentStep = 0
        if (this.doStepExists(currentStep)) {
            await this.runStep(currentStep)
        }
    }

    /**
     * Execute sequence step and woit for it to end
     * @param {Number} step 
     */
    async runStep(stepId) {
        // console.warn(`Started step ${stepId} of sequence ${this.id}`)
        const e = this.entity

        // Step do not exist
        if (!this.doStepExists(stepId)) {
            console.error('Trying to run non-existent step')
            return
        }

        /** @type {SequenceArrayElement} */
        const step = this.body[stepId]
        switch (step.type) {
            case 'goto':
                e.triggerEvent('arx:add_bait_sensor')
                await new Promise((resolve, reject) => {
                    const b = e.dimension.getBlock(step.location)
                    b.setType(this.baitBlockId)

                    const intervalId = system.runInterval(() => {
                        if (!e.isValid) {
                            system.clearRun(intervalId)
                            reject('Entity is not valid')
                        }
                        else if (e.getTags().includes('bait_reached')) {
                            // console.warn(`Successfully reached the block`)
                            e.removeTag('bait_reached')
                            b.setType('air')
                            system.clearRun(intervalId)
                            resolve(true)
                        }
                    }, 2)
                })
                break

            case 'wait':
                await sleep(step.ticks)
                break

            case 'playAnimation':
                e.playAnimation(step.animationId)
                break

            default:
                console.error(`Unexpected action in sequence ${this.id} in step ${stepId}: ${step.type}`)
        }
        // Finalize step
        const nextStep = stepId + 1
        if (this.doStepExists(nextStep)) {
            // console.warn('Moving to a next step')
            e.setActiveSequenceStep(nextStep)
            this.run()
        }
        else {
            // console.warn('Finished')
            e.clearActiveSequence()
        }
    }
}

// An entity was loaded. Check for sequences
world.afterEvents.entityLoad.subscribe(event => {
    const e = event.entity
    if (e.hasActiveSequence()) {
        // Start event process
    }
})

world.beforeEvents.entityRemove.subscribe(event => {
    const e = event.removedEntity
    if (e.hasActiveSequence()) {
        // End event process
    }
})