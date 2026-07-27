import { getEntityFamilies } from '../_main'
import { playSound } from '../arxLib/audio'
import { gDP } from '../arxLib/DPOperations'

const DEFAULT_MAX_BOUNCES = 20
const RAY_EPSILON = 0.05
const ENTITY_HIT_RADIUS = 0.75

/**
 * Casts a magic ray that can ricochet from blocks.
 *
 * Return shape:
 * {
 *   target: Entity | undefined,
 *   path: [{ from: Vector3, to: Vector3, type: 'entity' | 'block' | 'empty' }],
 *   bounces: [{ location: Vector3, normal: Vector3, block: Block }],
 *   bounceCount: number,
 *   distancePassed: number,
 *   stopReason: 'entity' | 'distance' | 'bounceLimit' | 'blocked'
 * }
 */
export function rayCast(player, distance, options = {}) {
    const dimension = player.dimension
    const maxBounces = options.maxBounces ?? DEFAULT_MAX_BOUNCES

    let from = player.getHeadLocation()
    let direction = normalize(player.getViewDirection())
    let distanceLeft = distance
    let distancePassed = 0

    const path = []
    const bounces = []
    const casterId = gDP(player, 'id')

    while (distanceLeft > RAY_EPSILON) {
        const blockHit = getBlockHit(dimension, from, direction, distanceLeft)
        const segmentDistance = blockHit ? blockHit.distance : distanceLeft
        const isFirstSegment = bounces.length === 0
        const entityHit = getEntityHit(dimension, from, direction, segmentDistance, player, isFirstSegment, casterId)

        if (entityHit) {
            path.push({ from, to: entityHit.location, type: 'entity' })
            return {
                target: entityHit.entity,
                path,
                bounces,
                bounceCount: bounces.length,
                distancePassed: distancePassed + entityHit.distance,
                stopReason: 'entity'
            }
        }

        if (!blockHit) {
            path.push({ from, to: add(from, multiply(direction, distanceLeft)), type: 'empty' })
            return {
                target: undefined,
                path,
                bounces,
                bounceCount: bounces.length,
                distancePassed: distance,
                stopReason: 'distance'
            }
        }

        path.push({ from, to: blockHit.location, type: 'block' })
        bounces.push({
            location: blockHit.location,
            normal: blockHit.normal,
            block: blockHit.block
        })

        distanceLeft -= blockHit.distance
        distancePassed += blockHit.distance

        if (bounces.length >= maxBounces) {
            return {
                target: undefined,
                path,
                bounces,
                bounceCount: bounces.length,
                distancePassed,
                stopReason: 'bounceLimit'
            }
        }

        direction = reflect(direction, blockHit.normal)
        if (length(direction) === 0) {
            return {
                target: undefined,
                path,
                bounces,
                bounceCount: bounces.length,
                distancePassed,
                stopReason: 'blocked'
            }
        }

        from = add(blockHit.location, multiply(blockHit.normal, RAY_EPSILON))
        distanceLeft -= RAY_EPSILON
        distancePassed += RAY_EPSILON
    }

    return {
        target: undefined,
        path,
        bounces,
        bounceCount: bounces.length,
        distancePassed,
        stopReason: 'distance'
    }
}

function getBlockHit(dimension, from, direction, maxDistance) {
    let hit
    try {
        hit = dimension.getBlockFromRay(from, direction, {
            maxDistance,
            includeLiquidBlocks: false,
            includePassableBlocks: false
        })
    } catch {
        return undefined
    }

    if (!hit?.block) return undefined

    const intersection = getBlockIntersection(from, direction, hit.block.location)
    if (!intersection) return undefined

    const hitDistance = Math.max(RAY_EPSILON, intersection.distance)
    if (hitDistance > maxDistance + RAY_EPSILON) return undefined

    return {
        block: hit.block,
        location: intersection.location,
        normal: intersection.normal,
        distance: hitDistance
    }
}

function getBlockIntersection(from, direction, blockLocation) {
    const bounds = {
        minX: blockLocation.x,
        maxX: blockLocation.x + 1,
        minY: blockLocation.y,
        maxY: blockLocation.y + 1,
        minZ: blockLocation.z,
        maxZ: blockLocation.z + 1
    }

    let entryDistance = -Infinity
    let exitDistance = Infinity
    let entryNormal = { x: 0, y: 0, z: 0 }

    const x = processAxis(from.x, direction.x, bounds.minX, bounds.maxX, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })
    if (!x) return undefined
    if (x.entryDistance > entryDistance) {
        entryDistance = x.entryDistance
        entryNormal = x.entryNormal
    }
    exitDistance = Math.min(exitDistance, x.exitDistance)

    const y = processAxis(from.y, direction.y, bounds.minY, bounds.maxY, { x: 0, y: -1, z: 0 }, { x: 0, y: 1, z: 0 })
    if (!y) return undefined
    if (y.entryDistance > entryDistance) {
        entryDistance = y.entryDistance
        entryNormal = y.entryNormal
    }
    exitDistance = Math.min(exitDistance, y.exitDistance)

    const z = processAxis(from.z, direction.z, bounds.minZ, bounds.maxZ, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 })
    if (!z) return undefined
    if (z.entryDistance > entryDistance) {
        entryDistance = z.entryDistance
        entryNormal = z.entryNormal
    }
    exitDistance = Math.min(exitDistance, z.exitDistance)

    if (entryDistance > exitDistance) return undefined
    if (exitDistance < RAY_EPSILON) return undefined

    const distance = Math.max(entryDistance, RAY_EPSILON)
    const location = add(from, multiply(direction, distance))

    return {
        location,
        normal: entryNormal,
        distance
    }
}

