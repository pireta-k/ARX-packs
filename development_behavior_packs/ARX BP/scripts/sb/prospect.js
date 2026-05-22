import { obj2str } from "../arxLib/converters"
import { sleep } from "../arxLib/time"

const PROSPECTIONSTEP = 16
let cache = {}

// === Direction presets (primitive rays; symmetric expansion adds opposite signs) ===
// Each ring: point = origin + ray * (step * iteration). Slope stays constant: {1,2} → (16,32) at step 16.

export const DIRECTION_PRESETS = {
    /** ±X, ±Z */
    cardinal: [{ x: 1, z: 0 }, { x: 0, z: 1 }],
    /** Cardinals + 45° diagonals */
    octagonal: [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: 1, z: 1 }],
    /** Cardinals, diagonals, and shallow skew rays (1:2, 2:1, 1:3, 3:1) */
    star: [
        { x: 1, z: 0 },
        { x: 0, z: 1 },
        { x: 1, z: 1 },
        { x: 1, z: 2 },
        { x: 2, z: 1 },
        { x: 1, z: 3 },
        { x: 3, z: 1 },
    ],
}

function gcd(a, b) {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b) {
        const t = b
        b = a % b
        a = t
    }
    return a || 1
}

/** Reduces ray to smallest integer step (e.g. 2,4 → 1,2) */
function normalizeRay(ray) {
    const x = ray.x ?? 0
    const z = ray.z ?? 0
    if (x === 0 && z === 0) return null
    const g = gcd(x, z)
    return { x: x / g, z: z / g }
}

/** One primitive ray → up to 4 symmetric rays (all sign combinations) */
function expandRay(ray, symmetric) {
    const n = normalizeRay(ray)
    if (!n) return []

    if (!symmetric) return [n]

    const variants = [
        { x: n.x, z: n.z },
        { x: n.x, z: -n.z },
        { x: -n.x, z: n.z },
        { x: -n.x, z: -n.z },
    ]

    const seen = new Set()
    const out = []
    for (const v of variants) {
        if (v.x === 0 && v.z === 0) continue
        const key = `${v.x},${v.z}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(v)
    }
    return out
}

/** @param {string|Array<{x:number,z:number}>|{rays:Array,symmetric?:boolean}} directions */
export function resolveProspectionDirections(directions, symmetricDefault = true) {
    let rays = directions
    let symmetric = symmetricDefault

    if (directions == null) {
        rays = DIRECTION_PRESETS.cardinal
    } else if (typeof directions === 'string') {
        rays = DIRECTION_PRESETS[directions]
        if (!rays) {
            console.warn(`resolveProspectionDirections: unknown preset "${directions}", using cardinal`)
            rays = DIRECTION_PRESETS.cardinal
        }
    } else if (typeof directions === 'object' && !Array.isArray(directions) && directions.rays) {
        rays = directions.rays
        if (directions.symmetric !== undefined) symmetric = directions.symmetric
    }

    if (!Array.isArray(rays) || rays.length === 0) {
        console.warn('resolveProspectionDirections: empty directions, using cardinal')
        rays = DIRECTION_PRESETS.cardinal
    }

    const seen = new Set()
    const result = []
    for (const ray of rays) {
        for (const v of expandRay(ray, symmetric)) {
            const key = `${v.x},${v.z}`
            if (seen.has(key)) continue
            seen.add(key)
            result.push(v)
        }
    }
    return result
}

// This module makes possible to explore locations (by scripts) that players haven't ever visited
export async function prospect(d, x, z) {
    try {
        x = Math.floor(x)
        z = Math.floor(z)
        const cacheKey = getCacheKey(d, x, z)
        if (cache[cacheKey]) return cache[cacheKey]

        await validateTickingAreaLoading(d, { x: x, z: z }, { x: x, z: z }, 'prosp')
        const b = d.getTopmostBlock({ x: x, z: z })
        const data = extractUsefulData(b)
        d.runCommand(`tickingarea remove prosp`)
        await sleep(1)

        if (data) cache[cacheKey] = data
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

function extractUsefulData(b) {
    if (b) {
        return {
            location: b.location,
            biome: b.dimension.getBiome(b.location).id,
            hasLiquidAbove: b.above().isLiquid,
        }
    }
    return undefined
}

function getProspectionStep(forceStep) {
    if (typeof forceStep === 'number' && forceStep > 0) return forceStep
    return PROSPECTIONSTEP
}

function isInAltitude(y, altitude) {
    if (!altitude || altitude.length < 2) return true
    return y >= altitude[0] && y <= altitude[1]
}

function isProspectAvoided(x, z, avoid) {
    if (!avoid || typeof avoid !== 'object') return false

    const regions = avoid.regions
    if (regions) {
        for (const r of regions) {
            const x1 = r.x1 ?? r.min?.x
            const z1 = r.z1 ?? r.min?.z
            const x2 = r.x2 ?? r.max?.x
            const z2 = r.z2 ?? r.max?.z
            if (x1 === undefined || z1 === undefined || x2 === undefined || z2 === undefined) continue
            const minX = Math.min(x1, x2)
            const maxX = Math.max(x1, x2)
            const minZ = Math.min(z1, z2)
            const maxZ = Math.max(z1, z2)
            if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return true
        }
    }

    const points = avoid.points
    if (points) {
        for (const p of points) {
            const dx = x - p.x
            const dz = z - p.z
            const radius = p.r ?? p.radius ?? 0
            if (dx * dx + dz * dz <= radius * radius) return true
        }
    }

    return false
}

/** Run prospection — expanding rays from initialPos
 * @param {Dimension} d
 * @param {VectorXZ} initialPos
 * @param {Function} target returns true when location fits
 * @param {number} [minDistance=0]
 * @param {number} [maxIterations=0] 0 = no limit
 * @param {object} [avoid={}]
 * @param {number[]} [altitude] [minY, maxY]
 * @param {number|boolean} [forceStep=false] number = custom step; true = exact minDistance on first ring
 * @param {string|Array<{x:number,z:number}>|{rays:Array,symmetric?:boolean}} [directions] ray shape; preset name or custom rays
 * @param {boolean} [symmetricDirections=true] mirror each ray to all quadrants
 * @returns {Vector3|undefined}
 */
export async function runProspection(
    d,
    initialPos,
    target,
    minDistance = 0,
    maxIterations = 0,
    avoid = {},
    altitude = undefined,
    forceStep = false,
    directions = undefined,
    symmetricDirections = true
) {
    const step = getProspectionStep(forceStep)
    const rays = resolveProspectionDirections(directions, symmetricDirections)
    const originX = Math.floor(initialPos.x)
    const originZ = Math.floor(initialPos.z)
    let iteration = minDistance ? Math.max(1, Math.round(minDistance / step)) : 1

    const tryRing = async (distance) => {
        for (const ray of rays) {
            const x = originX + ray.x * distance
            const z = originZ + ray.z * distance

            if (isProspectAvoided(x, z, avoid)) continue

            const data = await prospect(d, x, z)
            if (!data) continue
            if (!isInAltitude(data.location.y, altitude)) continue
            if (target(data)) return data.location
        }
        return undefined
    }

    if (forceStep === true && minDistance > 0) {
        const exact = await tryRing(minDistance)
        if (exact) return exact
        iteration = Math.max(1, Math.round(minDistance / step)) + 1
    }

    while (maxIterations === 0 || iteration <= maxIterations) {
        const found = await tryRing(step * iteration)
        if (found) return found
        iteration++
    }

    console.warn('runProspection: no matching location found')
    return undefined
}

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
