import { ItemStack, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { md5 } from "./arxLib/converters";

export class Rob {
    // Ui that recounts all available items as buttons with item names
    static openUI(initiator, victim) {
        const form = new ActionFormData()
            .title(`Robbing ${victim.RPName}`)

        // Get all items in victim's inventory. Equipment first, then inventory
        const victimItems = this.collectAllItems(victim)
        const itemsMap = new Map()

        let iteration = 0
        for (const item of victimItems) {
            itemsMap.set(iteration, this.getUniqueItemStackId(item))
            form.button({ translate: item.localizationKey })
            iteration++
        }

        form.show(initiator).then((r) => {
            if (!r.canceled) {
                const selectedHash = itemsMap.get(r.selection)
                this.stealItem(initiator, victim, selectedHash)
            }
        })
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
                        equipComp.setEquipment(slot, undefined)
                        initiator?.sendMessage('§aSuccessfully stolen!')
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
                        victimInv.setItem(i, undefined)
                        initiator?.sendMessage('§aSuccessfully stolen!')
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