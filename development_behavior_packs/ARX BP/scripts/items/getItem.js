import { EntityComponentTypes, EquipmentSlot, ItemStack } from "@minecraft/server";
import { Cache } from '../arxLib/cache'
export const equippableCache = new Cache()

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} slot — 'helmet', 'chest', 'legs', 'feet', 'mainhand', 'offhand', 'equipment', или 'inventory'
 * @returns {ItemStack | ItemStack[] | undefined}
 */
export function getItem(player, slot) {
    const equippable = equippableCache.get(player, () => player.getComponent(EntityComponentTypes.Equippable))
    // const equippable = player.getComponent(EntityComponentTypes.Equippable)
    if (!equippable) return undefined;

    const singleSlotsMap = {
        helmet: EquipmentSlot.Head,
        chest: EquipmentSlot.Chest,
        legs: EquipmentSlot.Legs,
        feet: EquipmentSlot.Feet,
        mainhand: EquipmentSlot.Mainhand,
        offhand: EquipmentSlot.Offhand
    };

    if (slot in singleSlotsMap) {
        return equippable.getEquipment(singleSlotsMap[slot]);
    }

    if (slot === 'equipment') {
        return Object.values(singleSlotsMap).map(s => equippable.getEquipment(s)).filter(item => item !== undefined);
    }

    if (slot === 'inventory') {
        const container = player.getComponent("minecraft:inventory")?.container;
        if (!container) return [];
        const items = [];
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item) items.push(item);
        }
        return items;
    }

    console.error('getItem(): unknown slot provided: ' + slot)

    return undefined
}