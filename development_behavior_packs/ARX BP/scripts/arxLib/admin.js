import { world } from "@minecraft/server"
import { getScore } from "../arxLib/scoresOperations"

/**
 * Return true if the playes is admin. 
 * Admin means that the player has admin permission level
 * @param {Player} player 
 * @returns 
 */
export function isAdmin(player) {
    return player.playerPermissionLevel == 2
}

// Return all admins
export function getAdmins() {
    return world.getPlayers().filter(player => isAdmin(player))
}

// Return the hoster
export function getHoster() {
    let hosterArray = world.getPlayers().filter(player => getScore(player, 'verify') === 2)
    if (hosterArray.length !== 1) {
        console.log('Unexpected behaviour of getHoster(): No hosters or more then one hoster')
        return undefined
    }
    return hosterArray[0]
}