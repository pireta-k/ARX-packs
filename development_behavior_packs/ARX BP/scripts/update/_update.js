// Arx pack updates — version migrations and first-time world setup

import { world } from "@minecraft/server";
import { VERSION } from "../_main"
import { gDP, sDP } from "../arxLib/DPOperations"
import { getAdmins } from "../arxLib/admin";
import { updateRegistry } from "./updateRegistry";

// === Version helpers ===
// VERSION and latestV are arrays [major, minor, patch], keys in updates use "0,1,19" format

export function vKey(v) {
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
    return Object.keys(updateRegistry)
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
        console.warn(`Arx: downgrade ${vKey(latestV)} -> ${vKey(currentV)}`)
        sDP(world, 'latestV', currentV)
        return
    }

    await applyUpdates(currentV, latestV)
}

// Run every migration in order, then remember the pack version on the world
async function applyUpdates(currentV, latestV) {
    const versionsToRun = getVersionsToApply(latestV, currentV)

    for (const v of versionsToRun) {
        const fn = updateRegistry[vKey(v)]
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

    sDP(world, 'latestV', currentV)
    getAdmins().forEach(p => {
        p.sendMessage(`Arx updated: ${vKey(latestV)} -> ${vKey(currentV)}`)
    })
}

// Run
world.afterEvents.worldLoad.subscribe(() => {
    detectUpdate()
})
