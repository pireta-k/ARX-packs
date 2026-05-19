// Imports
import { getNearestPlayer } from '../getNearestPlayer';
import { getEntityFamilies } from '../_main';
import { system, MolangVariableMap } from "@minecraft/server"
import { spellRegistry } from './spells/_spellRegistry';
import { checkForItem } from '../checkForItem';
import { ssDP } from '../DPOperations';

// Создает и возвращает объект spellData, хранящий в себе всё, что может пригодиться в обработке заклинания
function defineSpellData(player, runeSequence, currentTargetRaw) {
    let spellData = {}

    // 1 - на себя, 2 - по направлению взгляда
    if (![1, 2].includes(currentTargetRaw)) {
        console.log(`Получена неожиданная цель ${currentTargetRaw} в обработчике заклинаний для ${player.name}`)
    }

    // Определяем дальность действия заклинания
    let spellDistance = defineCastDistance(player)

    // Определяем, по площади ли заклинание? Если оно содержит руну area, то по площади
    const isAreaSpell = runeSequence.includes("area")

    // Определяем инициатора
    spellData['initiator'] = player

    // Определяем ближайшего игрока (БЛИЖАЙШЕГО! НЕ ОБЯЗАТЕЛЬНО ЦЕЛЬ ЗАКЛИНАНИЯ!)
    spellData['nearestPlayer'] = getNearestPlayer(player, spellDistance)

    // Определяем, используем ли мы закл на себя? (для быстрых запросов)
    spellData['castingOnSelf'] = currentTargetRaw == 1

    // Определяем цель
    spellData['targetRaw'] = currentTargetRaw

    // По площади ли заклинание?
    spellData['isAreaSpell'] = isAreaSpell

    // Определяем объекты целей
    let targets = []
    // Default spell
    if (!isAreaSpell) {
        // Cast on self
        if (currentTargetRaw === 1) {
            targets = [player]
        }
        // Cast forward
        else if (currentTargetRaw === 2) {
            const rayHits = player.getEntitiesFromViewDirection({ maxDistance: spellDistance, includeLiquidBlocks: false, includePassableBlocks: false })
                .filter(hit => hit.entity.name !== player.name) // Remove the caster, if he got to the raycast somehow
                .filter(hit => !getEntityFamilies(hit.entity).includes('untargetable'))

            // If we got no entites, try to find them via blockRayCast
            if (rayHits.length === 0) {

            }

            if (rayHits.length > 0) {
                // Находим hit с минимальной дистанцией
                const nearestHit = rayHits.reduce((closest, current) =>
                    current.distance < closest.distance ? current : closest
                )
                targets = [nearestHit.entity];
            }
        }
    }
    // Area spell
    else {
        // Get ALL entities is spell range
        if (currentTargetRaw === 1) {
            targets = player.dimension.getEntities({ location: player.location, maxDistance: spellDistance })
                .filter(entity => !getEntityFamilies(entity).includes('furniture'))
                .filter(entity => !getEntityFamilies(entity).includes('untargetable'))
        }
        // Get all entities, excluding the caster
        else {
            targets = player.dimension.getEntities({ location: player.location, maxDistance: spellDistance })
                .filter(entity => !getEntityFamilies(entity).includes('furniture'))
                .filter(entity => !getEntityFamilies(entity).includes('untargetable'))
                .filter(hit => hit.entity.name !== player.name)
        }
    }
    // Записываем в массив
    spellData['targets'] = targets

    // Создаем только если цель одна
    spellData['singleTarget'] = targets.length === 1 ? targets[0] : undefined

    // Всё составили, возвращаем
    return spellData
}

// Find the max distance a spell be casted on
export function defineCastDistance(p) {
    let distance = 10 // Basic

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

    ssDP(p, 'spellDistance', distance)
    return distance
}

/**
 * Основная функция вызова заклинания. 
 * Напрямую вызывает заклинание, не проверяя требуемые условия
 * Управляет всей внутренней логикой заклинания
 * @param {Player} player
 * @param {string} runeSequence
 */
export function castJSSpell(player, runeSequence, target) {
    // Получаем нужное нам заклинание из реестра
    const spell = spellRegistry[runeSequence];
    if (!spell) return 'noSpell'

    // Получем spellData
    const spellData = defineSpellData(player, runeSequence, target)

    // Проверка: поддерживает ли заклинание выбранную цель?
    if (spell.validTargets !== undefined && !spell.validTargets.includes(spellData.targetRaw)) {
        return 'noValidTarget'
    }

    // Вызов обработчика конкретного заклинания с нужными данными для каждой сущности
    if (spellData.targets.length > 0) {
        let successfulCastsCounter = 0
        let wasWrongEntityType = false

        for (const entity of spellData.targets) {
            // Проверка onlyOnPlayers: true
            if (spell.onlyOnPlayers === true && entity.typeId !== 'minecraft:player') {
                wasWrongEntityType = true
                continue
            }
            // Spell trail
            spawnParticleTrail(spellData.initiator, entity, spell.color)

            // Активируем заклинание
            spell.handler(entity, spellData)
            successfulCastsCounter++
        }
        if (successfulCastsCounter === 0 && wasWrongEntityType) return 'wrongEntityType'
        return 'ok'
    }
    else {
        return ('noValidEntity')
    }
}

// Create spell trace
function spawnParticleTrail(initiator, entity, colorFromSpell, delayTicks = 0.25) {
    let p0, p1;

    try {
        p0 = initiator.getHeadLocation();
        p1 = entity.getHeadLocation();
    } catch (e) {
        return;
    }

    // Setting up a particle color
    const molang = new MolangVariableMap()
    const color = hexToParticleRgb(colorFromSpell) ?? { red: 1, green: 1, blue: 1 }
    molang.setColorRGB('variable.color', color)

    // Finding the points where we have to draw the particles
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const steps = Math.max(2, Math.round(distance * 1)); // минимум 2 точки

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = p0.x + dx * t;
        const y = p0.y + dy * t;
        const z = p0.z + dz * t;

        system.runTimeout(() => {
            initiator.dimension.spawnParticle('arx:magic_trace_universal', { x, y, z }, molang);
        }, (i - 1) * delayTicks);
    }
}

function hexToParticleRgb(hex) {
    if (hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return { red: r, green: g, blue: b };
    }
}