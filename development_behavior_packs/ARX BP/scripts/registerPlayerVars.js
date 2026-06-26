import { gDP, sDP } from "./arxLib/DPOperations"
import { registeredSkills } from "./skillsOperations"

// Эта функция устанавливает игроку значения переменных в дефолтные
export function registerPlayerVars(player) {
    for (let skill in registeredSkills) {
        if (gDP(player, `skill:${skill}_level`) === undefined) {
            sDP(player, `skill:${skill}_level`, 0)
        }
        if (gDP(player, `skill:${skill}_progress`) === undefined) {
            sDP(player, `skill:${skill}_progress`, 0.0)
        }
    }

    // Каналы магии
    for (let i = 1; i < 11; i++) {
        if (gDP(player, `channel_${i}_rune_sequence`) === undefined) {
            sDP(player, `channel_${i}_rune_sequence`, '')
        }
        if (gDP(player, `channel_${i}_target`) === undefined || gDP(player, `channel_${i}_target`) > 2) {
            sDP(player, `channel_${i}_target`, 1)
        }
    }

    // Бусты скорости
    for (let i = 0; i < 4; i++) {
        if (gDP(player, `speedBoost:level${i}`) === undefined) {
            sDP(player, `speedBoost:level${i}`, 0)
        }
    }

    if (gDP(player, "mp") === undefined) {
        sDP(player, "mp", 1000)
    }
    if (gDP(player, "myRule:showAttackCDMode") === undefined) {
        sDP(player, "myRule:showAttackCDMode", "secondsFloat")
    }
    if (gDP(player, "myRule:manaDisplayMode") === undefined) {
        sDP(player, "myRule:manaDisplayMode", "integers")
    }
    if (gDP(player, "myRule:canSeeServerSpeedInInfoBook") === undefined) {
        sDP(player, "myRule:canSeeServerSpeedInInfoBook", false)
    }
    if (gDP(player, "myRule:chatPrefixes") === undefined) {
        sDP(player, "myRule:chatPrefixes", 'fullEN')
    }
    if (gDP(player, "attackCD") === undefined) {
        sDP(player, "attackCD", 0)
    }
    if (gDP(player, "overLoading") === undefined) {
        sDP(player, "overLoading", 0)
    }
    if (gDP(player, "prohibit_damage") === undefined) {
        sDP(player, "prohibit_damage", 0)
    }
    if (gDP(player, "MPPermanentBonus") === undefined) {
        sDP(player, "MPPermanentBonus", 0)
    }
    if (gDP(player, "magicTarget") === undefined) {
        sDP(player, "magicTarget", 1)
    }
    if (gDP(player, "freezing") === undefined) {
        sDP(player, "freezing", 0)
    }
    if (gDP(player, "freezingBlockByPotion") === undefined) {
        sDP(player, "freezingBlockByPotion", 0)
    }
    if (gDP(player, "heatingBlockByPotion") === undefined) {
        sDP(player, "heatingBlockByPotion", 0)
    }
    if (gDP(player, "scrollOfHealingCD") === undefined) {
        sDP(player, "scrollOfHealingCD", 0)
    }
    if (gDP(player, "hasRegisteredCharacter") === undefined) {
        sDP(player, "hasRegisteredCharacter", false)
    }
    if (gDP(player, "autoHPRegenCD") === undefined) {
        sDP(player, "autoHPRegenCD", 60)
    }
    if (gDP(player, "is_whispering") === undefined) {
        sDP(player, "is_whispering", false)
    }
    if (gDP(player, "verify") === undefined) {
        sDP(player, "verify", false)
    }
    if (gDP(player, "statistics:distance") === undefined) {
        sDP(player, "statistics:distance", 0)
    }
    if (gDP(player, "height") === undefined) {
        sDP(player, "height", 180)
    }
    if (gDP(player, 'ghostWithering') === undefined) {
        sDP(player, 'ghostWithering', 0)
    }
    if (gDP(player, 'ghostWitheringLevel') === undefined) {
        sDP(player, 'ghostWitheringLevel', 0)
    }
    if (gDP(player, 'ghostUltimateResistance') === undefined) {
        sDP(player, 'ghostUltimateResistance', 0)
    }

    if (gDP(player, 'reviveDelay') === undefined) {
        sDP(player, 'reviveDelay', 0)
    }
    if (gDP(player, 'respawnDelay') === undefined) {
        sDP(player, 'respawnDelay', 0)
    }
    if (gDP(player, 'camera:activeCamera') === undefined) {
        sDP(player, 'camera:activeCamera', false)
    }
    if (gDP(player, 'camera:tickCountdownToNextTimecode') === undefined) {
        sDP(player, 'camera:tickCountdownToNextTimecode', 0)
    }
    if (gDP(player, 'camera:numOfProcessedTimecodes') === undefined) {
        sDP(player, 'camera:numOfProcessedTimecodes', 0)
    }
    if (gDP(player, 'speedBoostAfterKnockout') === undefined) {
        sDP(player, 'speedBoostAfterKnockout', 0)
    }

    if (gDP(player, 'stress') === undefined) {
        sDP(player, 'stress', 0)
    }
    if (gDP(player, 'stressLevel') === undefined) {
        sDP(player, 'stressLevel', 0)
    }
    if (gDP(player, 'stressDynamic') === undefined) {
        sDP(player, 'stressDynamic', 0)
    }
    if (gDP(player, 'characterLifeSec') === undefined) {
        sDP(player, 'characterLifeSec', 0)
    }
    if (gDP(player, 'MPSmoothAccrue') === undefined) {
        sDP(player, 'MPSmoothAccrue', 0)
    }
    if (gDP(player, 'eatenLeFisheCounter') === undefined) {
        sDP(player, 'eatenLeFisheCounter', 0)
    }
    if (gDP(player, 'holdedMagicChannel') === undefined) {
        sDP(player, 'holdedMagicChannel', 1)
    }
    if (gDP(player, 'wetness') === undefined) {
        sDP(player, 'wetness', 0)
    }
    if (gDP(player, 'anticheat:autoclick_tracker') === undefined) {
        sDP(player, 'anticheat:autoclick_tracker', 0)
    }
    if (gDP(player, 'foodCD') === undefined) {
        sDP(player, 'foodCD', 0)
    }

    if (gDP(player, 'playTimeSec') === undefined) sDP(player, 'playTimeSec', 0)
    if (gDP(player, 'playTimeMin') === undefined) sDP(player, 'playTimeMin', 0)
    if (gDP(player, 'playTimeH') === undefined) sDP(player, 'playTimeH', 0)
}