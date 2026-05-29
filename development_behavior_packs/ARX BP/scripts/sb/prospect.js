import { obj2str } from "../arxLib/converters"
import { sleep } from "../arxLib/time"

const PROSPECTIONSTEP = 16
const PROSP_PARALLEL = 8
const PROSP_SLOT_NAMES = ['prosp_a', 'prosp_b', 'prosp_c', 'prosp_d', 'prosp_e', 'prosp_f', 'prosp_g', 'prosp_h']
const PROSP_TERRAIN_AREA = 'prosp_terrain'
let cache = {}
const terrainAreaLock = {
    busy: false,
    waiters: [],
}

const clamp01 = (n) => Math.max(0, Math.min(1, n))

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

async function prospectSlots(d, points) {
    const n = Math.min(points.length, PROSP_PARALLEL)
    const slice = points.slice(0, n)
    const names = PROSP_SLOT_NAMES.slice(0, n)

    try {
        await Promise.all(
            slice.map((p, i) =>
                validateTickingAreaLoading(d, { x: p.x, z: p.z }, { x: p.x, z: p.z }, names[i])
            )
        )

        const data = slice.map((p) => {
            const b = d.getTopmostBlock({ x: p.x, z: p.z })
            return extractUsefulData(b)
        })

        for (const name of names) {
            d.runCommand(`tickingarea remove ${name}`)
        }
        await sleep(1)
        return data
    }
    catch (error) {
        console.error(error)
        for (const name of names) {
            d.runCommand(`tickingarea remove ${name}`)
        }
        await sleep(1)
        return slice.map(() => undefined)
    }
}

async function prospectBatch(d, points) {
    const results = new Array(points.length)

    for (let offset = 0; offset < points.length; offset += PROSP_PARALLEL) {
        const chunk = points.slice(offset, offset + PROSP_PARALLEL)
        const toFetch = []
        const toFetchIndices = []

        for (let i = 0; i < chunk.length; i++) {
            const p = chunk[i]
            const x = Math.floor(p.x)
            const z = Math.floor(p.z)
            const cacheKey = getCacheKey(d, x, z)
            if (cache[cacheKey]) {
                results[offset + i] = cache[cacheKey]
            } else {
                toFetch.push({ x, z })
                toFetchIndices.push(offset + i)
            }
        }

        if (toFetch.length === 0) continue

        const fetched = await prospectSlots(d, toFetch)
        for (let j = 0; j < toFetch.length; j++) {
            const data = fetched[j]
            const { x, z } = toFetch[j]
            const cacheKey = getCacheKey(d, x, z)
            if (data) cache[cacheKey] = data
            results[toFetchIndices[j]] = data
        }
    }

    return results
}

export async function prospect(d, x, z) {
    const [data] = await prospectBatch(d, [{ x, z }])
    return data
}

function getCacheKey(d, x, z) {
    return obj2str([d.id, x, z])
}

function extractUsefulData(b) {
    if (b) {
        const hillinessCache = new Map()
        const getHillinessCached = async (options = {}) => {
            const key = getHillinessCacheKey(options)
            if (!hillinessCache.has(key)) {
                hillinessCache.set(key, measureHilliness(b.dimension, b.location, options))
            }
            return hillinessCache.get(key)
        }
        return {
            location: b.location,
            biome: b.dimension.getBiome(b.location).id,
            hasLiquidAbove: b.above().isLiquid,
            getHilliness: (options = {}) => getHillinessCached(options),
            getHillinessScore: async (options = {}) => normalizeHilliness(await getHillinessCached(options), options),
            isHillinessInRange: async (options = {}) => {
                const score = normalizeHilliness(await getHillinessCached(options), options)
                return isHillinessInRange(score, options)
            },
            hasLowHilliness: async (options = {}) => isLowHilliness(await getHillinessCached(options), options),
        }
    }
    return undefined
}

export async function measureHilliness(d, center, options = {}) {
    const radius = Math.max(0, Math.floor(options.radius ?? 32))
    const step = Math.max(1, Math.floor(options.step ?? 16))
    const customName = options.tickingAreaName
    const lockName = customName ?? await acquireTerrainAreaName()
    const name = lockName ?? PROSP_TERRAIN_AREA
    const timeout = options.timeout ?? 200
    const cx = Math.floor(center.x)
    const cz = Math.floor(center.z)
    const centerY = Math.floor(center.y)
    const heights = []

    try {
        const loaded = await validateTickingAreaLoading(
            d,
            { x: cx - radius, z: cz - radius },
            { x: cx + radius, z: cz + radius },
            name,
            timeout
        )
        if (!loaded) return getHillinessStats(heights, centerY)

        for (let dx = -radius; dx <= radius; dx += step) {
            for (let dz = -radius; dz <= radius; dz += step) {
                if (dx * dx + dz * dz > radius * radius) continue

                try {
                    const block = d.getTopmostBlock({ x: cx + dx, z: cz + dz })
                    if (!block) continue
                    heights.push(block.location.y)
                } catch { }
            }
        }
    }
    finally {
        try {
            d.runCommand(`tickingarea remove ${name}`)
        } catch { }
        await sleep(1)
        if (!customName) releaseTerrainAreaName()
    }

    return getHillinessStats(heights, centerY)
}

