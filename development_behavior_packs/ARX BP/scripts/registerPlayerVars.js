import { gDP, ssDP } from "./DPOperations"
import { registeredSkills } from "./skillsOperations"

// Эта функция устанавливает игроку значения переменных в дефолтные
export function registerPlayerVars(player) {
    for (let skill in registeredSkills) {
        if (gDP(player, `skill:${skill}_level`) === undefined) {
            ssDP(player, `skill:${skill}_level`, 0)
        }
        if (gDP(player, `skill:${skill}_progress`) === undefined) {
            ssDP(player, `skill:${skill}_progress`, 0.0)
        }
    }

    // Каналы магии
    for (let i = 1; i < 11; i++) {
        if (gDP(player, `channel_${i}_rune_sequence`) === undefined) {
            ssDP(player, `channel_${i}_rune_sequence`, '')
        }
        if (gDP(player, `channel_${i}_target`) === undefined || gDP(player, `channel_${i}_target`) > 2) {
            ssDP(player, `channel_${i}_target`, 1)
        }
    }

    // Бусты скорости
    for (let i = 0; i < 4; i++) {
        if (gDP(player, `speedBoost:level${i}`) === undefined) {
            ssDP(player, `speedBoost:level${i}`, 0)
        }
    }

    if (gDP(player, "mp") === undefined) {
        ssDP(player, "mp", 1000)
    }
    if (gDP(player, "myRule:showAttackCDMode") === undefined) {
        ssDP(player, "myRule:showAttackCDMode", "secondsFloat")
    }
    if (gDP(player, "myRule:manaDisplayMode") === undefined) {
        ssDP(player, "myRule:manaDisplayMode", "integers")
    }
    if (gDP(player, "myRule:canSeeServerSpeedInInfoBook") === undefined) {
        ssDP(player, "myRule:canSeeServerSpeedInInfoBook", false)
    }
    if (gDP(player, "myRule:chatPrefixes") === undefined) {
        ssDP(player, "myRule:chatPrefixes", 'fullEN')
    }
    if (gDP(player, "attackCD") === undefined) {
        ssDP(player, "attackCD", 0)
    }
    if (gDP(player, "overLoading") === undefined) {
        ssDP(player, "overLoading", 0)
    }
    if (gDP(player, "prohibit_damage") === undefined) {
        ssDP(player, "prohibit_damage", 0)
    }
    if (gDP(player, "MPPermanentBonus") === undefined) {
        ssDP(player, "MPPermanentBonus", 0)
    }
    if (gDP(player, "magicTarget") === undefined) {
        ssDP(player, "magicTarget", 1)
    }
    if (gDP(player, "freezing") === undefined) {
        ssDP(player, "freezing", 0)
    }
    if (gDP(player, "freezingBlockByPotion") === undefined) {
        ssDP(player, "freezingBlockByPotion", 0)
    }
    if (gDP(player, "heatingBlockByPotion") === undefined) {
        ssDP(player, "heatingBlockByPotion", 0)
    }
    if (gDP(player, "scrollOfHealingCD") === undefined) {
        ssDP(player, "scrollOfHealingCD", 0)
    }
    if (gDP(player, "hasRegisteredCharacter") === undefined) {
        ssDP(player, "hasRegisteredCharacter", false)
    }
    if (gDP(player, "autoHPRegenCD") === undefined) {
        ssDP(player, "autoHPRegenCD", 60)
    }
    if (gDP(player, "is_whispering") === undefined) {
        ssDP(player, "is_whispering", false)
    }
    if (gDP(player, "verify") === undefined) {
        ssDP(player, "verify", false)
    }
    if (gDP(player, "statistics:distance") === undefined) {
        ssDP(player, "statistics:distance", 0)
    }
    if (gDP(player, "height") === undefined) {
        ssDP(player, "height", 180)
    }
    if (gDP(player, 'ghostWithering') === undefined) {
        ssDP(player, 'ghostWithering', 0)
    }
    if (gDP(player, 'ghostWitheringLevel') === undefined) {
        ssDP(player, 'ghostWitheringLevel', 0)
    }
    if (gDP(player, 'ghostUltimateResistance') === undefined) {
        ssDP(player, 'ghostUltimateResistance', 0)
    }

    if (gDP(player, 'reviveDelay') === undefined) {
        ssDP(player, 'reviveDelay', 0)
    }
    if (gDP(player, 'respawnDelay') === undefined) {
        ssDP(player, 'respawnDelay', 0)
    }
    if (gDP(player, 'camera:activeCamera') === undefined) {
        ssDP(player, 'camera:activeCamera', false)
    }
    if (gDP(player, 'camera:tickCountdownToNextTimecode') === undefined) {
        ssDP(player, 'camera:tickCountdownToNextTimecode', 0)
    }
    if (gDP(player, 'camera:numOfProcessedTimecodes') === undefined) {
        ssDP(player, 'camera:numOfProcessedTimecodes', 0)
    }
    if (gDP(player, 'speedBoostAfterKnockout') === undefined) {
        ssDP(player, 'speedBoostAfterKnockout', 0)
    }

    if (gDP(player, 'stress') === undefined) {
        ssDP(player, 'stress', 0)
    }
    if (gDP(player, 'stressLevel') === undefined) {
        ssDP(player, 'stressLevel', 0)
    }
    if (gDP(player, 'stressDynamic') === undefined) {
        ssDP(player, 'stressDynamic', 0)
    }
    if (gDP(player, 'characterLifeSec') === undefined) {
        ssDP(player, 'characterLifeSec', 0)
    }
    if (gDP(player, 'MPSmoothAccrue') === undefined) {
        ssDP(player, 'MPSmoothAccrue', 0)
    }
    if (gDP(player, 'eatenLeFisheCounter') === undefined) {
        ssDP(player, 'eatenLeFisheCounter', 0)
    }
    if (gDP(player, 'holdedMagicChannel') === undefined) {
        ssDP(player, 'holdedMagicChannel', 1)
    }
    if (gDP(player, 'wetness') === undefined) {
        ssDP(player, 'wetness', 0)
    }
    if (gDP(player, 'anticheat:autoclick_tracker') === undefined) {
        ssDP(player, 'anticheat:autoclick_tracker', 0)
    }
    if (gDP(player, 'foodCD') === undefined) {
        ssDP(player, 'foodCD', 0)
    }

    if (gDP(player, 'playTimeSec') === undefined) ssDP(player, 'playTimeSec', 0)
    if (gDP(player, 'playTimeMin') === undefined) ssDP(player, 'playTimeMin', 0)
    if (gDP(player, 'playTimeH') === undefined) ssDP(player, 'playTimeH', 0)
}