import { spellRegistry } from './spells/_spellRegistry';
import { gDP } from '../arxLib/DPOperations';

/** Function receives a player and a channel, and returns the spell recorded in it
* returnType can be 'sequence' or 'cipher'
* @param {Player} player
* @param {Number} activeChannel
* @param {String} returnType
* @returns
*/

export function findSpell(player, activeChannel, returnType = 'cipher') {

    // Validate returnType argument
    if (!['cipher', 'sequence'].includes(returnType)) {
        console.warn(`Invalid returnType argument used in function findSpell: ${returnType}`)
        return undefined
    }

    // The player's magic channel variable stores the sequence of rune ciphers, e.g., ADAHBC
    const runeSequence = gDP(player, `channel_${activeChannel}_rune_sequence`)

    // The player didn't use any runes yet
    if (!runeSequence) return

    // All spells that are ready in the channel
    let found_spells = []

    // Find the ready longest spell
    for (const spell of Object.keys(spellRegistry)) {
        if (runeSequence.startsWith(spellRegistry[spell].cipher)) {
            found_spells.push(spell)
        }
    }

    // No spells found
    if (found_spells.length === 0) return undefined
    
    // Find longest ready spell
    const ready_spell = found_spells.reduce((longest, current) =>
        spellRegistry[current].cipher.length > spellRegistry[longest].cipher.length
            ? current
            : longest
    )

    // console.warn(`found: ${found_spells}, result: ${ready_spell}`)

    // Return
    if (returnType === 'sequence') return ready_spell // Return the spell name string
    if (returnType === 'cipher') return spellRegistry[ready_spell].cipher // Return the spell cipher
}