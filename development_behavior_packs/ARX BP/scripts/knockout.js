import { Player, system, world } from "@minecraft/server";
import { sl } from "./lang/fetchLocalization";
import { sendItems } from "./items/sendItems";
import { sDP, iDP } from "./arxLib/DPOperations";
import { wipeSkillsProgress } from "./skillsOperations"

export class Knockout {
    /**
     * Checks, if a player is fully valid
     * @param {Player} p 
     * @returns {Boolean}
     */
    static isValidForKnockoutOperations(p) {
        if (!p?.isValid || !(p instanceof Player) || ['Creative', 'Spectator'].includes(p.getGameMode())) {
            return false
        }

        return true
    }

    /**
     * Knockout a player. The root enter-knockout function that manages all minor logic
     * @param {Player} p 
     */
    static async enter(p) {
        system.run(() => {
            console.warn(p.RPName + ' has entered knockout')

            // Check
            if (!this.isValidForKnockoutOperations(p)) {
                return
            }

            // Report to player
            if (p.getDynamicProperty('hasEverBeenKnocked') !== true) {
                sDP(p, 'hasEverBeenKnocked', true)
                sl(p, 'knockout.first')
            }

            // Set HP
            p.getComponent('minecraft:health').setCurrentValue(2)

            sDP(p, 'blockingResistanceCD', 0)

            // Set slot blockers
            p.runCommand(`give @s arx:slot_blocker 35 0 {"item_lock": { "mode": "lock_in_slot" } }`)

            // Чистим данные о маги-фонарях
            sDP(p, 'allowMagilight', 0)
            sDP(p, 'allowArchilight', 0)

            // Выставляем данные о ноке
            p.setProperty('arx:is_knocked', true)
            p.runCommand('event entity @s arx:enter_knockout')

            // Очищаем прогресс навыков
            const difficulty = world.getDifficulty()
            if (['Hard', 'Normal'].includes(difficulty)) {
                wipeSkillsProgress(p)
            }

            // Выставляем вариант анимации нокаута
            p.setProperty('arx:is_knocked_anim_var', Math.floor(Math.random() * 2))

            // Сбрасываем камеру
            p.runCommand('camera @s clear')

            // Плюсуем счётчик нокаутов
            p.runCommand('scoreboard players add @s count_death 1')

            // Стрессуем
            iDP(p, 'stress', 4000)

            // Выставляем откат нокаута
            sDP(p, 'respawnDelay', 40 - p.getDynamicProperty('skill:fortitude_level') * 2)
        })
    }

    /**
     * Exit knockout
     * @param {Player} p 
     */
    static async exit(p) {

    }

    /**
     * Die completely and irretrievably
     * @param {Player} p 
     */
    static async RPDeath(p) {

        p.runCommand('effect @s clear')
        p.runCommand('playsound mob.rat_eliminator.spawn @s ~ ~ ~')
        p.runCommand('event entity @s arx:exit_knockout')

        p.runCommand('inputpermission set @s movement enabled')
        p.runCommand('inputpermission set @s camera enabled')

        sDP(p, 'freezing', 0)
        sDP(p, 'respawnDelay', 0)

        sDP(p, 'wetness', 0)

        if (p.getProperty('arx:is_ghost') === true) { // Если призрак

            console.warn(`Смерть призрака ${p.name}`)

            p.runCommand('title @s title §c= Вы окончательно погибли =')
            p.runCommand(`tellraw @s { "rawtext": [ { "text": "§cТак и закончилась эта история. Вы погибли навсегда." } ] }`)
            p.setProperty('arx:is_ghost', false)
            p.setProperty('arx:bust_size', 0)
            executeCommandDelayed(p, 'function knockout_system/data_wipe/_wipe_main')
            executeCommandDelayed(p, 'clear @s')
            executeCommandDelayed(p, 'function tp/1_lobby')

            // Сносим переменные DP
            p.clearDynamicProperties()
            registerpVars(p)

            sDP(p, 'verify', true)

        } else { // Если не призрак

            console.warn(`Смерть непризначного ${p.name}`)

            p.runCommand('title @s title §c= Вы обращены в призрака =')
            executeCommandDelayed(p, 'effect @s invisibility 60 0 true')
            executeCommandDelayed(p, 'spreadps ~ ~ 0 20 @s')
            executeCommandDelayed(p, 'clear @s arx:slot_blocker')
            sDP(p, 'ghostUltimateResistance', 180)

            p.runCommand(`tellraw @s { "rawtext": [ { "text": "§c! §f§сВы убиты и обращены в §cПРИЗРАКА!§f.\n§c! §fВы §cСОВСЕМ НЕДОЛГО§f неуязвимы к солнцу и воде!\n§c! §fВы невидимы на протяжении минуты." } ] }`)
            p.setProperty('arx:is_ghost', true)
        }
    }
}