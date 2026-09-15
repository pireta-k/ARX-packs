import { acquireTrait, checkForTrait } from "../traits/traitsOperations"
import { sDP, iDP, gDP } from "../arxLib/DPOperations"
import { sl, fl } from '../lang/fetchLocalization'
import { consumeFiolix } from "./fiolix"

// Potions, alcohol and consumables with unusual effect

// === Example for potionsRegistry ===
// 'arx:potion': (player => {
//     Function
// }),

export const potionsRegistry = {
    // === ALCOHOL ===
    'arx:ale': (p => p.addEffect('regeneration', 160)),
    'arx:beer': (p => p.addEffect('regeneration', 300)),
    'arx:cider': (p => p.addEffect('speed', 400)),
    'arx:mead': (p => iDP(p, 'stress', -300)),
    'arx:rum': (p => iDP(p, 'MPSmoothAccrue', 15)),
    'arx:vodka': (p => {
        p.addEffect('strength', 400)
        p.addEffect('nausea', 600)
    }),
    'arx:wine': (p => p.addEffect('night_vision', 400)),

    // === POTIONS ===
    'arx:potion_blindness': (p => p.addEffect('blindness', 600)),
    'arx:potion_blindness_d_upgrade': (p => p.addEffect('blindness', 3600)),

    'arx:potion_happiness': (p => iDP(p, 'stress', -1000)),
    'arx:potion_happiness_p_upgrade': (p => iDP(p, 'stress', -2000)),

    'arx:potion_haste': (p => p.addEffect('haste', 3600)),
    'arx:potion_haste_d_upgrade': (p => p.addEffect('haste', 9600)),
    'arx:potion_haste_p_upgrade': (p => p.addEffect('haste', 3600, { amplifier: 1 })),

    'arx:potion_instant_mp': (p => iDP(p, 'MPSmoothAccrue', 30)),
    'arx:potion_instant_mp_p_upgrade': (p => iDP(p, 'MPSmoothAccrue', 90)),

    'arx:potion_mp_max': (p => sDP(p, 'maxMPBonusFromPotion', 180)),
    'arx:potion_mp_max_d_upgrade': (p => sDP(p, 'maxMPBonusFromPotion', 480)),
    'arx:potion_mp_max_p_upgrade': (p => sDP(p, 'maxMPBonusFromPotionImproved', 180)),

    'arx:potion_mp_regen': (p => sDP(p, 'MPRegenBonusFromPotion', 180)),
    'arx:potion_mp_regen_d_upgrade': (p => sDP(p, 'MPRegenBonusFromPotion', 480)),
    'arx:potion_mp_regen_p_upgrade': (p => sDP(p, 'MPRegenBonusFromPotionImproved', 180)),

    'arx:potion_no_freezing': (p => sDP(p, 'freezingBlockByPotion', 300)),
    'arx:potion_no_freezing_d_upgrade': (p => sDP(p, 'freezingBlockByPotion', 1200)),

    'arx:potion_perm_mp_max': (p => processPermanentPotion(p, 'arx:potion_perm_mp_max')),
    'arx:potion_perm_mp_regen': (p => processPermanentPotion(p, 'arx:potion_perm_mp_regen')),
    'arx:potion_perm_weight_limit_bonus': (p => processPermanentPotion(p, 'arx:potion_perm_weight_limit_bonus')),

    'arx:potion_remove_negative_effects': (p => {
        p.removeEffect('slowness')
        p.removeEffect('mining_fatigue')
        p.removeEffect('instant_damage')
        p.removeEffect('nausea')
        p.removeEffect('blindness')
        p.removeEffect('hunger')
        p.removeEffect('weakness')
        p.removeEffect('poison')
        p.removeEffect('fatal_poison')
        p.removeEffect('wither')
        p.removeEffect('darkness')
        p.removeEffect('infested')
        p.removeEffect('oozing')
        p.removeEffect('weaving')
        p.removeEffect('wind_charged')
    }),

    'arx:potion_stress': (p => iDP(p, 'stress', 1000)),
    'arx:potion_stress_p_upgrade': (p => iDP(p, 'stress', 2000)),

    'arx:potion_trait_negative': (p => acquireTrait(p, [0, 0, 1])),
    'arx:potion_trait_neutral': (p => acquireTrait(p, [0, 1, 0])),
    'arx:potion_trait_positive': (p => acquireTrait(p, [1, 0, 0])),

    'arx:potion_weight_limit_bonus': (p => sDP(p, 'weighLimitBonusByPotion', 180)),
    'arx:potion_weight_limit_bonus_d_upgrade': (p => sDP(p, 'weighLimitBonusByPotion', 480)),
    'arx:potion_weight_limit_bonus_p_upgrade': (p => sDP(p, 'weighLimitBonusByPotionImproved', 180)),

    // === OTHER ===
    'arx:le_fishe_au_chocolat': (p => {
        p.runCommand(`playsound le_fishe_au_chocolat @s ~ ~ ~ 0.5`)
    }),
    'arx:fiolix': (p => {
        consumeFiolix(p, 150)
    }),
    'arx:iron_pie': (p => {
        sl(p, 'food.iron_pie')
        p.runCommand(`effect @s fatal_poison infinite 255 true`)
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