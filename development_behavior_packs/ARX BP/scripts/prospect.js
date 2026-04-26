import { system } from "@minecraft/server"
import { obj2str } from "./converters"

PROSPECTIONSTEP = 16

// This module makes possible to explore locations (by scripts) that players haven't ever visited
export async function prospect(d, x, z) {
    x = Math.floor(x)
    z = Math.floor(z)
    // Try to find data in cache
    const cacheKey = getCacheKey(d, x, z)
    if (cache[cacheKey]) {
        return cache[cacheKey]
    }
    // No data in cache
    d.runCommand(`tickingarea add ${x} ${d.heightRange.min} ${z} ${x} ${d.heightRange.max} ${z} prosp true`)
    await delay(1)
    const b = d.getTopmostBlock({ x: x, z: z })
    d.runCommand(`tickingarea remove prosp`)
    await delay(1)
    // Save in cache
    cache[getCacheKey(d, x, z)] = b
    // Return
    return b
}

let cache = {}
function getCacheKey(d, x, z) {
    return obj2str([d.id, x, z])
}

function extractUsefulData(b) {
    if (b) {
        return {
            loc: b.location, // xyz vector
            biome: b.dimension.getBiome(b.location)
        }
    } else {
        console.warn('§cextractUsefulData: No block provided')
    }
}

const delay = (ticks) => new Promise(resolve => system.runTimeout(resolve, ticks))



/** Run prospection
 * @param {Dimension} d Dimension
 * @param {VectorXZ} initialPos Position to start prospection
 * @param {Function} target Prospect until this function returns true
 * @param {number} [minDistance=0] Minimal distance from initialPos to start prospection
 * @param {number} [maxIterations=0] Iterations limit. 0 = no limit
 * @param {object} [avoid={}] Locations to avoid prospecting in.
 * @param {Array} [altitude=undefined] [min altitude, max altitude]
 * @returns {VectorXZ}
 */
export function runProspection(d, initialPos, target, minDistance = undefined, maxIterations = undefined, avoid = undefined, altitude = undefined) {
    let iteration = minDistance ? Math.round(minDistance / PROSPECTIONSTEP) : 1
    const directions = [
        { x = 1, z = 0 },
        { x = -1, z = 0 },
        { x = 0, z = 1 },
        { x = 0, z = -1 },
    ]
    while (true) {
        const posMultiplier = PROSPECTIONSTEP * iteration
        for (const direction in directions) {
            const data = prospect(
                d,
                initialPos.x + direction.x * posMultiplier,
                initialPos.z + direction.z * posMultiplier
            )
            const found = target(data)
            if (found) return data.loc // CYCLE EXIT
        }
        iteration++
    }
}