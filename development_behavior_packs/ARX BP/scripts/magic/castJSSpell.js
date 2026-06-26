// Imports
import { getNearestPlayer } from '../getNearestPlayer';
import { getEntityFamilies } from '../_main';
import { system, MolangVariableMap } from "@minecraft/server"
import { spellRegistry } from './spells/_spellRegistry';
import { checkForItem } from '../items/checkForItem';
import { gDP, sDP } from '../arxLib/DPOperations';
import { rayCast } from './rayCast';

// Создает и возвращает объект spellData, хранящий в себе всё, что может пригодиться в обработке заклинания
export function prepareSpellData(player, runeSequence) {
    // Vars
    const spellData = {}
    const spellObj = spellRegistry[runeSequence]
    const isRay = spellObj.rayCast !== false
    let spellDistance = undefined

    // === BASIC DATA ===

    // Initiator
    spellData.initiator = player

    // Определяем, по площади ли заклинание? Если оно содержит руну area, то по площади
    const isAreaSpell = runeSequence.includes("area")
    spellData.isAreaSpell = isAreaSpell

    // === RAY === 
    if (isRay) {
        // Range
        let spellDistance = defineCastDistance(player)
        spellData.spellDistance = spellDistance
        const rayCastResult = isAreaSpell ? undefined : rayCast(player, spellDistance)
        spellData.rayTarget = rayCastResult?.target
        spellData.rayCast = rayCastResult
        spellData.areaRayPaths = []
    }

    // === TARGETS ====
    {
        // Определяем объекты целей
        let targets = []

        // AREA spell
        if (isAreaSpell) {
            const areaTargetData = getAreaTargets(player, spellDistance)
            targets = areaTargetData.targets
            spellData['areaRayPaths'] = areaTargetData.paths
        }
        // RAY spell
        else if (isRay) {
            targets = spellData.rayTarget ? [spellData.rayTarget] : []
        }
        // ON-SELF spell
        else {
            targets = [player]
        }

        // Записываем в массив
        spellData['targets'] = targets

        // Создаем только если цель одна
        spellData['singleTarget'] = targets.length === 1 ? targets[0] : undefined
    }

    return spellData
}

// Find the max distance a spell be casted on
export function defineCastDistance(p) {
    let distance = 12 // Basic

    // Rings
    if (checkForItem(p, 'Offhand', 'arx:ring_aluminum_aquamarine')) distance += 1
    if (checkForItem(p, 'Feet', 'arx:ring_aluminum_aquamarine')) distance += 1
    if (checkForItem(p, 'Offhand', 'arx:ring_gold_aquamarine')) distance += 2
    if (checkForItem(p, 'Feet', 'arx:ring_gold_aquamarine')) distance += 2
    if (checkForItem(p, 'Offhand', 'arx:ring_naginitis_aquamarine')) distance += 3
    if (checkForItem(p, 'Feet', 'arx:ring_naginitis_aquamarine')) distance += 3
    if (checkForItem(p, 'Offhand', 'arx:ring_caryite_aquamarine')) distance += 4
    if (checkForItem(p, 'Feet', 'arx:ring_caryite_aquamarine')) distance += 4
    if (checkForItem(p, 'Offhand', 'arx:ring_malafiotironite_aquamarine')) distance += 5
    if (checkForItem(p, 'Feet', 'arx:ring_malafiotironite_aquamarine')) distance += 5
    if (checkForItem(p, 'Offhand', 'arx:ring_lamenite_aquamarine')) distance += 6
    if (checkForItem(p, 'Feet', 'arx:ring_lamenite_aquamarine')) distance += 6

    // Навык Дистанция заклинаний: +1 блок за уровень
    distance += gDP(p, 'skill:mp_range_level', 0)

    sDP(p, 'spellDistance', distance)
    return distance
}

/**
 * Основная функция вызова заклинания. 
 * Напрямую вызывает заклинание, не проверяя требуемые условия
 * Управляет всей внутренней логикой заклинания
 * @param {Player} player
 * @param {string} runeSequence
 */
export function castJSSpell(player, runeSequence, spellData = undefined) {
    // Получаем нужное нам заклинание из реестра
    const spell = spellRegistry[runeSequence];
    if (!spell) return 'noSpell'

    // Получем spellData
    spellData = spellData ?? prepareSpellData(player, runeSequence)

    spawnRayTrail(spellData, spell.color)

    if (spellData.targets.length === 0) return 'noValidEntity'

    // Вызов обработчика конкретного заклинания с нужными данными для каждой сущности
    let successfulCastsCounter = 0
    let wasWrongEntityType = false
    spellData['successfulTargets'] = []

    for (const entity of spellData.targets) {
        // Проверка onlyOnPlayers: true
        if (spell.onlyOnPlayers === true && entity.typeId !== 'minecraft:player') {
            wasWrongEntityType = true
            continue
        }

        // Активируем заклинание
        const responce = spell.handler(entity, spellData)
        spellData.successfulTargets.push(entity)
        successfulCastsCounter++
    }
    if (successfulCastsCounter === 0 && wasWrongEntityType) return 'wrongEntityType'
    return 'ok'
}

