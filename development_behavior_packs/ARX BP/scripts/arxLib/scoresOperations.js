// Imports - Minecraft
import { world } from "@minecraft/server"

// Get the current score of the entity
export function getScore(entity, scoreId) {

    if (!entity) {
        console.warn(`Called getScore() for score <${scoreId}> without Entity obj`)
        return
    }
    if (!scoreId) {
        console.warn(`Called getScore() for entity <${entity.typeId}> without scoreId obj`)
        return
    }

    // Get the score obj
    const scoreObj = getScoreObjective(scoreId)
    // Get the score id of entity
    const scoreboardIdentity = entity.scoreboardIdentity
    // Check scoreboardIdentity
    if (!scoreboardIdentity) return undefined
    // Return
    return scoreObj.getScore(scoreboardIdentity)
}

// Set score to entity 
export function setScore(entity, scoreId, numToSet) {

    if (!entity) {
        console.warn(`Called setScore() for score <${scoreId}>, numToSet <${numToSet}> without Entity obj`)
        return
    }
    if (!scoreId) {
        console.warn(`Called setScore() for entity <${entity.typeId}>, numToSet <${numToSet}> without scoreId obj`)
        return
    }
    if (numToSet == null) {
        console.warn(`Called setScore() for score <${scoreId}>, entity <${entity.typeId}> without numToSet obj`)
        return
    }
    if (typeof numToSet !== 'number') {
        console.warn(`Called setScore() for entity <${entity.typeId}>, numToSet <${numToSet}> with type ${typeof numToSet}, that can be only <number>`)
        return
    }

    // Get the score obj
    const scoreObj = getScoreObjective(scoreId)
    // Get the score id of entity
    const scoreboardIdentity = entity.scoreboardIdentity
    // Set the value to score
    scoreObj.setScore(scoreboardIdentity, numToSet)
}

// Increase score
export function incScore(entity, scoreId, numToInc = 1) {
    if (!entity) {
        console.warn(`Called incScore() for score <${scoreId}>, numToInc <${numToInc}> without Entity obj`)
        return
    }
    if (!scoreId) {
        console.warn(`Called incScore() for entity <${entity.typeId}>, numToInc <${numToInc}> without scoreId obj`)
        return
    }
    if (typeof numToInc !== 'number') {
        console.warn(`Called incScore() for entity <${entity.typeId}>, numToInc <${numToInc}> with type ${typeof numToInc}, that can be only <number>`)
        return
    }

    // Get the current score value
    let currentScoreValue = getScore(entity, scoreId)
    // If it is undefined, set it to 0
    if (currentScoreValue === undefined) currentScoreValue = 0
    // Sum values
    const newScoreValue = currentScoreValue + numToInc
    // Set it
    setScore(entity, scoreId, newScoreValue)
    // Return new value
    return newScoreValue
}

// Get score objective
function getScoreObjective(scoreId) {
    // Get the object of the score
    let scoreObj = world.scoreboard.getObjective(scoreId)
    // If it don't exist, create it 
    if (!scoreObj) {
        scoreObj = world.scoreboard.addObjective(scoreId, scoreId)
    }
    return scoreObj
}