function processAxis(origin, direction, min, max, minNormal, maxNormal) {
    if (Math.abs(direction) < 0.000001) {
        if (origin < min || origin > max) {
            return undefined
        }

        return {
            entryDistance: -Infinity,
            exitDistance: Infinity,
            entryNormal: { x: 0, y: 0, z: 0 }
        }
    }

    const minDistance = (min - origin) / direction
    const maxDistance = (max - origin) / direction

    if (minDistance < maxDistance) {
        return {
            entryDistance: minDistance,
            exitDistance: maxDistance,
            entryNormal: minNormal
        }
    }

    return {
        entryDistance: maxDistance,
        exitDistance: minDistance,
        entryNormal: maxNormal
    }
}

function getEntityHit(dimension, from, direction, maxDistance, caster, isFirstSegment, casterId) {
    const candidates = dimension.getEntities({
        location: from,
        maxDistance: maxDistance + 2
    })

    let closestHit
    for (const entity of candidates) {
        if (isFirstSegment && isCasterEntity(entity, caster, casterId)) continue
        if (entity.typeId === 'minecraft:item') continue

        const families = getEntityFamilies(entity)
        if (families.includes('untargetable')) continue
        if (families.includes('furniture')) continue

        const hit = getEntityRayHit(entity, from, direction, maxDistance)
        if (!hit) continue
        if (!closestHit || hit.distance < closestHit.distance) closestHit = hit
    }

    return closestHit
}

function getEntityRayHit(entity, from, direction, maxDistance) {
    const points = getEntityTargetPoints(entity)
    let closestHit

    for (const point of points) {
        const toPoint = subtract(point, from)
        const projection = dot(toPoint, direction)
        if (projection < RAY_EPSILON || projection > maxDistance + RAY_EPSILON) continue

        const closestPoint = add(from, multiply(direction, projection))
        const missDistance = vectorDistance(point, closestPoint)
        if (missDistance > ENTITY_HIT_RADIUS) continue

        const hit = {
            entity,
            location: closestPoint,
            distance: projection
        }
        if (!closestHit || hit.distance < closestHit.distance) closestHit = hit
    }

    return closestHit
}

function getEntityTargetPoints(entity) {
    const points = []
    try {
        points.push(entity.getHeadLocation())
    } catch { }

    if (entity.location) {
        points.push(entity.location)
        points.push({
            x: entity.location.x,
            y: entity.location.y + 1,
            z: entity.location.z
        })
    }

    return points
}

/**
 * Направление удара лучом по жертве (последний сегмент path до entity).
 * Для area — сегмент из areaRayPaths, ближайший к жертве.
 * Если путь не найден — направление взгляда кастера.
 */
export function getRayImpactDirection(spellData, victim) {
    const caster = spellData?.initiator
    const fallback = () => caster?.getViewDirection?.() ?? { x: 0, y: 0, z: 1 }

    let victimPoint
    try {
        victimPoint = victim.getHeadLocation()
    } catch {
        victimPoint = victim.location
    }

    if (spellData?.isAreaSpell && spellData.areaRayPaths?.length) {
        let bestSegment
        let bestDistance = Infinity

        for (const rayPath of spellData.areaRayPaths) {
            const segment = rayPath.find(s => s.type === 'entity')
            if (!segment) continue

            const dist = vectorDistance(segment.to, victimPoint)
            if (dist < bestDistance) {
                bestDistance = dist
                bestSegment = segment
            }
        }

        if (bestSegment && bestDistance < 3) {
            return directionFromSegment(bestSegment)
        }
    }

    const path = spellData?.rayCast?.path
    if (path?.length) {
        const entitySegment = [...path].reverse().find(s => s.type === 'entity')
        if (entitySegment) {
            return directionFromSegment(entitySegment)
        }
    }

    return fallback()
}

function directionFromSegment(segment) {
    const dir = subtract(segment.to, segment.from)
    const normalized = normalize(dir)
    if (length(normalized) === 0) return { x: 0, y: 0, z: 1 }
    return normalized
}

function isCasterEntity(entity, caster, casterId) {
    if (!entity || !caster) return false
    if (entity === caster) return true

    const entityId = gDP(entity, 'id')
    if (casterId !== undefined && entityId !== undefined && casterId === entityId) return true

    return entity?.typeId === 'minecraft:player'
        && caster?.typeId === 'minecraft:player'
        && entity?.name === caster?.name
}

function reflect(direction, normal) {
    return normalize(subtract(direction, multiply(normal, 2 * dot(direction, normal))))
}

function normalize(vector) {
    const vectorLength = length(vector)
    if (vectorLength === 0) return { x: 0, y: 0, z: 0 }
    return {
        x: vector.x / vectorLength,
        y: vector.y / vectorLength,
        z: vector.z / vectorLength
    }
}

function length(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
}

function vectorDistance(a, b) {
    return length(subtract(a, b))
}

function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    }
}

function subtract(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    }
}

function multiply(vector, multiplier) {
    return {
        x: vector.x * multiplier,
        y: vector.y * multiplier,
        z: vector.z * multiplier
    }
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z
}