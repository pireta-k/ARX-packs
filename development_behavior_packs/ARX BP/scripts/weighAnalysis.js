import { checkForItem } from "./items/checkForItem"
import { getScore } from "./arxLib/scoresOperations"
import { checkForTrait } from './traits/traitsOperations'
import { getNearestPlayer } from './getNearestPlayer'
import { gDP, sDP } from "./arxLib/DPOperations"

export function weighAnalysis(player) {
    // weighLimit - ограничение переносимого веса, при переходе за который накладывается штраф
    let weighLimit = 4
    // Сумки
    if (checkForItem(player, "Legs", "arx:belt_bag")) weighLimit += 1
    if (checkForItem(player, "Legs", "arx:big_bag")) weighLimit += 8
    if (checkForItem(player, "Legs", "arx:default_bag")) weighLimit += 4
    if (checkForItem(player, "Feet", "arx:leg_bag")) weighLimit += 1
    if (checkForItem(player, "Feet", "arx:leg_bag_dual")) weighLimit += 2
    if (checkForItem(player, "Legs", "arx:mini_bag")) weighLimit += 2
    // Кольца
    if (checkForItem(player, "Feet", "arx:ring_aluminum_cornelian")) weighLimit += 1
    if (checkForItem(player, "OffHand", "arx:ring_aluminum_cornelian")) weighLimit += 1
    if (checkForItem(player, "Feet", "arx:ring_gold_cornelian")) weighLimit += 2
    if (checkForItem(player, "OffHand", "arx:ring_gold_cornelian")) weighLimit += 2
    if (checkForItem(player, "Feet", "arx:ring_naginitis_cornelian")) weighLimit += 3
    if (checkForItem(player, "OffHand", "arx:ring_naginitis_cornelian")) weighLimit += 3
    if (checkForItem(player, "Feet", "arx:ring_caryite_cornelian")) weighLimit += 4
    if (checkForItem(player, "OffHand", "arx:ring_caryite_cornelian")) weighLimit += 4
    if (checkForItem(player, "Feet", "arx:ring_toliriite_cornelian")) weighLimit += 5
    if (checkForItem(player, "OffHand", "arx:ring_toliriite_cornelian")) weighLimit += 5
    if (checkForItem(player, "Feet", "arx:ring_lamenite_cornelian")) weighLimit += 6
    if (checkForItem(player, "OffHand", "arx:ring_lamenite_cornelian")) weighLimit += 6

    if (gDP(player, 'weighLimitBonusByPotion') > 0) weighLimit += 2
    if (gDP(player, 'weighLimitBonusByPotionImproved') > 0) weighLimit += 6

    // From perma potions
    weighLimit += ((gDP(player, 'weightLimitPermanentBonus') / 2) ?? 0)

    // От черты
    if (checkForTrait(player, 'powerful')) weighLimit += 1

    // Увеличение от прокачки
    weighLimit += (player.getDynamicProperty('skill:endurance_level') ?? 0)

    // Увеличение от бонуса фиоликса
    if (player.getDynamicProperty('statsBonusByFiolix') > 0) { weighLimit += 2 }

    // Воздействие стресса
    if (player.getDynamicProperty('stressLevel') == 4) { weighLimit -= 4 }
    if (player.getDynamicProperty('stressLevel') == 3) { weighLimit -= 2 }
    if (player.getDynamicProperty('stressLevel') == 2) { weighLimit -= 1 }
    if (player.getDynamicProperty('stressLevel') == -2) { weighLimit += 1 }
    if (player.getDynamicProperty('stressLevel') == -3) { weighLimit += 2 }
    if (player.getDynamicProperty('stressLevel') == -4) { weighLimit += 3 }

    // weighLoading - фактическая загруженность игрока
    player.runCommand('function javascript/weigh')

    let weighLoading = getScore(player, 'weighLoading')
    // От переносимого игрока
    if (player.hasTag('has_riders')) {
        weighLoading += 3
        // Передаем вес от носимого игрока
        const carriedPlayer = getNearestPlayer(player)
        if (carriedPlayer?.hasTag('is_riding')) {
            weighLoading += getScore(carriedPlayer, "weighLoading")
        }
    }

    // Отправляем значения в dynamicProperty
    sDP(player, 'weighLimit', weighLimit)
    sDP(player, 'weighLoading', weighLoading)
    sDP(player, 'overLoading', weighLoading - weighLimit)
}