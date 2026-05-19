import { ssDP } from '../../DPOperations';
import { findSpell } from '../findSpell';
import { checkForItem } from '../../checkForItem';
import { spellRegistry } from './_spellRegistry';

export function dinHijo(targetPlayer, channels, spellData) {

    let messageStart = spellData.targetRaw === 1 ? 'У меня в' : 'У цели в'
    let playerToCheck = spellData.targets[0]

    if (!spellData.castingOnSelf) {
        if (checkForItem(targetPlayer, 'Legs', 'arx:amul_of_concealment')) { // Амулет блокирования Din Hijo
            spellData.initiator.sendMessage(`§e${targetPlayer.getDynamicProperty('name')} блокирует моё заклинание запроса!`)
            targetPlayer.sendMessage(`§e${spellData.initiator.getDynamicProperty('name')} пытался узнать мои заготовленые заклинания!`)

            targetPlayer.runCommand('particle arx:din_hijo_block ~ ~1.5 ~')
            targetPlayer.runCommand('playsound din_hijo_block @a ~ ~ ~')

            return undefined
        }
    }

    for (let i = 1; i <= channels; i++) { // Итерируемся по каналам
        const spellSequence = findSpell(playerToCheck, i, 'sequence');
        const spellDescription = spellRegistry[spellSequence]?.description
        const message = spellDescription
            ? `${messageStart} §d${i}§f канале заготовлено §6${spellDescription}`
            : `${messageStart} §d${i}§f канале не заготовлено заклинаний`
        spellData.initiator.sendMessage(message)

    }
    ssDP(spellData.initiator, 'hasEverCastedDinHijo', true)
}