import { getScore, setScore } from '../../arxLib/scoresOperations'
import { sl } from "../../lang/fetchLocalization"

// Рассеивание заклинаний
export function dispelEffects(entity, targetData) {

    const dispelledAnything = entity.getEffects().length > 0

    // Партиклы и звуки
    if (dispelledAnything) {
        entity.dimension.playSound('spell.dispell_magic', entity.location)
        entity.dimension.spawnParticle('arx:dispell_effects', entity.getHeadLocation())
        entity.runCommand('effect @s clear')
    } else if (targetData.initiator?.name === entity?.name) {
        sl(targetData.initiator, 'magic.dispel_effects.no_effects_on_self')
    }
}