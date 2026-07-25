import { acquireTrait, checkForTrait } from "../traits/traitsOperations"
import { sDP, iDP, gDP } from "../arxLib/DPOperations"
import { sl, fl } from '../lang/fetchLocalization'

// Potions, alcohol and consumables with unusual effect

// === Example for potionsRegistry ===
// 'arx:potion': (player => {
//     Function
// }),

export const potionsRegistry = {
    // === ALCOHOL ===
    'arx:ale': (player => player.addEffect('regeneration', 160)),
    'arx:beer': (player => player.addEffect('regeneration', 300)),
    'arx:cider': (player => player.addEffect('speed', 400)),
    'arx:mead': (player => iDP(player, 'stress', -300)),
    'arx:rum': (player => iDP(player, 'MPSmoothAccrue', 15)),
    'arx:vodka': (player => {
        player.addEffect('strength', 400)
        player.addEffect('nausea', 600)
    }),
    'arx:wine': (player => player.addEffect('night_vision', 400)),

    // === POTIONS ===
    'arx:potion_blindness': (player => player.addEffect('blindness', 600)),
    'arx:potion_blindness_d_upgrade': (player => player.addEffect('blindness', 3600)),

    'arx:potion_happiness': (player => iDP(player, 'stress', -1000)),
    'arx:potion_happiness_p_upgrade': (player => iDP(player, 'stress', -2000)),

    'arx:potion_haste': (player => player.addEffect('haste', 3600)),
    'arx:potion_haste_d_upgrade': (player => player.addEffect('haste', 9600)),
    'arx:potion_haste_p_upgrade': (player => player.addEffect('haste', 3600, { amplifier: 1 })),

    'arx:potion_instant_mp': (player => iDP(player, 'MPSmoothAccrue', 30)),
    'arx:potion_instant_mp_p_upgrade': (player => iDP(player, 'MPSmoothAccrue', 90)),

    'arx:potion_mp_max': (player => sDP(player, 'maxMPBonusFromPotion', 180)),
    'arx:potion_mp_max_d_upgrade': (player => sDP(player, 'maxMPBonusFromPotion', 480)),
    'arx:potion_mp_max_p_upgrade': (player => sDP(player, 'maxMPBonusFromPotionImproved', 180)),

    'arx:potion_mp_regen': (player => sDP(player, 'MPRegenBonusFromPotion', 180)),
    'arx:potion_mp_regen_d_upgrade': (player => sDP(player, 'MPRegenBonusFromPotion', 480)),
    'arx:potion_mp_regen_p_upgrade': (player => sDP(player, 'MPRegenBonusFromPotionImproved', 180)),

    'arx:potion_no_freezing': (player => sDP(player, 'freezingBlockByPotion', 300)),
    'arx:potion_no_freezing_d_upgrade': (player => sDP(player, 'freezingBlockByPotion', 1200)),

    'arx:potion_perm_mp_max': (player => processPermanentPotion(player, 'arx:potion_perm_mp_max')),
    'arx:potion_perm_mp_regen': (player => processPermanentPotion(player, 'arx:potion_perm_mp_regen')),
    'arx:potion_perm_weight_limit_bonus': (player => processPermanentPotion(player, 'arx:potion_perm_weight_limit_bonus')),

    'arx:potion_remove_negative_effects': (player => {
        player.removeEffect('slowness')
        player.removeEffect('mining_fatigue')
        player.removeEffect('instant_damage')
        player.removeEffect('nausea')
        player.removeEffect('blindness')
        player.removeEffect('hunger')
        player.removeEffect('weakness')
        player.removeEffect('poison')
        player.removeEffect('fatal_poison')
        player.removeEffect('wither')
        player.removeEffect('darkness')
        player.removeEffect('infested')
        player.removeEffect('oozing')
        player.removeEffect('weaving')
        player.removeEffect('wind_charged')
    }),

    'arx:potion_stress': (player => iDP(player, 'stress', 1000)),
    'arx:potion_stress_p_upgrade': (player => iDP(player, 'stress', 2000)),

    'arx:potion_trait_negative': (player => acquireTrait(player, [0, 0, 1])),
    'arx:potion_trait_neutral': (player => acquireTrait(player, [0, 1, 0])),
    'arx:potion_trait_positive': (player => acquireTrait(player, [1, 0, 0])),

    'arx:potion_weight_limit_bonus': (player => sDP(player, 'weighLimitBonusByPotion', 180)),
    'arx:potion_weight_limit_bonus_d_upgrade': (player => sDP(player, 'weighLimitBonusByPotion', 480)),
    'arx:potion_weight_limit_bonus_p_upgrade': (player => sDP(player, 'weighLimitBonusByPotionImproved', 180)),

    // === OTHER ===
    'arx:le_fishe_au_chocolat': (player => {
        player.runCommand(`playsound le_fishe_au_chocolat @s ~ ~ ~ 0.5`)
    }),
    'arx:fiolix': (player => {
        // ?
    }),
    'arx:iron_pie': (player => {
        sl(player, 'food.iron_pie')
        player.runCommand(`effect @s fatal_poison infinite 255 true`)
    }),
}

// Use permanent potion
function processPermanentPotion(player, stackId) {
    if (!stackId in permanentBonuses) return

    const usesCounterDP = 'permCounter:' + stackId
    const usesCounter = gDP(player, usesCounterDP) ?? 0

    const maxUses = permanentBonuses[stackId]['maxUses']
    const allow = usesCounter < maxUses

    if (allow) {
        iDP(player, permanentBonuses[stackId]['DPToIncrease'])
        iDP(player, usesCounterDP)
        sl(player, 'potion.perm.used')
        const howManyCanDrinkMore = maxUses - usesCounter - 1
        if (howManyCanDrinkMore > 0) sl(player, 'potion.perm.can_use_more', [howManyCanDrinkMore])
        else sl(player, 'potion.perm.cannot_drink_more')
    }
    else {
        sl(player, 'potion.perm.drank_over_limit')
    }
}

// Key - potion id, value - data
const permanentBonuses = {
    'arx:potion_perm_mp_max': {
        maxUses: 10,
        DPToIncrease: 'MPPermanentBonus'
    },
    'arx:potion_perm_mp_regen': {
        maxUses: 10,
        DPToIncrease: 'MPRegenPermanentBonus'
    },
    'arx:potion_perm_weight_limit_bonus': {
        maxUses: 6,
        DPToIncrease: 'weightLimitPermanentBonus'
    },
}

export function onPotionConsume(player, itemStack) {

    const potionId = itemStack.typeId
    if (!potionId in potionsRegistry) return

    // Run code
    potionsRegistry[potionId](player)
}