import { world, system } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"
import { getEntitiesInCube } from '../core/music_core'
import { iDP, sDP } from "../arxLib/DPOperations"

// Взаимодействуем с мечом призыва демона
export function interactWithViciousDemonSpawner(player) {
    if (!world.getDynamicProperty('vicious_demon:is_fight_right_now')) {
        const form = new ActionFormData()
            .title("Бой с Порочным Демоном")
            .body('Начать бой с §aПорочным Демоном?')
            .button("Начать бой", 'textures/ui/bosses/vicious_demon/start_battle')
            .button("Отменить", 'textures/ui/bosses/vicious_demon/pass')

            .show(player)
            .then((response) => {
                if (response.selection === 0) {
                    startBattleWithViciousDemon()
                    world.getDimension('minecraft:overworld').runCommand('particle arx:vicious_demon_spawn_flame_inward -2239 26 1854')
                }
            })
    }
}

// Стартуем бой с порочным демоном?
export function startBattleWithViciousDemon() {
    sDP(world, 'vicious_demon:cd_before_battle', 6)
    sDP(world, 'vicious_demon:is_fight_right_now', true)
    door('close')

    const entities = getEntitiesInCube([-2252, 32, 1843], [-2227, 22, 1866])
    for (const entity of entities) {
        if (entity.typeId === 'minecraft:player') {
            entity.runCommand('effect @s darkness 3 0 true')
        }
    }
}

function endBattleWithViciousDemon() {
    sDP(world, 'vicious_demon:is_fight_right_now', false)
    door('open')

    const entities = getEntitiesInCube([-2252, 32, 1843], [-2227, 22, 1866])
    for (const entity of entities) {
        if (entity.typeId === 'arx:vicious_demon') {
            entity.remove()
        }
    }
}

// Закрываем/открываем ворота
function door(action) {
    if (action === 'close') {
        world.getDimension('minecraft:overworld').runCommand('fill -2239 25 1843 -2239 26 1843 arx:bronze_block')
        world.getDimension('minecraft:overworld').runCommand('fill -2252 25 1855 -2252 27 1853 arx:bronze_block')
    }
    else if (action === 'open') {
        world.getDimension('minecraft:overworld').runCommand('fill -2239 25 1843 -2239 26 1843 air')
        if (world.getDynamicProperty('vicious_demon:hasEverDefeated') === true) {
            world.getDimension('minecraft:overworld').runCommand('fill -2252 25 1855 -2252 27 1853 air')
        }
    }
}

// Тикаем и анализируем что происходит (10 tps)
system.runInterval(() => {
    // Если откат до спавна демона больше нуля
    if (world.getDynamicProperty('vicious_demon:cd_before_battle') > 0) {
        if (world.getDynamicProperty('vicious_demon:cd_before_battle') === 1) {
            world.getDimension('minecraft:overworld').runCommand('summon arx:vicious_demon -2239 25 1854 facing @p main_stage_redirect_start')
            world.getDimension('minecraft:overworld').runCommand('particle arx:vicious_demon_spawn_flame_outward -2239 26 1854')
        }

        iDP(world, 'vicious_demon:cd_before_battle', -1)
    }

    // Обработка тех, кто в локации демона
    const entities = getEntitiesInCube([-2252, 32, 1843], [-2227, 22, 1866])

    // Запускаем анализ демона
    for (const entity of entities) {
        if (entity.typeId === 'arx:vicious_demon') {
            world.getDimension('minecraft:overworld').runCommand('function core_parts_NAP/vicious_demon_analysis')
        }
    }
    // Проверяем, есть ли игроки
    let playersInLocation = false

    for (const entity of entities) {
        if (entity.typeId === 'minecraft:player') {
            if (entity.getProperty('arx:is_knocked') === false) {
                playersInLocation = true
            }
        }
    }
    if (!playersInLocation) {
        endBattleWithViciousDemon()
    }
}, 10)


world.afterEvents.entityDie.subscribe((dieEvent) => {
    if (dieEvent.deadEntity.typeId === "arx:vicious_demon") {
        sDP(world, 'vicious_demon:hasEverDefeated', true)
        endBattleWithViciousDemon()

        const entities = getEntitiesInCube([-2252, 32, 1843], [-2227, 22, 1866])
        for (const entity of entities) {
            if (entity.typeId === "minecraft:player") {
                entity.sendMessage("§dПорочный демон побеждён!\n§6§l--- §aШансы выпадения:\n§r§d10Ũ §aПорочная пика §c[Мифическое+]\n§d10Ũ §aПорочный посох §c[Мифическое+]\n§d10Ũ §aПорочный кинжал §c[Мифическое+]\n§d20Ũ §aРуна nakamata §c[Мифическое++]\n§d100Ũ §aСущность порочного демона §c[Мифическое++]\n§d4Ũ §aКомпозитный пиломеч демона §c[Мифическое+++]\n§d100Ũ 1-3 §aЭссенция опыта §g[Эпическое]")
            }
        }
    }
})

world.afterEvents.entityRemove.subscribe((removeEvent) => {
    if (removeEvent.typeId === "arx:vicious_demon") {
        endBattleWithViciousDemon()
    }
})