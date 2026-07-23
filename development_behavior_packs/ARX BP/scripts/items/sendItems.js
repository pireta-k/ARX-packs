import { EquipmentSlot } from "@minecraft/server";

/**
 * Передает инвентарь, броню и левую руку от entity1 в обычный инвентарь entity2
 * @param {import("@minecraft/server").Entity} entity1 - Сущность-отправитель
 * @param {import("@minecraft/server").Entity} entity2 - Сущность-получатель (контейнер)
 * @param {Object} [options] - Дополнительные параметры
 * @param {boolean} [options.skipLocked=false] - Пропускать ли заблокированные предметы
 * @param {boolean} [options.sendEquipment=true] - Переносить ли слоты экипировки (броня и offhand)
 */
export function sendItems(entity1, entity2, options = {}) {
    if (!entity1 || !entity2) return;

    // Деструктуризация параметров с установкой значений по умолчанию
    const { skipLocked = false, sendEquipment = true } = options;

    const invComp1 = entity1.getComponent("minecraft:inventory");
    const invComp2 = entity2.getComponent("minecraft:inventory");
    const equipComp1 = entity1.getComponent("minecraft:equippable");

    if (!invComp2?.container) return; // Нет контейнера для приёма — сразу выходим
    const targetContainer = invComp2.container;

    // Универсальный обработчик для безопасного перемещения одного предмета
    const transferItem = (item, clearCallback) => {
        if (!item) return;
        
        // Проверка блокировки
        if (skipLocked && (item.lockMode === "slot" || item.lockMode === "inventory")) return;

        // Пытаемся добавить копию в цель
        const leftover = targetContainer.addItem(item.clone());
        
        // Если предмет полностью поместился (нет остатка), очищаем исходный слот
        if (!leftover) {
            clearCallback(undefined);
        } else {
            clearCallback(leftover); // Если забился, возвращаем остаток в исходный слот
        }
    };

    // 1. Перенос основного инвентаря
    if (invComp1?.container) {
        const sourceContainer = invComp1.container;
        for (let i = 0; i < sourceContainer.size; i++) {
            transferItem(sourceContainer.getItem(i), (newValue) => sourceContainer.setItem(i, newValue));
        }
    }

    // 2. Перенос брони и левой руки (выполняется только если опция включена)
    if (sendEquipment && equipComp1) {
        const slots = [
            EquipmentSlot.Head, 
            EquipmentSlot.Chest, 
            EquipmentSlot.Legs, 
            EquipmentSlot.Feet, 
            EquipmentSlot.Offhand
        ];
        for (const slot of slots) {
            transferItem(equipComp1.getEquipment(slot), (newValue) => equipComp1.setEquipment(slot, newValue));
        }
    }
}
