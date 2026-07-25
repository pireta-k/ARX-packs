import { Player, system, world, ItemStack } from "@minecraft/server";
import { sl } from "./lang/fetchLocalization";
import { sendItems } from "./items/sendItems";
import { sDP, iDP, DPManager } from "./arxLib/DPOperations";
import { wipeSkillsProgress } from "./skillsOperations"
import { random } from "./arxLib/random";

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

            // Input Permissions
            this.applyInputPermissionOnEnter(p)

            // Report to player
            if (p.getDynamicProperty('hasEverBeenKnocked') !== true) {
                sDP(p, 'hasEverBeenKnocked', true)
                sl(p, 'knockout.first')
            }

            // Set HP
            p.getComponent('minecraft:health').setCurrentValue(2)

            sDP(p, 'blockingResistanceCD', 0)

            // Set slot blockers
            this.setBlockersInAllEmptySlots(p)

            // Чистим данные о маги-фонарях
            sDP(p, 'allowMagilight', 0)
            sDP(p, 'allowArchilight', 0)

            // Передаём сущности данные о нокауте
            p.triggerEvent('arx:enter_knockout')

            // Очищаем прогресс навыков
            const difficulty = world.getDifficulty()
            if (['Hard', 'Normal'].includes(difficulty)) {
                wipeSkillsProgress(p)
            }

            // Выставляем вариант анимации нокаута
            p.setProperty('arx:is_knocked_anim_var', random.int(0, 1))

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

    static applyInputPermissionOnEnter(p) {
        p.inputPermissions.setPermissionCategory(1, false)
        p.inputPermissions.setPermissionCategory(2, false)
    }

    static applyInputPermissionOnExit(p) {
        p.inputPermissions.setPermissionCategory(1, false)
        p.inputPermissions.setPermissionCategory(2, false)
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
        console.warn('RPDeath applies on: ' + p.RPName)

        p.runCommand('effect @s clear')
        p.triggerEvent('arx:exit_knockout')

        this.applyInputPermissionOnExit(p)

        p.runCommand('title @s title §c= Вы окончательно погибли =')
        p.runCommand(`tellraw @s { "rawtext": [ { "text": "§cТак и закончилась эта история. Вы погибли навсегда." } ] }`)
        p.setProperty('arx:bust_size', 0)
        executeCommandDelayed(p, 'function knockout_system/data_wipe/_wipe_main')
        executeCommandDelayed(p, 'clear @s')
        p.teleport({ x: -9999.5, y: 4, z: -9999.5 }, { dimension: world.getDimension('minecraft:overworld') })

        // Сносим переменные DP
        DPManager.clearOnRPDeath(p)
        registerpVars(p)

        sDP(p, 'verify', true)
    }

    /**
     * Automatically detects all empty slots in a player's inventory 
     * and fills them with a locked 'arx:slot_blocker' item.
     * @param {import("@minecraft/server").Player} player
     */
    static setBlockersInAllEmptySlots(player) {
        const invComp = player.getComponent("minecraft:inventory");
        if (!invComp?.container) return;

        const container = invComp.container;

        // Loop through all slots in the main inventory
        for (let i = 0; i < container.size; i++) {
            const currentItem = container.getItem(i);

            // If the slot is empty, generate and force a locked blocker item into it
            if (currentItem === undefined) {
                try {
                    container.setItem(i, this.getBlockerItem());
                } catch (error) {
                    console.error(`Failed to set item lock in slot ${i}: ${error.message}`);
                }
            }
        }
    }

    static getBlockerItem() {
        const item = new ItemStack("arx:slot_blocker", 1)
        item.lockMode = "slot"
        return item
    }
}