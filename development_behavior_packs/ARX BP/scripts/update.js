// Arx pack updates — version migrations and first-time world setup

import { world, system } from "@minecraft/server";
import { VERSION } from "./_main"
import { gDP, ssDP } from "./arxLib/DPOperations"
import { getAdmins } from "./arxLib/admin";
import { setScore } from "./arxLib/scoresOperations"
import { runProspection, validateTickingAreaLoading } from "./sb/prospect"
import { loadACSS } from "./sb/structureBuilder"
import { acssStorage } from "./sb/acssStorage"
import { isPlayerCompletelyLoaded } from "./isPlayerCompletelyLoaded"
import { sleep } from "./arxLib/time";

// === Version helpers ===
// VERSION and latestV are arrays [major, minor, patch], keys in updates use "0,1,19" format

function vKey(v) {
    return `${v[0]},${v[1]},${v[2]}`
}

function parseVKey(key) {
    return key.split(',').map(Number)
}

function compareVersion(a, b) {
    const len = Math.max(a.length, b.length, 3)
    for (let i = 0; i < len; i++) {
        const diff = (a[i] ?? 0) - (b[i] ?? 0)
        if (diff !== 0) return diff < 0 ? -1 : 1
    }
    return 0
}

function versionLess(a, b) {
    return compareVersion(a, b) < 0
}

function versionEqual(a, b) {
    return compareVersion(a, b) === 0
}

// Which migration steps to run between saved latestV and current pack VERSION (inclusive)
function getVersionsToApply(fromV, toV) {
    return Object.keys(updates)
        .map(parseVKey)
        .filter(v => !versionLess(v, fromV) && !versionLess(toV, v))
        .sort(compareVersion)
}

// Migrations finished — latestV on world matches current pack VERSION
// Needs for external usage
export function isArxWorldReady() {
    return versionEqual(gDP(world, 'latestV', [0, 0, 0]), VERSION)
}

// === Update detection ===
// Runs on worldLoad. Compares world DP latestV with VERSION from _main.js

export async function detectUpdate() {
    const currentV = VERSION
    const latestV = gDP(world, 'latestV', [0, 0, 0])

    // Pack version unchanged — nothing to do
    if (versionEqual(currentV, latestV)) return

    // Downgrade (older pack on newer world data) — don't run migrations, only sync latestV
    if (versionLess(currentV, latestV)) {
        console.warn(`Arx: downgrade ${vKey(latestV)} -> ${vKey(currentV)}, skipping updates`)
        ssDP(world, 'latestV', currentV)
        return
    }

    await applyUpdates(currentV, latestV)
}

// Run every migration in order, then remember the pack version on the world
async function applyUpdates(currentV, latestV) {
    const versionsToRun = getVersionsToApply(latestV, currentV)

    for (const v of versionsToRun) {
        const fn = updates[vKey(v)]
        if (typeof fn !== 'function') {
            console.warn(`Arx update [${vKey(v)}]: no function registered`)
            continue
        }
        try {
            await fn({ from: latestV, to: currentV, version: v })
        } catch (e) {
            console.warn(`Arx update [${vKey(v)}] failed: ${e}`)
        }
    }

    ssDP(world, 'latestV', currentV)
    getAdmins().forEach(p => {
        p.sendMessage(`Arx update detected: ${vKey(latestV)} -> ${vKey(currentV)}`)
    })
}

// === Update 0.0.0 — first-time Arx setup ===
// Full first load: wait for hoster, then scores, lobby, prospected open-world spawn
async function runArxFirstLoad() {
    const d = world.getDimension('minecraft:overworld')

    // Wait until at least one player is in the world (on worldLoad there may be none yet)
    let hoster
    while (!hoster) {
        const players = world.getPlayers()
        if (players.length >= 1) hoster = players[0]
        else await sleep(1)
    }

    console.log('Initializing Arx...')
    d.runCommand("function world_reg/_world_reg") // Register scores

    await waitUntilHosterIsLoaded(hoster)

    setScore(hoster, 'verify', 2) // After world_reg and player load — needs scoreboardIdentity
    ssDP(hoster, 'isHoster', true)

    world.setDefaultSpawnLocation({ x: -10000, y: 4, z: -10000 })

    // Gamerules default settings
    world.gameRules.sendCommandFeedback = false
    world.gameRules.doInsomnia = false
    world.gameRules.doWeatherCycle = false
    world.gameRules.showDeathMessages = false
    world.gameRules.doImmediateRespawn = true
    world.gameRules.locatorBar = false
    world.gameRules.spawnRadius = 0
    world.gameRules.showTags = false
    world.gameRules.naturalRegeneration = true
    world.gameRules.recipesUnlock = false

    // Arx default settings
    ssDP(world, 'generateGrass', true)
    ssDP(world, 'anticheat', true)
    ssDP(world, 'allowArxCameras', true)
    ssDP(world, 'enableWorldBorder', false)
    ssDP(world, 'worldBorderRange', 5000)
    ssDP(world, 'enableAmbienceCore', true)
    ssDP(world, 'enableFogs', true)

    // Load lobby chunks before hoster teleports there
    await validateTickingAreaLoading(d, { x: -9980, z: -9980 }, { x: -10020, z: -10020 }, 'lobbyReg')

    const initialSpawnPoint = hoster.location

    await createLobby(d, hoster)

    // Prospect spawnpoint for the open world (forest / plains / birch)
    const spawnLocation = await runProspection(
        d,
        initialSpawnPoint,
        (data) => ['minecraft:forest', 'minecraft:plains', 'minecraft:birch_forest'].includes(data.biome) && !data.hasLiquidAbove
    )
    const spawn = spawnLocation ?? initialSpawnPoint
    if (!spawnLocation) console.warn('Arx first load: prospection fallback to initial spawn')
    ssDP(world, 'worldSpawnPoint', { x: spawn.x, y: (spawn.y ?? 64) + 1, z: spawn.z })

    // From Arx spawn — prospect site for smallTestHome (meadow / plains)
    const smallTestHomeLocation = await runProspection(
        d,
        spawn,
        (data) => ['minecraft:meadow', 'minecraft:plains'].includes(data.biome) && !data.hasLiquidAbove,
        80,
        400,
        { regions: [{ x1: -10020, z1: -10020, x2: -9980, z2: -9980 }] },
        [50, 220],
        false,
        'star'
    )

    if (!smallTestHomeLocation) {
        console.warn('Arx first load: smallTestHome prospection failed, skipping build')
        return
    }

    ssDP(world, 'smallTestHomeLocation', {
        x: smallTestHomeLocation.x,
        y: smallTestHomeLocation.y,
        z: smallTestHomeLocation.z,
    })

    const buildAnchor = {
        x: Math.floor(smallTestHomeLocation.x),
        y: Math.floor(smallTestHomeLocation.y) - 3,
        z: Math.floor(smallTestHomeLocation.z),
    }

    console.log('Building smallTestHome at', buildAnchor)
    const placed = await loadACSS(acssStorage.smallTestHome, d, buildAnchor)
    if (placed === null) console.warn('Arx first load: smallTestHome placement failed')
}

