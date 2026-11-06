// Imports
import { world, system, Entity, Player } from "@minecraft/server"
import { sl, fl } from "./lang/fetchLocalization"

import { runeCiphers } from './magic/rune_cipher_list'
import { cipherRuneSequence } from './magic/on_use_magic_items'

import { gDP, sDP } from "./arxLib/dp"
import { isAdmin, getAdmins } from './arxLib/admin'
import { NPCManager } from "./npcManager"
import { getDistanceBetween, getEntityFamilies } from "./_main"
import { random } from "./arxLib/random"
import { sPerm } from "./arxLib/shortcuts"
import { getItem } from "./items/getItem"

/**
 * @typedef ChatMessageOptions
 * @property {'local' | 'global' | 'shout' | 'whisper' | 'action'} [type]
 * @property {Boolean} [debug]
 * @property {Boolean} [contentIsLocalizationKey=false] - for Dynamic NPC (they usually talk with localization, not direct text)
 */

/**
 * Chat class
 */
export class Chat {
    /**
     * Arx Message class
     */
    static Message = class {
        #sourceEntity
        #originalText
        #clearDistance
        #style
        #isTransDimensional
        #fullDistance
        #targetEntities
        #formattingMap
        #messageTypeLangKey
        #entitiesMap

        /** 
         * @param {Entity} sourceEntity 
         * @param {String} content 
         * @param {ChatMessageOptions} [options] 
         */
        constructor(sourceEntity, content, options = {}) {

            if (!content && options.contentIsLocalizationKey) {
                console.warn('Trying to create a localization-type message with empty localization key')
            }

            /** @type {ChatProcessor} */
            this.options = options
            this.#sourceEntity = sourceEntity // An entity that sends a message
            this.#originalText = content // An original text from message without any modifications
            if (!options.contentIsLocalizationKey) this.#splitFormatting() // Assign formattingMap & rawText

            this.type = options.type ?? Chat.defaultMessageType
            if (!Chat.messageTypes.includes(this.type)) this.type = Chat.defaultMessageType

            switch (this.type) {
                case 'local': // <- Default type
                    this.#clearDistance = 12
                    this.#style = '§a'
                    break
                case 'global':
                    this.#clearDistance = Infinity
                    this.#style = '§c'
                    break
                case 'shout':
                    this.#clearDistance = 25
                    this.#style = '§v'
                    break
                case 'whisper':
                    this.#clearDistance = 3
                    this.#style = '§6'
                    break
                case 'action':
                    this.#clearDistance = 12
                    this.#style = '§b'
                    break
                default:
                    this.#clearDistance = 0
                    this.#style = ''
                    console.warn(`Unexpected message type: ${options.type}`)
            }

            this.#messageTypeLangKey = `chat.messageType.${this.type}`
            this.#isTransDimensional = this.#clearDistance === Infinity
            this.#fullDistance = this.#clearDistance * 2

            if (!this.#isTransDimensional) {
                this.#targetEntities = this.#sourceEntity.dimension.getEntities({
                    location: this.#sourceEntity.location,
                    maxDistance: this.#fullDistance
                }).filter(e => Chat.canHear(e))
            } else {
                this.#targetEntities = world.getEntitiesInAllDimensions().filter(e => Chat.canHear(e))
            }
            /** 
             * A Map that constains an entity and a text to send to this entity
             * @typedef {Map<Entity, String>}
             */
            this.#entitiesMap = new Map()
            for (const e of this.#targetEntities) {
                const isLocKey = options.contentIsLocalizationKey ?? false
                const text = isLocKey ? fl(e, content) : content
                let { messedText, isClear } = this.#applyMessing(text, e)
                messedText = this.#assembleFormatting(messedText)

                this.#entitiesMap.set(e, {
                    text: messedText,
                    isClear: isClear
                })
            }
        }

        /**
         * Get a raw text and styles from an original text. Styles always go with §, like §a
         * Needed for applying messing correctly. If we will apply messing on style, some visual bullshit will occur
         */
        #splitFormatting() {
            const formattingMap = new Map() // Key - index, value - letter.
            let result = this.#originalText

            while (true) {
                // Get an index of §
                const index = result.indexOf('§')
                if (index === -1) break

                // Protection of messages ending with §
                if (index + 1 >= result.length) {
                    // Just keep it and break
                    // If this IF has triggered, then it is the last cycle
                    break
                }

                formattingMap.set(index, result[index + 1])
                // Cut this out of result
                result = result.slice(0, index) + result.slice(index + 2)
            }

            this.#formattingMap = formattingMap
            this.rawText = result

            if (this.options.debug) console.warn("splitFormatting: " + result)
        }

        /**
         * Assemble style back. Returns the result
         * @param {String} text 
         * @returns {String}
         */
        #assembleFormatting(text) {
            // Check
            if (!this.#formattingMap || !this.#formattingMap.size || this.options.contentIsLocalizationKey) return text

            const reversedKeys = [...this.#formattingMap.keys()].sort((a, b) => b - a)
            for (const key of reversedKeys) { // Restore the formatting in the reversed order
                const symbol = this.#formattingMap.get(key)
                text = text.slice(0, key) + '§' + symbol + text.slice(key)
            }

            if (this.options.debug) console.warn("assembleFormatting: " + text)
            return text
        }

        /**
         * Returns a text with applied messing
         * Does not change length (for correct #assembleFormatting())
         * Works with this.rawText
         * @param {Entity} singleListener 
         * @returns {{text: String, isClear: Boolean}}
         */
        #applyMessing(text, singleListener) {
            if (this.#clearDistance === Infinity) return { messedText: text, isClear: true } // Infinity distance
            const defactoDistance = getDistanceBetween(this.#sourceEntity, singleListener)
            if (this.#clearDistance >= defactoDistance) return { messedText: text, isClear: true } // Clear distance
            // A distance is longer then clear but still ok to hear a speech
            const spoilFactor = (defactoDistance - this.#clearDistance) / this.#clearDistance // Value from 0 to 1
            const messSymbols = [...'■.?-']

            for (let i = 0; i < text.length; i++) {
                if (spoilFactor > random.random_0_to_1()) {
                    const desiredSymbol = random.element(messSymbols)
                    text = text.slice(0, i) + desiredSymbol + text.slice(i + 1)
                }
            }

            if (this.options.debug) console.warn("applyMessing: " + text)
            return { messedText: text, isClear: false }
        }

        /**
         * Sends this message to chat
         */
        send() {
            speechEmote(this.#sourceEntity, this.rawText)

            for (const [listener, { text, isClear }] of this.#entitiesMap) {
                if (this.options.debug) console.warn(`Processing a chat for ${listener.typeId}`)

                // Player recieves a message
                if (listener.typeId === 'minecraft:player') {
                    // Get message type
                    const typeFromLang = fl(listener, this.#messageTypeLangKey)
                    const typeText = listener.gDP('myRule:chatPrefixes') === 'short' ? typeFromLang[0] : typeFromLang

                    // Get souce name
                    let sourceName
                    if (this.#sourceEntity.typeId === 'minecraft:player') sourceName = this.#sourceEntity.RPName
                    else {
                        const locKey = this.#sourceEntity.gDP('localizationName') || '.'
                        sourceName = fl(listener, locKey, [], 'sendFalse') || '???'
                    }

                    // Send
                    listener.sendMessage(`[${this.#style}${typeText}§f] <${sourceName}§f> ${text}`)
                }
                // Dynamic NPC recieves a message. Doesn't resieves it's own messages
                else if (listener !== this.#sourceEntity) {
                    if (this.options.debug) console.warn('Processing DNPC trigger')
                    NPCManager.processChatTrigger(listener, this, text, isClear)
                }
            }

            // Hypersynergy
            if (this.#sourceEntity.typeId === 'minecraft:player' && !['action', 'global'].includes(this.type)) {
                const p = this.#sourceEntity
                const amulet = getItem(p, 'legs')
                const amuletId = amulet.typeId
                if (amuletId.startsWith('arx:amul_hypersynergy')) {
                    const words = this.rawText.split(' ')
                    let rune = words[0]
                    if (words.length === 1) {
                        rune = rune.toLowerCase()
                        rune = rune.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+/g, "")

                        // Обрабатываем форматирование
                        while (true) {
                            if (rune.startsWith('§')) {
                                rune = rune.slice(2)
                            } else break
                        }

                        if (rune in runeCiphers) {
                            if (!gDP(this.#sourceEntity, 'amul_hypersynergyCD') > 0) {
                                cipherRuneSequence(p, rune, amulet?.getTags())
                                // Выдаем КД
                                if (amuletId === 'arx:amul_hypersynergy') sDP(p, 'amul_hypersynergyCD', 100)
                                if (amuletId === 'arx:amul_hypersynergy_improved') sDP(p, 'amul_hypersynergyCD', 35)
                                if (amuletId === 'arx:amul_hypersynergy_superior') sDP(p, 'amul_hypersynergyCD', 5)
                            }
                            else {
                                p.sendMessage("§cОткат амулета гиперсинергии ещё не закончился.")
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Returns true if the entity can hear a chat
     * @param {Entity} e 
     */
    static canHear(e) {
        return (e.typeId === 'minecraft:player') || getEntityFamilies(e).includes('dynamic_npc')
    }

    static messageTypes = ['local', 'global', 'shout', 'whisper', 'action'] // Thirst one is a default one
    static defaultMessageType = this.messageTypes[0]
}

// Обработка чата before
world.beforeEvents.chatSend.subscribe(async (eventData) => {

    eventData.cancel = true // Prevent sending a message to a "vanilla" chat

    let trimmedMessage = eventData.message.trim()
    const commandList = trimmedMessage.split(" ++ ").filter(item => item !== "")

    for (let command of commandList) {
        parceMessage(eventData.sender, command.trim())
    }
});

/**
 * @param {Player} player 
 * @param {string} message 
 */
export async function parceMessage(player, message) {
    const thirstSymb = message[0]
    // Speech types
    if (thirstSymb === '!') new Chat.Message(player, message.slice(1).trim(), { type: 'shout' }).send()
    if (thirstSymb === '#') new Chat.Message(player, message.slice(1).trim(), { type: 'global' }).send()
    if (thirstSymb === '*') new Chat.Message(player, message.slice(1).trim(), { type: 'action' }).send()
    if (thirstSymb === '.') new Chat.Message(player, message.slice(1).trim(), { type: 'whisper' }).send()
    else { // Default speech
        new Chat.Message(player, message).send()
    }
}

function speechEmote(player, phrase) {
    phrase = phrase.toLowerCase();

    let phraseStats = {
        negativeMeaning: 0,
        positiveMeaning: 0,
        anger: 0,
        fear: 0,
        sadness: 0,
        excitement: 0,
        request: 0,
        informationSeeking: 0,
        threat: 0,
        greet: 0
    };

    const negativeWords = {
        'нет': { type: "word", weight: 70 },
        'плохо': { type: "word", weight: 80 },
        'ненавижу': { type: "word", weight: 100 },
        'откаж': { type: "partOfWord", weight: 85 },
        'отказыва': { type: "partOfWord", weight: 90 },
        'не хочу': { type: "word", weight: 75 },
        'не буду': { type: "word", weight: 75 },
        'хуйня': { type: "word", weight: 100 },
        'не пойд': { type: "partOfWord", weight: 80 },
        'прекрат': { type: "partOfWord", weight: 85 },
        'заеба': { type: "partOfWord", weight: 100 },
        'хуёво': { type: "word", weight: 100 },
        'отвратительн': { type: "partOfWord", weight: 95 },
        'не могу': { type: "word", weight: 60 },
        'не надо': { type: "word", weight: 60 },
        'неудачн': { type: "partOfWord", weight: 80 },
        'не повезло': { type: "word", weight: 75 },
        'не везёт': { type: "word", weight: 75 },
        'зря': { type: "word", weight: 65 },
        'класс': { type: "word", weight: 10 },
        'бесполез': { type: "partOfWord", weight: 90 },
        'не-а': { type: "word", weight: 100 }
    };

    const positiveWords = {
        'ага': { type: "word", weight: 60 },
        'хорош': { type: "partOfWord", weight: 85 },
        'отличн': { type: "partOfWord", weight: 95 },
        'любл': { type: "partOfWord", weight: 90 },
        'люби': { type: "partOfWord", weight: 95 },
        'прекрасн': { type: "partOfWord", weight: 90 },
        'здорово': { type: "word", weight: 85 },
        'соглас': { type: "partOfWord", weight: 75 },
        'лучш': { type: "partOfWord", weight: 90 },
        'заебись': { type: "word", weight: 100 },
        'заебок': { type: "word", weight: 80 },
        'пиздато': { type: "word", weight: 100 },
        'восхитительн': { type: "partOfWord", weight: 95 },
        'удовольств': { type: "partOfWord", weight: 90 },
        'спасибо': { type: "word", weight: 85 },
        'благодарю': { type: "word", weight: 80 },
        'ценю': { type: "word", weight: 80 },
        'красиво': { type: "part", weight: 85 },
        'рад': { type: "word", weight: 90 },
        'окей': { type: "word", weight: 60 }
    };

    const angerWords = {
        'зло': { type: "partOfWord", weight: 85 },
        'беси': { type: "partOfWord", weight: 95 },
        'ненави': { type: "partOfWord", weight: 100 },
        'достало': { type: "word", weight: 90 },
        'чёрт': { type: "word", weight: 80 },
        'гад': { type: "word", weight: 75 },
        'блядь': { type: "word", weight: 60 },
        'блять': { type: "word", weight: 60 },
        'сука': { type: "word", weight: 100 },
        'суки': { type: "word", weight: 100 },
        'сучара': { type: "word", weight: 100 },
        'гнид': { type: "word", weight: 90 },
        'уёб': { type: "partOfWord", weight: 80 },
        'уеб': { type: "partOfWord", weight: 80 },
        'пидор': { type: "word", weight: 100 },
        'завали ебальник': { type: "word", weight: 100 },
        'идиот': { type: "word", weight: 95 },
        'дебил': { type: "word", weight: 95 },
        'даун': { type: "word", weight: 90 },
        'долбаёб': { type: "word", weight: 100 }
    };

    const fearWords = {
        'страшн': { type: "partOfWord", weight: 85 },
        'боюсь': { type: "word", weight: 90 },
        'тревож': { type: "partOfWord", weight: 80 },
        'опаса': { type: "partOfWord", weight: 75 },
        'жуть': { type: "word", weight: 95 },
        'ужас': { type: "word", weight: 100 },
        'потеря': { type: "word", weight: 40 },
        'проеба': { type: "partOfWord", weight: 90 },
        'темно': { type: "word", weight: 30 }
    };

    const sadnessWords = {
        'груст': { type: "partOfWord", weight: 85 },
        'печаль': { type: "word", weight: 80 },
        'тоскливо': { type: "word", weight: 75 },
        'одиноко': { type: "word", weight: 90 },
        'тяжело': { type: "word", weight: 70 },
        'опять эти': { type: "word", weight: 75 },
        'да сука': { type: "word", weight: 90 }
    };

    const excitementWords = {
        'ура': { type: "word", weight: 100 },
        'отлично': { type: "word", weight: 95 },
        'супер': { type: "word", weight: 90 },
        'круто': { type: "word", weight: 85 },
        'потрясающ': { type: "partOfWord", weight: 95 },
        'восторг': { type: "word", weight: 90 },
        'вау': { type: "word", weight: 95 },
        'идеальн': { type: "partOfWord", weight: 85 }
    };

    const requestWords = {
        'пожалуйста': { type: "word", weight: 75 },
        'могу ли я': { type: "word", weight: 70 },
        'не могли бы вы': { type: "word", weight: 65 },
        'прошу': { type: "word", weight: 80 },
        'умоляю': { type: "word", weight: 85 },
        'можно': { type: "word", weight: 60 },
        'не мог бы': { type: "word", weight: 70 },
        'не могла бы': { type: "word", weight: 70 },
        'мне нужна помощь': { type: "word", weight: 90 }
    };

    const questionWords = {
        'кто': { type: "word", weight: 70 },
        'где': { type: "word", weight: 70 },
        'когда': { type: "word", weight: 70 },
        'почему': { type: "word", weight: 75 },
        'как': { type: "word", weight: 65 },
        'сколько': { type: "word", weight: 65 },
        '?': { type: "word", weight: 80 },
        'дума': { type: "partOfWord", weight: 60 }
    };

    const threatWords = {
        'убью': { type: "word", weight: 100 },
        'убить': { type: "word", weight: 100 },
        'конец тебе': { type: "word", weight: 95 },
        'тебе конец': { type: "word", weight: 95 },
        'прощайся с жизнью': { type: "word", weight: 90 },
        'зареж': { type: "partOfWord", weight: 100 },
        'предупрежда': { type: "partOfWord", weight: 85 },
        'умри': { type: "word", weight: 100 },
        'пожалеешь': { type: "word", weight: 80 },
        'убирайся': { type: "word", weight: 75 },
        'иди нахуй': { type: "word", weight: 100 },
        'отвали': { type: "word", weight: 85 },
        'заткнись': { type: "word", weight: 90 },
        'дуэль': { type: "word", weight: 85 }
    };

    const greetWords = {
        'привет': { type: "word", weight: 80 },
        'здравствуй': { type: "word", weight: 75 },
        'добрый день': { type: "word", weight: 70 },
        'доброе утро': { type: "word", weight: 70 },
        'доброй ночи': { type: "word", weight: 70 },
        'добро пожаловать': { type: "word", weight: 75 },
        'пока': { type: "word", weight: 65 },
        'прощай': { type: "word", weight: 60 },
        'до свидания': { type: "word", weight: 70 },
        'досвидания': { type: "word", weight: 70 },
        'до встречи': { type: "word", weight: 65 },
        'увидимся': { type: "word", weight: 65 }
    };

    // Функция для подсчета взвешенных совпадений слов
    function countWordMatches(phrase, wordList) {
        let totalWeight = 0;
        phrase = phrase.toLowerCase(); // Приводим фразу к нижнему регистру для регистронезависимого поиска
        for (const word in wordList) {
            if (wordList.hasOwnProperty(word)) { // Проверяем, является ли свойство собственным свойством объекта
                const wordObject = wordList[word];

                // Если слово встречается целиком
                if (wordObject.type === "word") {
                    if (phrase.includes(word.toLowerCase())) { // Сравниваем с нижним регистром
                        totalWeight += wordObject.weight;
                    }
                    // Если нам нужно искать часть слова в тексте
                } else if (wordObject.type === "partOfWord") {
                    if (phrase.includes(word.toLowerCase())) {
                        totalWeight += wordObject.weight;
                    }
                }
            }
        }
        return totalWeight;
    }

    // Функция для поиска ключа с макс. значением
    function processPhraseStats(obj) {

        let statsSum = 0;
        for (const key in obj) {
            statsSum += obj[key]
        }
        if (statsSum === 0) {
            return ('noStats')
        }

        const [maxKey, maxValue] = Object.entries(obj).reduce((acc, [key, value]) => {
            return value > acc[1] ? [key, value] : acc;
        }, [Object.keys(obj)[0], obj[Object.keys(obj)[0]]]);

        return maxKey;
    }

    phraseStats.negativeMeaning = countWordMatches(phrase, negativeWords);
    phraseStats.positiveMeaning = countWordMatches(phrase, positiveWords);
    phraseStats.anger = countWordMatches(phrase, angerWords);
    phraseStats.fear = countWordMatches(phrase, fearWords);
    phraseStats.sadness = countWordMatches(phrase, sadnessWords);
    phraseStats.excitement = countWordMatches(phrase, excitementWords);
    phraseStats.request = countWordMatches(phrase, requestWords);
    phraseStats.informationSeeking = countWordMatches(phrase, questionWords);
    phraseStats.threat = countWordMatches(phrase, threatWords);
    phraseStats.greet = countWordMatches(phrase, greetWords);

    // Пример: вывод статистики в консоль
    // console.warn('Phrase Stats:', JSON.stringify(phraseStats), "Высшее значение:", processPhraseStats(phraseStats));

    // Speech animation
    /** @type {string} */
    let animation
    switch (processPhraseStats(phraseStats)) {
        case 'negativeMeaning': animation = "playanimation @s animation.player.speechemote.negativemeaning"; break
        case 'positiveMeaning': animation = "playanimation @s animation.player.speechemote.positivemeaning"; break
        case 'anger': animation = "playanimation @s animation.player.speechemote.anger"; break
        case 'fear': animation = "playanimation @s animation.player.speechemote.fear"; break
        case 'sadness': animation = "playanimation @s animation.player.speechemote.sadness"; break
        case 'excitement': animation = "playanimation @s animation.player.speechemote.excitement"; break
        case 'request': animation = "playanimation @s animation.player.speechemote.request"; break
        case 'informationSeeking': animation = "playanimation @s animation.player.speechemote.informationseeking"; break
        case 'threat': animation = "playanimation @s animation.player.speechemote.threat"; break
        case 'greet': animation = "playanimation @s animation.player.speechemote.greet"; break
        case 'noStats': animation = "playanimation @s animation.player.speechemote.nostats"; break
    }

    system.run(() => {
        player.runCommand("playanimation @s " + animation)
    })

    return phraseStats; // Возвращаем статистику для дальнейшего использования
}

export function msgFromGuide(player, message) {
    if (!player || !message) {
        console.warn(`Попытка отправить сообщение от гида игроку ${player.name} с содержанием ${message} с отсутствием достаточного числа аргументов`)
    }
    player.sendMessage(`[§aГид§f] > ${message}`)
    player.runCommand('playsound random.orb @s ~ ~ ~')
}