function getHillinessCacheKey(options = {}) {
    const radius = Math.max(0, Math.floor(options.radius ?? 32))
    const step = Math.max(1, Math.floor(options.step ?? 16))
    const timeout = Math.max(1, Math.floor(options.timeout ?? 200))
    const wRange = options.rangeWeight ?? 0.5
    const wAvg = options.avgWeight ?? 0.35
    const wMax = options.maxWeight ?? 0.15
    const rRange = options.rangeForOne ?? 40
    const rAvg = options.averageAbsDeltaForOne ?? 18
    const rMax = options.maxAbsDeltaForOne ?? 32
    return `${radius}|${step}|${timeout}|${wRange}|${wAvg}|${wMax}|${rRange}|${rAvg}|${rMax}`
}

function getHillinessStats(heights, centerY) {
    if (heights.length === 0) {
        return {
            samples: 0,
            minY: centerY,
            maxY: centerY,
            heightRange: 0,
            averageY: centerY,
            averageAbsDelta: 0,
            maxAbsDelta: 0,
        }
    }

    let minY = heights[0]
    let maxY = heights[0]
    let sumY = 0
    let sumAbsDelta = 0
    let maxAbsDelta = 0

    for (const y of heights) {
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        sumY += y

        const absDelta = Math.abs(y - centerY)
        sumAbsDelta += absDelta
        if (absDelta > maxAbsDelta) maxAbsDelta = absDelta
    }

    return {
        samples: heights.length,
        minY,
        maxY,
        heightRange: maxY - minY,
        averageY: sumY / heights.length,
        averageAbsDelta: sumAbsDelta / heights.length,
        maxAbsDelta,
    }
}

export function isLowHilliness(hilliness, options = {}) {
    const maxHeightRange = options.maxHeightRange ?? 12
    const maxAverageAbsDelta = options.maxAverageAbsDelta ?? 4
    const maxAbsDelta = options.maxAbsDelta ?? 8

    return hilliness.samples > 0
        && hilliness.heightRange <= maxHeightRange
        && hilliness.averageAbsDelta <= maxAverageAbsDelta
        && hilliness.maxAbsDelta <= maxAbsDelta
}

export async function hasLowHilliness(d, center, options = {}) {
    const hilliness = await measureHilliness(d, center, options)
    return isLowHilliness(hilliness, options)
}

export function normalizeHilliness(hilliness, options = {}) {
    if (!hilliness || hilliness.samples <= 0) return 1

    const rangeForOne = Math.max(1, options.rangeForOne ?? 40)
    const averageAbsDeltaForOne = Math.max(1, options.averageAbsDeltaForOne ?? 18)
    const maxAbsDeltaForOne = Math.max(1, options.maxAbsDeltaForOne ?? 32)
    const rangeWeight = options.rangeWeight ?? 0.5
    const avgWeight = options.avgWeight ?? 0.35
    const maxWeight = options.maxWeight ?? 0.15
    const weightSum = Math.max(0.0001, rangeWeight + avgWeight + maxWeight)
    const rangePart = clamp01(hilliness.heightRange / rangeForOne)
    const avgPart = clamp01(hilliness.averageAbsDelta / averageAbsDeltaForOne)
    const maxPart = clamp01(hilliness.maxAbsDelta / maxAbsDeltaForOne)

    return clamp01((rangePart * rangeWeight + avgPart * avgWeight + maxPart * maxWeight) / weightSum)
}

export function isHillinessInRange(hillinessScore, options = {}) {
    const min = options.min ?? 0
    const max = options.max ?? 1
    return hillinessScore >= min && hillinessScore <= max
}

export function createProspectionTarget(baseTarget, hillinessOptions = undefined) {
    return async (data) => {
        if (!await baseTarget(data)) return false
        if (!hillinessOptions) return true
        return await data.isHillinessInRange(hillinessOptions)
    }
}

async function acquireTerrainAreaName() {
    if (!terrainAreaLock.busy) {
        terrainAreaLock.busy = true
        return PROSP_TERRAIN_AREA
    }
    await new Promise((resolve) => terrainAreaLock.waiters.push(resolve))
    terrainAreaLock.busy = true
    return PROSP_TERRAIN_AREA
}

function releaseTerrainAreaName() {
    if (terrainAreaLock.waiters.length > 0) {
        const next = terrainAreaLock.waiters.shift()
        if (next) next()
        return
    }
    terrainAreaLock.busy = false
}

function getProspectionStep(forceStep) {
    if (typeof forceStep === 'number' && forceStep > 0) return forceStep
    return PROSPECTIONSTEP
}

function isInAltitude(y, altitude) {
    if (!altitude || altitude.length < 2) return true
    return y >= altitude[0] && y <= altitude[1]
}

/** Same ring can map multiple rays to one block; one prospect per coordinate is enough */
function dedupeProspectPoints(points) {
    const seen = new Set()
    const out = []
    for (const p of points) {
        const x = Math.floor(p.x)
        const z = Math.floor(p.z)
        const key = `${x},${z}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ x, z })
    }
    return out
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
 * @param {Function} target returns true or Promise<true> when location fits
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
        const candidates = dedupeProspectPoints(
            rays.flatMap((ray) => {
                const x = originX + ray.x * distance
                const z = originZ + ray.z * distance
                if (isProspectAvoided(x, z, avoid)) return []
                return [{ x, z }]
            })
        )

        // Up to PROSP_PARALLEL ticking areas per batch; early exit between batches (ray order kept)
        for (let i = 0; i < candidates.length; i += PROSP_PARALLEL) {
            const chunk = candidates.slice(i, i + PROSP_PARALLEL)
            const results = await prospectBatch(d, chunk)
            for (let j = 0; j < chunk.length; j++) {
                const data = results[j]
                if (!data) continue
                if (!isInAltitude(data.location.y, altitude)) continue
                if (await target(data)) return data.location
            }
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
