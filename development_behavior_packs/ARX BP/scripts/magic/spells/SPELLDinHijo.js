import { sDP } from '../../arxLib/DPOperations';
import { findSpell } from '../findSpell';
import { checkForItem } from '../../items/checkForItem';
import { spellRegistry } from './_spellRegistry';
import { fl, sl } from '../../lang/fetchLocalization';

export function dinHijo(targetPlayer, channels, spellData) {

    let playerToCheck = spellData.targets[0]

    if (!spellData.castingOnSelf) {
        if (checkForItem(targetPlayer, 'Legs', 'arx:amul_of_concealment')) { // Амулет блокирования Din Hijo
            sl(spellData.initiator, 'magic.din_hijo.blocked_initiator', [targetPlayer.getDynamicProperty('name')])
            sl(targetPlayer, 'magic.din_hijo.blocked_target', [spellData.initiator.getDynamicProperty('name')])

            targetPlayer.runCommand('particle arx:din_hijo_block ~ ~1.5 ~')
            targetPlayer.runCommand('playsound din_hijo_block @a ~ ~ ~')

            return undefined
        }
    }

    for (let i = 1; i <= channels; i++) { // Итерируемся по каналам
        const spellSequence = findSpell(playerToCheck, i, 'sequence');
        const spellDescription = spellRegistry[spellSequence]?.description
        const localeContext = spellData.targetRaw === 1 ? 'self' : 'target'
        const textId = spellDescription
            ? `magic.din_hijo.prepared.${localeContext}`
            : `magic.din_hijo.empty.${localeContext}`
        const message = fl(spellData.initiator, textId, [i, spellDescription])
        spellData.initiator.sendMessage(message)

    }
    sDP(spellData.initiator, 'hasEverCastedDinHijo', true)
}