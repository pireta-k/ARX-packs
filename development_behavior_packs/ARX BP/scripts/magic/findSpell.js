import { spellRegistry } from './spells/_spellRegistry';

/** Функция получает игрока и канал, и возвращает записанное в него заклинание
 * returnType может быть 'sequence' или 'cipher'
 * @param {Player} player 
 * @param {Number} activeChannel 
 * @param {String} returnType
 * @returns 
 */

export function findSpell(player, activeChannel, returnType = 'cipher') {

    // Проверка корректности аргумента returnType
    if (!['cipher', 'sequence'].includes(returnType)) {
        console.warn(`Использован недопустимый аргумент returnType в функции findSpell: ${returnType}`)
        return undefined
    }

    // Записаная в переменной канала магии игрока последовательность из шифровки рун, рнапример ADAHBC
    const runeSequence = player.getDynamicProperty(`channel_${activeChannel}_rune_sequence`)

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
    if (returnType === 'sequence') return ready_spell // Возвращаем строку заклинания
    if (returnType === 'cipher') return spellRegistry[ready_spell].cipher // Возвращаем шифр заклинания
}