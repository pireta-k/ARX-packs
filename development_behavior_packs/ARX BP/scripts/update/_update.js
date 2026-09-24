// Arx pack updates — version migrations and first-time world setup

import { Player, system, world } from "@minecraft/server";
import { isArxVersionValid, VERSION } from "../_main"
import { gDP, sDP } from "../arxLib/DPOperations"
import { updateRegistry } from "./updateRegistry";
import { MessageFormData } from "@minecraft/server-ui";
import { fl } from "../lang/fetchLocalization";

export const ZEROVERSION = [0, 0, 0]

/** @typedef { 'newer' | 'older' | 'equal' | undefined } VersionComparsionResponce */

/**
 * Compares two versions
 * @param {import("../_main").ArxVersion} versionA
 * @param {import("../_main").ArxVersion} versionB
 * @returns {VersionComparsionResponce}
 */
function compareVersions(versionA, versionB) {
    if (!isArxVersionValid(versionA)) return undefined
    if (!isArxVersionValid(versionB)) return undefined

    for (let i = 0; i < 3; i++) {
        if (versionA[i] < versionB[i]) return 'older' // Version A is older than version B
        if (versionA[i] > versionB[i]) return 'newer'
    }

    return 'equal'
}

/**
 * Is Arx update finished?
 * @returns {boolean}
 */
export function isArxWorldReady() {
    return ['equal', 'newer'].includes(compareVersions(gDP(world, 'latestV', ZEROVERSION), VERSION))
}

/**
 * === Main Update function ===
 * It searches for updates and implements them
 */
async function update() {
    let installedVersion = gDP(world, 'latestV')
    // Check current version
    if (installedVersion === undefined || !isArxVersionValid(installedVersion)) {
        sDP(world, 'latestV', ZEROVERSION)
        installedVersion = ZEROVERSION
    }
    const comparsionResult = compareVersions(installedVersion, VERSION)

    // Pack version unchanged
    if (comparsionResult === 'equal') return

    // Pack version is older
    else if (comparsionResult === 'newer') {
        console.warn(`Looks like Arx packs were downgraded (${installedVersion} -> ${VERSION}). Doing nothing.`)
    }

    // Pack version is newer (UPDATE!!!)
    else if (comparsionResult === 'older') {

        const elementsToApply = updateRegistry.filter(elem => compareVersions(elem.version, installedVersion) === 'newer')
        if (elementsToApply.length === 0) {
            console.log('No element to apply in this update')
        }
        else {
            // Implement updates
            for (const element of elementsToApply) {
                try {
                    await element.do()
                } catch (error) {
                    console.error(`[§cUpdate system§f]: Cannot install an update for an element for version ${element.version}. \nError: ${error.stack}${error}`)
                    console.warn(`A §ccritical§f error occured during current Arx update. Try re-entering the world or message Arx developers (you can find contacts in menu -> devs)`)
                    return // Immediately stop
                }
                sDP(world, 'latestV', element.version)
            }
            console.warn(`This world was §asucessfully§f updated for Arx Ultima ${VERSION} o§8(installed ${elementsToApply.length} updates)`)
        }
        // After an update was finished, set world version to Arx pack version
        sDP(world, 'latestV', VERSION)
    }

    // Error in comparsion
    else {
        console.error(`An unknown error occured while checking for updates. Versions: installedVersion = ${installedVersion}, VERSION = ${VERSION}`)
        return
    }
}

// Run
world.afterEvents.worldLoad.subscribe(async () => {
    // Check, should we start Arx
    const version = gDP(world, 'latestV')

    // Thirst arx load
    if (version === undefined) {
        await waitForPlayers()

        const players = world.getPlayers()
        const playedThisWorldTicks = world.getAbsoluteTime()

        console.log('Version: ' + version + ', AllPlayers = ' + players.length + ', playedThisWorldTicks = ' + playedThisWorldTicks)

        if (playedThisWorldTicks > 3600) { // More then 3 minutes
            playedWorldNotification(players[0])
        }
        else {
            console.log('Arx updating was started automatically, playedThisWorldTicks looks OK')
            update()
        }
    }
    else {
        console.log('Arx updating was started automatically, arx version is not undefined')
        update()
    }
})

/**
 * Show a player a window, that suggests them to remove Arx pack from a played world
 * @param {Player} p 
 */
function playedWorldNotification(p) {
    let f = new MessageFormData().title(fl(p, 'update.played_world_form.title'))

    f.body(fl(p, 'update.played_world_form.body'))

    f.button1(fl(p, 'update.played_world_form.continue'))
    f.button2(fl(p, 'update.played_world_form.decline'))
    f.show(p).then(data => {
        //If the form was not shown
        if (data.cancelationReason == "UserBusy") {
            //Canceling a function and trying to display the form again
            return system.runTimeout(() => {
                playedWorldNotification(p)
            }, 10)
        }
        //Code if the form was shown
        if (data.selection === 0) {
            console.log('Arx updating was started by a form')
            update()
        } else {
            console.log('Arx updating was cancelled by a form')
            p.sendMessage(fl(p, 'update.played_world_form.cancelled'))
        }
    })
}

/**
 * Makes Arx to wait for at least one player to enter
 */
async function waitForPlayers() {
    return new Promise((resolve) => {
        const checkPlayers = () => {
            if (world.getPlayers().length > 0) {
                resolve(true);
            } else {
                system.runTimeout(checkPlayers, 2)
            }
        };
        checkPlayers()
    })
}