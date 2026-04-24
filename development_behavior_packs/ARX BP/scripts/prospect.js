import { system } from "@minecraft/server"
import { obj2str } from "./converters"

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
            typeId: b.typeId,
            biome: b.dimension.getBiome(b.location)
        }
    } else {
        console.warn('§cextractUsefulData: No block provided')
    }
}

const delay = (ticks) => new Promise(resolve => system.runTimeout(resolve, ticks))