// Create spell trace
function spawnRayTrail(spellData, colorFromSpell) {
    if (spellData.isAreaSpell) {
        for (const rayPath of spellData.areaRayPaths ?? []) {
            spawnParticleTrail(spellData.initiator, colorFromSpell, 0.25, rayPath)
        }
        return
    }

    const rayPath = spellData.rayCast?.path
    if (rayPath?.length) {
        spawnParticleTrail(spellData.initiator, colorFromSpell, 0.25, rayPath)
    }
}

function spawnParticleTrail(initiator, colorFromSpell, delayTicks = 0.25, rayPath = undefined) {
    // Setting up a particle color
    const color = hexToParticleRgb(colorFromSpell) ?? { red: 1, green: 1, blue: 1 }
    const universalMolang = new MolangVariableMap()
    const smallMolang = new MolangVariableMap()
    universalMolang.setColorRGB('variable.color', color)
    smallMolang.setColorRGB('variable.color', softenColor(color, 0.45))

    if (rayPath?.length) {
        let delayOffset = 0
        for (const segment of rayPath) {
            delayOffset += spawnParticleTrailSegment(initiator, segment.from, segment.to, universalMolang, smallMolang, delayTicks, delayOffset)
        }
    }
}

function spawnParticleTrailSegment(initiator, p0, p1, universalMolang, smallMolang, delayTicks, delayOffset = 0) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const universalSteps = Math.max(2, Math.round(distance * 1))
    const smallSteps = Math.max(2, Math.round(distance * 2))

    // Big particles
    for (let i = 1; i <= universalSteps; i++) {
        const t = i / universalSteps;
        const x = p0.x + dx * t;
        const y = p0.y + dy * t;
        const z = p0.z + dz * t;

        system.runTimeout(() => {
            initiator.dimension.spawnParticle('arx:magic_trace_universal', { x, y, z }, universalMolang);
        }, delayOffset + (i - 1) * delayTicks);
    }

    // Small particles
    for (let i = 1; i <= smallSteps; i++) {
        const t = i / smallSteps;
        const x = p0.x + dx * t;
        const y = p0.y + dy * t;
        const z = p0.z + dz * t;

        system.runTimeout(() => {
            initiator.dimension.spawnParticle('arx:magic_trace_small', { x, y, z }, smallMolang);
        }, delayOffset + (i - 1) * delayTicks / 2);
    }

    return universalSteps * delayTicks
}

function hexToParticleRgb(hex) {
    if (hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { red: r, green: g, blue: b };
    }
}

function softenColor(color, strength = 0.5) {
    return {
        red: color.red * strength + (1 - strength),
        green: color.green * strength + (1 - strength),
        blue: color.blue * strength + (1 - strength)
    }
}

function getAreaTargets(player, spellDistance) {
    const targets = []
    const paths = []
    const from = player.getHeadLocation()
    const candidates = player.dimension.getEntities({ location: player.location, maxDistance: spellDistance })
        .filter(entity => !getEntityFamilies(entity).includes('furniture'))
        .filter(entity => !getEntityFamilies(entity).includes('untargetable'))

    for (const entity of candidates) {
        const visiblePoint = getVisibleEntityPoint(player, entity, from, spellDistance)
        if (!visiblePoint) continue

        targets.push(entity)
        if (!isSamePlayer(entity, player)) {
            paths.push([{ from, to: visiblePoint, type: 'entity' }])
        }
    }

    return { targets, paths }
}

function getVisibleEntityPoint(player, entity, from, spellDistance) {
    if (isSamePlayer(entity, player)) return from

    for (const point of getEntityTargetPoints(entity)) {
        const directionRaw = subtract(point, from)
        const distance = length(directionRaw)
        if (distance > spellDistance || distance === 0) continue

        const direction = normalize(directionRaw)
        let blockHit
        try {
            blockHit = player.dimension.getBlockFromRay(from, direction, {
                maxDistance: Math.max(0, distance - 0.2),
                includeLiquidBlocks: false,
                includePassableBlocks: false
            })
        } catch {
            blockHit = undefined
        }

        if (!blockHit?.block) return point
    }

    return undefined
}

function getEntityTargetPoints(entity) {
    const points = []
    try {
        points.push(entity.getHeadLocation())
    } catch { }

    if (entity.location) {
        points.push({
            x: entity.location.x,
            y: entity.location.y + 1,
            z: entity.location.z
        })
        points.push(entity.location)
    }

    return points
}

function isSamePlayer(entity, player) {
    return entity?.typeId === 'minecraft:player' && entity?.name === player?.name
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

function subtract(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    }
}