// Creates lobby at -10000; retries until chunks and feature placement are valid
async function createLobby(d, hoster) {
    try {
        console.log('Trying to create lobby...')
        hoster.teleport({ x: -9999.5, y: 4, z: -9999.5 }, { checkForBlocks: true, dimension: d, facingLocation: { x: -9999.5, y: 4, z: -9993 }, keepVelocity: false })
        hoster.runCommand('fill ~-10 ~-10 ~-10 10 10 10 air')
        // Blocks above broken portal — must be air before feature
        const b1 = d.getBlock({ x: -10001, y: 5, z: -10001 })
        const b2 = d.getBlock({ x: -10001, y: 5, z: -9999 })
        const b3 = d.getBlock({ x: -9999, y: 5, z: -10001 })
        const b4 = d.getBlock({ x: -9999, y: 5, z: -9999 })
        if (!b1 || !b2 || !b3 || !b4) throw new Error('Lobby is still loading')

        d.placeFeature('arx:lobby_feature', { x: -9991, y: 0, z: -9989 }, true)

        const air = 'minecraft:air'
        if (b1.typeId != air || b2.typeId != air || b3.typeId != air || b4.typeId != air) throw new Error('Wrong lobby placement')

        // Bottom blocks of portal — fingerprint that feature landed correctly
        const b5 = d.getBlock({ x: -10001, y: 3, z: -10001 })
        const b6 = d.getBlock({ x: -10001, y: 3, z: -9999 })
        const b7 = d.getBlock({ x: -9999, y: 3, z: -10001 })
        const b8 = d.getBlock({ x: -9999, y: 3, z: -9999 })

        if (b5.typeId != 'minecraft:mossy_stone_bricks' || b6.typeId != 'minecraft:stone_bricks' || b7.typeId != 'minecraft:stone_bricks' || b8.typeId != 'minecraft:cracked_stone_bricks') throw new Error('Wrong lobby placement')
    }
    catch {
        await sleep(2)
        createLobby(d, hoster)
    }
    // Lobby entities and cleanup
    d.spawnEntity('arx:lobby_character_creation', { x: -9999.5, y: 4, z: -9993 }, { initialRotation: 180 })
    d.spawnEntity('arx:carved_bench', { x: -9994.5, y: 4, z: -10003.5 }, { initialRotation: 90 })
    d.spawnEntity('arx:statue_of_sinriada', { x: -9991.5, y: 8, z: -9997.0 }, { initialRotation: 90 })
    d.runCommand('tickingarea remove lobbyReg')
}

async function waitUntilHosterIsLoaded(hoster) {
    hoster.addEffect('instant_health', 60, { amplifier: 255, showParticles: false })
    const hosterLoaded = await isPlayerCompletelyLoaded(hoster)
    if (!hosterLoaded) {
        await waitUntilHosterIsLoaded(hoster)
    }
}

// Migration registry — add a new key for each pack version that needs world/player changes
const updates = {
    // Wrapper: applyUpdates passes migration context, not a player
    [vKey([0, 0, 0])]: async () => { await runArxFirstLoad() },
    [vKey([0, 1, 17])]: () => console.warn('Arx update: 0.1.17'),
    [vKey([0, 1, 18])]: () => console.warn('Arx update: 0.1.18'),
    [vKey([0, 1, 19])]: () => console.warn('Arx update: 0.1.19'),
}

world.afterEvents.worldLoad.subscribe(() => {
    detectUpdate()
})
