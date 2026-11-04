import { getScore } from "./arxLib/scoresOperations"
import { checkForTrait } from './traits/traitsOperations'
import { gDP, sDP } from "./arxLib/dp"
import { XP } from "./skills"
import { getItem } from "./items/getItem"
import { weightLimitRingsList } from "./items/lists"

export function weighAnalysis(player) {
    // weighLimit - ограничение переносимого веса, при переходе за который накладывается штраф
    let weighLimit = 4

    const feetItemId = getItem(player, 'feet')?.typeId
    const legsItemId = getItem(player, 'legs')?.typeId
    const offhandItemId = getItem(player, 'offhand')?.typeId

    // Bags
    switch (feetItemId) {
        case "arx:leg_bag": weighLimit += 1; break;
        case "arx:leg_bag_dual": weighLimit += 2; break;
    }
    switch (legsItemId) {
        case "arx:belt_bag": weighLimit += 1; break;
        case "arx:big_bag": weighLimit += 8; break;
        case "arx:default_bag": weighLimit += 4; break;
        case "arx:mini_bag": weighLimit += 2; break;
    }

    // Rings
    if (feetItemId in weightLimitRingsList) weighLimit += weightLimitRingsList[feetItemId]
    if (offhandItemId in weightLimitRingsList) weighLimit += weightLimitRingsList[offhandItemId]


    if (gDP(player, 'weighLimitBonusByPotion', 0) > 0) weighLimit += 2
    if (gDP(player, 'weighLimitBonusByPotionImproved', 0) > 0) weighLimit += 6

    // From perma potions
    weighLimit += (gDP(player, 'weightLimitPermanentBonus', 0) / 2)

    if (checkForTrait(player, 'powerful')) weighLimit += 1
    weighLimit += XP.getLevel(player, 'endurance')
    if (gDP(player, 'statsBonusByFiolix', 0) > 0) weighLimit += 2

    // Stress
    const stressLevel = gDP(player, 'stressLevel', 0)
    if (stressLevel == 4) { weighLimit -= 4 }
    else if (stressLevel == 3) { weighLimit -= 2 }
    else if (stressLevel == 2) { weighLimit -= 1 }
    else if (stressLevel == -2) { weighLimit += 1 }
    else if (stressLevel == -3) { weighLimit += 2 }
    else if (stressLevel == -4) { weighLimit += 3 }

    // weighLoading - фактическая загруженность игрока
    player.runCommand('function javascript/weigh')

    // Get weighLoading, calculated in "function javascript/weigh"
    let weighLoading = getScore(player, 'weighLoading')
    // От переносимого игрока
    if (player.hasRiders) {
        // Player's butt weight
        weighLoading += 3
        // Grant a weight from a carried player
        const carriedPlayer = player.riders[0]
        if (carriedPlayer) {
            weighLoading += getScore(carriedPlayer, "weighLoading")
        }
    }

    // Отправляем значения в dynamicProperty
    sDP(player, 'weighLimit', weighLimit)
    sDP(player, 'weighLoading', weighLoading)
    const overLoading = weighLoading - weighLimit
    sDP(player, 'overLoading', overLoading)
}