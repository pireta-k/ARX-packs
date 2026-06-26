import { ActionFormData } from "@minecraft/server-ui"
import { spellRegistry } from '../magic/spells/_spellRegistry'
import { fl } from "../lang/fetchLocalization"

// Выводим экранчик с известными заклинаниями
export function knownSpellsBook(p) {
    const form = new ActionFormData()
        .title(fl(p, 'info.knownSpells.title'))

    let spellsArray = []
    // Переменные о известных заклинаниях хранятся в DP в виде ksb:cipher (cipher - шифровка заклинания)
    Object.keys(spellRegistry).forEach(spell => {
        const knownSpellDP = `ksb:${spellRegistry[spell].cipher}`
        const isKnown = p.getDynamicProperty(knownSpellDP)
        if (isKnown) {
            // Push and decorate spell string
            spellsArray.push(`§d${decorateSpellText(spell)}§f: §o§7${spellRegistry[spell].description}`)
        }
    })

    let body = spellsArray.length === 0
        ? (fl(p, 'info.knownSpells.no_discovered_spells') + '\n\n')
        : (fl(p, 'info.knownSpells.num_of_known_spells', [spellsArray.length]) + '\n\n')

    body += spellsArray.join('\n§7======================§f\n')

    form.body(body)
    form.show(p)
}

// Edit spell string to make it more stylish
function decorateSpellText(spell) {
    let spellArr = spell.split(' ')

    // Capitalize
    spellArr = spellArr.map(word => word.charAt(0).toUpperCase() + word.slice(1))

    // Paint
    const firstRuneColor = '§d'
    const basicColor = '§f'
    const firstRune = spellArr[0]
    spellArr[0] = firstRuneColor + firstRune + basicColor

    return spellArr.join(' ')
}