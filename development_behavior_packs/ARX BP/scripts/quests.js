import { gDP, ssDP } from "./DPOperations"
import { fl } from "./lang/fetchLocalization"
import { ActionFormData } from "@minecraft/server-ui"
import { world } from "@minecraft/server"



/* All the quests
=== STRUCTURE ===
questId: {
    stages: { // Inclusive
        min: Number,
        max: Number
    },
    isGlobal: bool // If true, the quest progress will be saved to the world obj. This quest progress is synced for all player
}
*/
const quests = {
    test: {
        stages: { min: 0, max: 1 }
    },
    find_a_diamond: {
        stages: { min: 0, max: 0 }
    },
}



/** Shows the player quests UI
 * @param {Player} p 
 */
export function questsInfo(p) {
    let form = new ActionFormData()
    let myQuests = {
        active: [],
        completed: [],
        failed: [],
    }
    for (const questId in quests) {
        const q = new Quest(p, questId)
        if (q.status === 'active') myQuests.active.push(questId)
        else if (q.status === 'completed') myQuests.completed.push(questId)
        else if (q.status === 'failed') myQuests.failed.push(questId)
    }

    let body = ''

    const questShelfs = ['active', 'completed', 'failed']

    // Construct output
    for (const shelf of questShelfs) {
        body += `${fl(p, 'quest.ui.' + shelf)}§f:`
        if (myQuests[shelf].length) {
            for (const singleQuest of myQuests[shelf]) {
                const insertion = quests[singleQuest].isGlobal ? '[§8Global§f]' : ''
                const quest = new Quest(p, singleQuest)
                const questText = '\n§r§f' + insertion + fl(p, 'quest.' + singleQuest + '.name')
                // With details
                if (shelf === 'active') body += questText + ': §8' + fl(p, 'quest.' + singleQuest + '.' + String(quest.stage))
                // Without details
                else body += questText
            }
        } else {
            body += '\n§8§o' + fl(p, `quest.ui.no_${shelf}_quests`) + '§r'
        }
        body += '\n\n'
    }

    form.title(fl(p, 'quest.ui.title'))
    form.body(body).show(p)
}

export class Quest {
    constructor(p, id) {
        if (!(id in quests)) {
            console.error(`Trying to create a quest with wrong ID: ${id}`)
        }

        this.p = p
        this.id = id
        this.statusDP = `quest:${id}:sts`
        this.stageDP = `quest:${id}:stg`
        this.data = quests[id]
        this.dpObj = this.data.isGlobal ? world : p
        this.nameLang = fl(p, 'quest.' + id + '.name')

        // Available statuses:
        // notYetFound || active || completed || failed
        this.status = gDP(this.dpObj, this.statusDP) ?? 'notYetFound'

        this.stage = gDP(this.dpObj, this.stageDP) ?? 0
    }

    // Internal 
    setStatus(status) {
        this.status = status
        ssDP(this.dpObj, this.statusDP, status)
    }
    checkStage(stage) {
        const { min, max } = this.data.stages || { min: 0, max: 0 }
        return (stage >= min && stage <= max)
    }

    // Stages
    setStage(stage) {
        if (this.checkStage(stage)) {
            ssDP(this.dpObj, this.stageDP, stage)
        } else console.error(`Trying to set stage ${stage} to quest ${this.id}, which is beyond allowed borders`)
    }
    incStage(valueToIncrease = 1) {
        const currentStage = gDP(this.dpObj, this.stageDP) ?? 0
        const newStage = currentStage + valueToIncrease
        if (this.checkStage(newStage)) {
            this.setStage(newStage)
        } else console.error(`Trying to inc stage ${currentStage} of quest ${this.id} to ${newStage}, which is beyond allowed borders`)
    }

    // Basic
    acquire(forceStage = 0) {
        if (this.status === 'notYetFound') {
            this.setStatus('active')
            this.setStage(forceStage)
            this.p.sendMessage(`§a${fl(this.p, 'quest.acquire')}§f: ${this.nameLang}!`)
            this.p.sendMessage(fl(this.p, 'quest.' + this.id + '.' + String(this.stage)))
        } else console.warn(`Cannot acquire a quest ${this.id}, it is already active`)
    }
    complete() {
        if (this.status === 'active') {
            this.setStatus('completed')
            this.p.sendMessage(`§d${fl(this.p, 'quest.complete')}§f: ${this.nameLang}!`)
        } else console.warn(`Cannot complete a quest ${this.id} because it is not active`)
    }
    fail() {
        if (this.status === 'active') {
            this.setStatus('failed')
            this.p.sendMessage(`§c${fl(this.p, 'quest.fail')}§f: ${this.nameLang}`)
        } else console.warn(`Cannot fail a quest ${this.id} because it is not active`)
    }

    // Dev
    reset() {
        this.setStatus('notYetFound')
        this.setStage(0)
        this.p.sendMessage(`Quest ${this.id} was resetted`)
    }
}