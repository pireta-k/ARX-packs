import { gDP, ssDP } from "./DPOperations"

/** Shows the player quests screen
 * @param {Player} p 
 */
export function questsInfo(p) {
    
}

class Quest {
    constructor(p, id) {
        this.p = p
        this.id = id
        this.statusDP = `quest:${id}:sts`
        this.stageDP = `quest:${id}:stg`

        // Available statuses:
        // notYetFound || active || completed || failed
        this.status = gDP(p, this.statusDP) ?? 'notYetFound'

        this.stage = gDP(p, this.stageDP) ?? 0

        if (!(id in quests)) {
            console.error(`Trying to create a quest with wrong ID: ${id}`)
        }
    }

    // Internal 
    setStatus(status) {
        this.status = status
        ssDP(this.p, this.statusDP, status)
    }

    // Stages
    setStage(value) {
        ssDP(this.p, this.stageDP, value)
    }

    // Basic
    acquire() {
        this.setStatus('active')
    }
    complete() {
        this.setStatus('completed')
    }
    fail() {
        this.setStatus('failed')
    }

    // Dev
    reset() {
        this.setStatus('notYetFound')
    }
}

/* All the quests
=== STRUCTURE ===
questId: {
    stages: {
        min: Number,
        max: Number
    }
}
*/
const quests = {
    test: {
        
    }
}