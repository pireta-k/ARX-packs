import { EntityComponentTypes, EquipmentSlot } from "@minecraft/server";

export function checkForItem(player, strSlot, itemId) {
    const lowerSlot = strSlot.toLowerCase();

    // Новый слот: "any" — проверяет ВСЁ
    if (lowerSlot === "any") {
        // 1. Проверяем экипировку (голова, нагрудник, ноги, ступни, основная/вторая рука)
        const equippable = player.getComponent(EntityComponentTypes.Equippable);
        if (equippable) {
            const equipSlots = [
                EquipmentSlot.Head,
                EquipmentSlot.Chest,
                EquipmentSlot.Legs,
                EquipmentSlot.Feet,
                EquipmentSlot.Mainhand,
                EquipmentSlot.Offhand
            ];
            for (const slot of equipSlots) {
                const item = equippable.getEquipment(slot);
                if (item?.typeId === itemId) {
                    return true;
                }
            }
        }

        // 2. Проверяем весь инвентарь (включая хотбар и основной инвентарь)
        const inventory = player.getComponent(EntityComponentTypes.Inventory);
        if (inventory?.container) {
            for (let i = 0; i < inventory.container.size; i++) {
                const item = inventory.container.getItem(i);
                if (item?.typeId === itemId) {
                    return true;
                }
            }
        }

        return false;
    }

    // Отдельная обработка инвентаря (только контейнер, без экипировки)
    if (lowerSlot === "inventory") {
        const inventory = player.getComponent(EntityComponentTypes.Inventory);
        if (inventory?.container) {
            for (let i = 0; i < inventory.container.size; i++) {
                const item = inventory.container.getItem(i);
                if (item?.typeId === itemId) {
                    return true;
                }
            }
        }
        return false;
    }

    // Обработка экипировочных слотов
    let slot;
    switch (lowerSlot) {
        case "head":
            slot = EquipmentSlot.Head;
            break;
        case "chest":
            slot = EquipmentSlot.Chest;
            break;
        case "legs":
            slot = EquipmentSlot.Legs;
            break;
        case "feet":
            slot = EquipmentSlot.Feet;
            break;
        case "mainhand":
            slot = EquipmentSlot.Mainhand;
            break;
        case "offhand":
            slot = EquipmentSlot.Offhand;
            break;
        default:
            console.error(`Недопустимый слот: ${strSlot}`);
            return false;
    }

    const equippable = player?.getComponent(EntityComponentTypes.Equippable);
    if (!equippable) {
        return false;
    }

    const currentItem = equippable.getEquipment(slot);
    return currentItem?.typeId === itemId;
}