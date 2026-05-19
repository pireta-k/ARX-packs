import { ActionFormData } from "@minecraft/server-ui"
import { spellRegistry } from '../magic/spells/_spellRegistry'

// Выводим экранчик с известными заклинаниями
export function knownSpellsBook(player) {
    const form = new ActionFormData()
        .title("Открытые заклинания")

    let body = 'Когда вы сотворите новое заклинание,\nоно автоматически появится тут!\n\n'

    let spellsArray = []
    // Переменные о известных заклинаниях хранятся в DP в виде ksb:cipher (cipher - шифровка заклинания)
    Object.keys(spellRegistry).forEach(spell => {
        const knownSpellDP = `ksb:${spellRegistry[spell].cipher}`
        const isKnown = player.getDynamicProperty(knownSpellDP)
        if (isKnown) {
            spellsArray.push(`§d${decorateSpellText(spell)}§f: ${spellRegistry[spell].description}`)
        }
    })
    body += `Вы знаете §d${spellsArray.length}§f заклинаний\n\n`
    body += spellsArray.join('\n§7======================§f\n')

    form.body(body)
    form.show(player)
}

function decorateSpellText(spell) {
    let spellArr = spell.split(' ')
    let color = '§f'
    switch (spellArr[0]) {
        case 'kon': color = '§c'; break
        case 'sin': color = '§a'; break
        case 'san': color = '§e'; break
        case 'din': color = '§d'; break
    }
    spellArr[0] = color + spellArr[0] + '§v'

    return spellArr.join(' ')
}