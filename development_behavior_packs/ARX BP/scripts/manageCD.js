// Возвращает true, если можно начать кд, иначе false

import { ItemComponentTypes, ItemCooldownComponent, Player } from "@minecraft/server";
import { getItem } from "./items/getItem";

/**
 * If an item has a cooldown, start it
 * @param {Player} player 
 * @returns {boolean} - returns true if CD was sucessfully started
 */
export function manageCD(player) {
    const item = getItem(player, 'mainhand')
    if (!item) {
        console.warn('Called ManageCD without an item')
        return false
    }

    /** @type {ItemCooldownComponent} */
    const cooldownComponent = item.getComponent(ItemComponentTypes.Cooldown)
    if (!cooldownComponent) {
        console.warn('Called ManageCD with an item without cooldown component with id: ' + item.typeId)
        return false
    }

    const remainingCD = player.getItemCooldown(cooldownComponent.cooldownCategory)

    if (remainingCD === 0) {
        cooldownComponent.startCooldown(player)
        return true
    } else return false
}