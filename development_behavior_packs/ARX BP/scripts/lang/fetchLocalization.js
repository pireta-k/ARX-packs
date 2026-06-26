// Imports
import { ruLocalization } from './ru'
import { enLocalization } from './en'
import { sDP } from '../arxLib/DPOperations'

// Vars
export const defaultLanguage = 'en'
export const langMap = {
    'ru': ruLocalization,
    'en': enLocalization
}
const insertionsLimit = 64

/** Fetch Localization.
 * This functions takes a player and textId as input and returns requested text as output 
 * @param {Player} player 
 * @param {String} textId id of desired text. Looks like game.title.something
 * @param {Array} [insertions=[]] Insertions are words from array that we should insert in text. In raw text, they're marked as $0$, $1$ and so on. $ is special symbol for parcer, and num is an index of insertion in array. 
 * @returns {string}
*/
export function fl(player, textId, insertions = []) {

    // Wrong usage
    if (!player) {
        console.warn('Called fl() without player object')
        return
    }
    if (!textId) {
        console.warn(`Called fl() without textId object for player ${player.name}`)
        return
    }

    const langId = getPlayerLanguage(player)
    let returnText = ''

    returnText = langMap[langId][textId]
    // If we haven't found text and we don't use the default lang, try to use default lang.
    if (langId != defaultLanguage && !returnText) returnText = langMap[defaultLanguage][textId]

    if (!returnText) returnText = `§cNo localization for ${textId} in ${langId}§f`

    // Replace insertions with real text
    if (insertions.length > 0) { // If there are any insertions
        for (let i = 0; i < insertionsLimit; i++) { // Every iteration = parcing one insertion in returnText
            const first$ = returnText.indexOf('$')
            const second$ = returnText.indexOf('$', first$ + 1)
            if (first$ === -1 || second$ === -1) break // No insertions to parce
            const arrayIndexOfInsertion = +returnText.slice(first$ + 1, second$)
            if (isNaN(arrayIndexOfInsertion) || arrayIndexOfInsertion < 0 || arrayIndexOfInsertion > insertions.length - 1) break // Something unexpected with index
            const strWithInsertion = returnText.slice(0, first$) + insertions[arrayIndexOfInsertion] + returnText.slice(second$ + 1)
            returnText = strWithInsertion
        }
    }

    // Return
    return returnText
}

// Send localization
// This function is a convenient way to shortly use fl() and permanently send the text to the player as a message.
export function sl(player, textId, insertions = []) {
    player.sendMessage(fl(player, textId, insertions))
}

// Send chat-like message from system
// Send message from system. Automatically adds all prefixes
export function slfs(player, textId, insertions = []) {
    player.sendMessage('[§dSystem§f] > ' + fl(player, textId, insertions))
}

// Send chat-like message from guide
// Send message from guide. Automatically adds all prefixes
export function slfg(player, textId, insertions = []) {
    player.sendMessage('[§aGuide§f] > ' + fl(player, textId, insertions))
}

// Check existance of a lang key
// Returns bool
export function checkLocalization(key, language = defaultLanguage) {
    if (!Object.keys(langMap).includes(language)) {
        console.error(`checkLocalization(): non-existent language <${language}> given`)
    }
    return key in langMap[language]
}

// Returns player's language as 'en' or 'ru' etc.
// Returns default as fallback
export function getPlayerLanguage(player) {
    const language = player.getDynamicProperty('language')
    return language in langMap ? language : defaultLanguage
}

export function setPlayerLanguage(player, lang) {
    if (Object.keys(langMap).includes(lang)) {
        sDP(player, 'language', lang)
    }
    else {
        console.warn(`Attempt to set non-existent lang ${lang} to player`)
    }
}