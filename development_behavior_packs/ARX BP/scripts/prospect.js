import { system } from "@minecraft/server"
import { obj2str } from "./converters"
import { sleep } from "./time"

const PROSPECTIONSTEP = 16
let cache = {}

// This module makes possible to explore locations (by scripts) that players haven't ever visited
export async function prospect(d, x, z) {
    try {
        x = Math.floor(x)
        z = Math.floor(z)
        // Try to find data in cache
        const cacheKey = getCacheKey(d, x, z)
        if (cache[cacheKey]) return cache[cacheKey]
        // No data in cache
        await validateTickingAreaLoading(d, { x: x, z: z }, { x: x, z: z }, 'prosp')
        const b = d.getTopmostBlock({ x: x, z: z })
        const data = extractUsefulData(b)
        d.runCommand(`tickingarea remove prosp`)
        await sleep(1)
        // Save in cache
        cache[getCacheKey(d, x, z)] = data
        // Return
        return data
    }
    catch (error) {
        console.error(error)
        d.runCommand(`tickingarea remove prosp`)
        await sleep(1)
    }
}

function getCacheKey(d, x, z) {
    return obj2str([d.id, x, z])
}

/** Extracts data from block
 * @param {Block} b 
 * @returns {object}
 */
function extractUsefulData(b) {
    // Block exists
    if (b) {
        return {
            location: b.location, // xyz vector
            biome: b.dimension.getBiome(b.location).id,
            hasLiquidAbove: b.above().isLiquid,
        }
    } 
    // No block
    else {
        console.error('§cextractUsefulData: No block provided')
        return undefined
    }
}



/** Run prospection
 * @param {Dimension} d Dimension
 * @param {VectorXZ} initialPos Position to start prospection
 * @param {Function} target Prospect until this function returns true
 * @param {number} [minDistance=0] Minimal distance from initialPos to start prospection
 * @param {number} [maxIterations=0] Iterations limit. 0 = no limit
 * @param {object} [avoid={}] Locations to avoid prospecting in.
 * @param {Array} [altitude=undefined] [min altitude, max altitude]
 * @returns {Vector3}
 */
export async function runProspection(d, initialPos, target, minDistance = undefined, maxIterations = undefined, avoid = undefined, altitude = undefined, forceStep = false) {
    let iteration = minDistance ? Math.round(minDistance / PROSPECTIONSTEP) : 1
    const directions = [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
    ]
    while (true) {
        const posMultiplier = PROSPECTIONSTEP * iteration
        for (const direction of directions) {
            // Prospect the block
            const data = await prospect(
                d,
                initialPos.x + direction.x * posMultiplier,
                initialPos.z + direction.z * posMultiplier
            )
            const found = target(data)
            if (found) return data.location // CYCLE EXIT
        }
        iteration++
    }
}

/** Sets tickingarea and validates it
 */
export async function validateTickingAreaLoading(d, pos1, pos2, name, timeout = 200) {
    d.runCommand(`tickingarea add ${pos1.x} 0 ${pos1.z} ${pos2.x} 0 ${pos2.z} ${name} true`)
    let iteration = 0
    while (true) {
        await sleep(1)
        const isLoaded = d.isChunkLoaded({ x: pos1.x, y: 0, z: pos1.z }) && d.isChunkLoaded({ x: pos2.x, y: 0, z: pos2.z })
        if (isLoaded) return true
        iteration++
        if (iteration >= timeout) return false
    }
}