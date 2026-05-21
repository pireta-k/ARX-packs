import { ssDP } from "../../arxLib/DPOperations"
import { getScore, setScore } from '../../arxLib/scoresOperations'
import { sl } from "../../lang/fetchLocalization"

// Рассеивание заклинаний
export function dispelMagic(entity, targetData) {

    let dispelledAnything = false
    for (const spellDP of spellsToDispelDPs) {
        if (entity.getDynamicProperty(spellDP) > 1) {
            ssDP(entity, spellDP, 1)
            dispelledAnything = true
        }
        if (getScore(entity, 'mark') > 0) {
            setScore(entity, 'mark', 0)
            dispelledAnything = true
        }
    }
    // Партиклы и звуки
    if (dispelledAnything) {
        entity.dimension.playSound('spell.dispell_magic', entity.location)
        entity.dimension.spawnParticle('arx:dispell_magic', entity.getHeadLocation())
    } else if (targetData.initiator?.name === entity?.name) {
        sl(targetData.initiator, 'magic.dispel_magic.no_magic_on_self')
    }
}

const spellsToDispelDPs = [
    'speedBoost:level0',
    'speedBoost:level1',
    'speedBoost:level2',
    'speedBoost:level3',
    'shootingBoostBySpell_plus2',
    'shootingBoostBySpell_plus4',
    'shootingBoostBySpell_minus2',
    'shootingBoostBySpell_minus4',
    'allowArchilight',
    'allowMagilight'
]