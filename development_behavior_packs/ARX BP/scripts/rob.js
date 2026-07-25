import { ItemStack, EquipmentSlot, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { md5 } from "./arxLib/converters";
import { sl, fl } from "./lang/fetchLocalization";
import { Knockout } from "./knockout";

export class Rob {
    // Ui that recounts all available items as buttons with item names
    static openUI(initiator, victim) {
        if (!this.checkRPConditions(initiator, victim)) return

        const form = new ActionFormData()
            .title(`Robbing ${victim.RPName}`)

        // Get all items in victim's inventory. Equipment first, then inventory
        const victimItems = this.collectAllItems(victim)
        const itemsMap = new Map()

        if (victimItems.length > 0) {
            let iteration = 0
            for (const item of victimItems) {
                itemsMap.set(iteration, this.getUniqueItemStackId(item))
                form.button({ translate: item.localizationKey })
                iteration++
            }
        }
        else form.body(fl(initiator, 'rob.nothing_to_steal'))

        initiator.sDP('isRobbingRightNow', true)
        initiator.sDP('robbingTargetID', victim.id)
        form.show(initiator).then((r) => {
            if (!r.canceled) {
                const selectedHash = itemsMap.get(r.selection)
                this.stealItem(initiator, victim, selectedHash)
            }

            initiator.sDP('isRobbingRightNow', false)
            initiator.sDP('robbingTargetID', undefined)
        })
    }

    /**
     * Check, can we rob a player?
     * @param {Player} initiator 
     * @param {Player} victim 
     * @returns {Boolean}
     */
    static checkRPConditions(initiator, victim) {
        let canRob = true
        if (!victim.getProperty('arx:is_knocked')) {
            sl(initiator, 'rob.cannot.victim_is_not_knocked', [], '§c')
            return false
        }
        if (initiator.getProperty('arx:is_knocked')) {
            sl(initiator, 'rob.cannot.you_are_knocked', [], '§c')
            return false
        }
        return true
    }

    /** @param {ItemStack} item  */
    static getUniqueItemStackId(item) {
        if (!item || !(item instanceof ItemStack)) {
            console.error('Trying to create a unique id for an invalid item')
            return undefined
        }

        let resultString = ''

        resultString += String(item.amount)
        resultString += item.typeId
        resultString += item.lockMode
        resultString += item.nameTag
        resultString += item.getComponent('minecraft:durability')?.damage

        // Return hash
        return md5(resultString)

    }

    /** 
     * Собирает все существующие предметы жертвы (сначала экипировка, потом инвентарь)
     * Пропускает предметы, заблокированные в слоте или инвентаре.
     * @param {import("@minecraft/server").Player} victim
     * @returns {import("@minecraft/server").ItemStack[]} Array of copies
     */
    static collectAllItems(victim) {
        const victimItems = [];

        // 1. Получаем экипировку (броня и левая рука)
        const equipComp = victim.getComponent("minecraft:equippable");
        if (equipComp) {
            const slots = [
                EquipmentSlot.Head,
                EquipmentSlot.Chest,
                EquipmentSlot.Legs,
                EquipmentSlot.Feet,
                EquipmentSlot.Offhand
            ];

            for (const slot of slots) {
                const item = equipComp.getEquipment(slot);
                if (item) {
                    // Если предмет заблокирован — полностью игнорируем его
                    if (item.lockMode === "slot" || item.lockMode === "inventory") continue;

                    victimItems.push(item.clone());
                }
            }
        }

        // 2. Получаем основной инвентарь
        const invComp = victim.getComponent("minecraft:inventory");
        if (invComp?.container) {
            const container = invComp.container;

            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (item) {
                    // Если предмет заблокирован — полностью игнорируем его
                    if (item.lockMode === "slot" || item.lockMode === "inventory") continue;

                    victimItems.push(item.clone());
                }
            }
        }

        return victimItems;
    }

    static stealItem(initiator, victim, itemHash) {
        if (!victim) {
            initiator?.sendMessage('§cVictim is no longer valid')
            return
        }
        if (!itemHash || typeof itemHash !== 'string') {
            initiator?.sendMessage('§cInvalid item hash')
            return
        }

        if (!this.checkRPConditions(initiator, victim)) return

        const robberInv = initiator.getComponent("minecraft:inventory")?.container
        if (!robberInv) return

        // Check equipment slots first
        const equipComp = victim.getComponent("minecraft:equippable")
        if (equipComp) {
            const slots = ["Head", "Chest", "Legs", "Feet", "Offhand"]
            for (const slot of slots) {
                const item = equipComp.getEquipment(slot)
                if (item && itemHash === this.getUniqueItemStackId(item)) {
                    const leftover = robberInv.addItem(item.clone())

                    if (!leftover) {
                        const itemToSet = victim.gDP('respawnDelay') ? Knockout.getBlockerItem() : undefined
                        equipComp.setEquipment(slot, itemToSet)
                        return
                    } else {
                        initiator?.sendMessage("§cYou don't have free space in your inventory")
                        return
                    }
                }
            }
        }

        // Check standard inventory second
        const victimInv = victim.getComponent("minecraft:inventory")?.container
        if (victimInv) {
            for (let i = 0; i < victimInv.size; i++) {
                const item = victimInv.getItem(i)
                if (item && itemHash === this.getUniqueItemStackId(item)) {
                    const leftover = robberInv.addItem(item.clone())

                    if (!leftover) {
                        const itemToSet = victim.gDP('respawnDelay') ? Knockout.getBlockerItem() : undefined
                        victimInv.setItem(i, itemToSet)
                        return
                    } else {
                        initiator?.sendMessage("§cYou don't have free space in your inventory")
                        return
                    }
                }
            }
        }

        // Fail-safe if the item was dropped or moved into a different stack size/state
        initiator?.sendMessage('§cItem is no longer valid')
    }

}