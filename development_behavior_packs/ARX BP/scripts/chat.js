// Imports
import { world, EntityComponentTypes, EquipmentSlot } from "@minecraft/server"
import { emote } from './emote'
import { getScore } from './scoresOperations'
import { getSkillsData } from './skillsOperations'
import { queueCommand } from './commandQueue'
import { checkForItem } from "./items/checkForItem"
import { sl, fl } from "./lang/fetchLocalization"

import { runeCiphers } from './magic/rune_cipher_list'
import { cipherRuneSequence } from './magic/on_use_magic_items'

import { acquireTrait, checkForTrait, clearTraits } from './traits/traitsOperations'
import { ssDP } from "./DPOperations"
import { isAdmin, getAdmins } from './admin'

// Обработка чата before
world.beforeEvents.chatSend.subscribe((eventData) => {

    eventData.cancel = true // Предотвращаем отправку сообщения в чат

    const player = eventData.sender
    let trimmedMessage = eventData.message.trim()

    const commandList = trimmedMessage.split(" ++ ").filter(item => item !== "")

    for (let command of commandList) {
        parceChatCommand(player, command.trim())
    }
});

export function parceChatCommand(player, trimmedMessage) {
    if (trimmedMessage.startsWith("!")) { // Если это команда Аркса
        // command содержит в себе список из последовательности введенных слов в команде
        const command = trimmedMessage.split(/\s+/)

        if (command[0] == "!test") { // Тест функция
            if (isAdmin(player)) {
                sl(player, 'lobby.verify.new_player_entered_arx', [player.name])
            } else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] === "!pos") { // Получить координаты
            if (isAdmin(player)) {
                if (player.location) {
                    const { x, y, z } = player.location;
                    const xPos = x.toFixed(1);
                    const yPos = y.toFixed(1);
                    const zPos = z.toFixed(1);

                    player.sendMessage(`[§dSYSTEM§f] > ${xPos} ${yPos} ${zPos}`);
                } else {
                    player.sendMessage("[§dSYSTEM§f] > Не удалось получить координаты");
                }
            } else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] == "!eval") { // Eval функция
            if (isAdmin(player)) {
                const codeToEval = trimmedMessage.slice(5);
                try {
                    const result = eval(codeToEval);
                    // Send result to player
                    player.sendMessage(`§aResult§f: ${result}`)
                } catch (error) {
                    player.sendMessage(`§cEval error§f: ${error}`)
                }
            } else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] == "!") { // Инфо о командах
            ssDP(player, 'hasEverSeenArxCommandsHelp', true)
            queueCommand(player, `function javascript/arx_commands_help`);
        }

        else if (command[0].toLowerCase() == "!имя" || command[0].toLowerCase() == "!name" || command[0].toLowerCase() == "!setname") { // Установить имя
            const newName = command.slice(1).join(' ').trim()

            if (!newName) {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cНевозможно установить пустое имя." } ] }`)
            }
            else {
                if (newName.length < 30) {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§aИмя персонажа для локального чата изменено на §f${newName}§a." } ] }`)
                    ssDP(player, "name", newName)
                }
                else {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cПожалуйста, введите более короткое имя." } ] }`)
                }
            }
        }

        else if (command[0] == "!sdp") {
            if (isAdmin(player)) {
                if (!command[1] || !command[2]) {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cФормат: §f!sdp §f<ключ> <значение> [игрок]" } ] }`);
                } else {
                    let targetPlayer = player;

                    // Поиск игрока, если указан
                    if (command[3]) {

                        const playerName = command.slice(3).join(' ').trim()

                        targetPlayer = world.getPlayers().find(p =>
                            p.name.toLowerCase() === playerName.toLowerCase()
                        );
                    }

                    if (!targetPlayer) {
                        queueCommand(player, `tellraw @s { "rawtext": [{ "text": "§cИгрок ${command[3]} не найден" }] }`);
                    } else {

                        // Определение типа значения
                        let value;
                        if (!isNaN(command[2])) {
                            value = parseFloat(command[2]); // Число
                        } else if (command[2].toLowerCase() === "true") {
                            value = true; // Булево true
                        } else if (command[2].toLowerCase() === "false") {
                            value = false; // Булево false
                        } else {
                            value = command[2]; // Строка
                        }

                        // Установка свойства
                        ssDP(targetPlayer, command[1], value)

                        queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§dDP§f ${command[1]} §dигрока §f${targetPlayer.name}§d изменено на §f${value}" } ] }`);
                    }
                }
            } else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] == "!gdp") { // Get Dynamic Property
            if (isAdmin(player)) {
                if (!command[1]) { queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cИспользуйте формат §f!§cgdp §f<dynamicProperty>" } ] }`) }
                else {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§bDP§f §f<${command[1]}>§b имеет значение §f${player.getDynamicProperty(command[1])}" } ] }`)
                }
            }
            else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] == "!gp") { // Get Property
            if (isAdmin(player)) {
                if (!command[1]) { queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cИспользуйте формат §f!§cgdp §f<property>" } ] }`) }
                else {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§bDP§f §f<${command[1]}>§b имеет значение §f${player.getProperty(command[1])}" } ] }`)
                }
            }
            else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] == "!gbd") { // Get Block Data
            if (isAdmin(player)) {
                queueCommand(player, "tag @s add gbd_ready")
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§f§aКликните на блок§f, чтобы получить данные о его взаимдействиях на этом хосте." } ] }`)
            }
            else {
                sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            }
        }

        else if (command[0] == "!verify") { // Верификация игрока
            if (!isAdmin(player)) sl(player, 'chat.command.unable_to_use_cus_admin_rights_required')
            else if (!world.getDynamicProperty('requireUserVerification')) player.sendMessage('§cВерификация отключена глобально')
            else if (!command[1]) player.sendMessage('§cИспользуйте формат §f!§cverify §f<игрок>')
            else {
                const playerNickName = command.slice(1).join(' ')

                const targetPlayer = world.getPlayers().find(p =>
                    p.name.toLowerCase() === playerNickName.trim().toLowerCase()
                )

                if (!targetPlayer) {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cИгрок с ником §f${playerNickName}§c не найден" } ] }`)
                } else {
                    if (targetPlayer.getDynamicProperty('verify') == true) { // Если уже верифицирован
                        queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§eИгрок §f${playerNickName}§e уже верифицирован" } ] }`)
                    } else {
                        player.sendMessage(`§aВыдана верификация§f игроку §a${targetPlayer.name}`)
                        targetPlayer.sendMessage("§aВам выдана верификация!§f Вы можете приступать к созданию персонажа.")
                        // Говорим, как начать создание персонажа
                        let textToSend
                        switch (targetPlayer.inputInfo.lastInputModeUsed) {
                            case 'KeyboardAndMouse': textToSend = 'Для этого подойдите к статуе <Создать персонажа> и нажмите на неё правой кнопкой мыши.'; break
                            case 'Touch': textToSend = 'Для этого подойдите к статуе <Создать персонажа> и долго зажмите на ней пальцем.'
                        }
                        if (textToSend) targetPlayer.sendMessage(textToSend)
                        queueCommand(targetPlayer, 'playsound random.orb @s ~ ~ ~ ')
                        ssDP(targetPlayer, 'verify', true)
                    }
                }
            }
        }

        else if (command[0] == "!i" || command[0] == "!и") { // Открыть инфо
            player.sendMessage('§aЗакройте чат и прыгните§f, чтобы открыть <Инфо>')
            ssDP(player, 'ui:readyToOpenInfoBook', true)
        }

        else if (command[0].toLowerCase() == "!w" || command[0].toLowerCase() == "!ш") { // Использование шёпота
            if (player.getDynamicProperty('respawnDelay') === 0) {
                sendChatMessage(player, `§7§o${trimmedMessage.slice(3).trim()}`, "§6Шёпот", 2, player.getDynamicProperty('name'))
            }
            else {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cВы не можете шептать, пока вы без сознания." } ] }`)
            }
        }

        else if (command[0].toLowerCase() == "!д" || command[0].toLowerCase() == "!a" || command[0].toLowerCase() == "!me") { // Использование действия
            if (player.getDynamicProperty('respawnDelay') === 0) {
                sendChatMessage(player, `§o(${trimmedMessage.slice(3).trim()})`, "§bДействие", 8, player.getDynamicProperty('name'))
            }
            else {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cВы не можете выполнять действия, пока вы без сознания." } ] }`)
            }
        }

        else if (command[0].startsWith("!к") && command[0].length - ((command[0].match(/к/g) || []).length) === 1) { // Использование крика

            if (player.getDynamicProperty('respawnDelay') === 0) {
                if (!command[1]) {
                    queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cНельзя крикнуть без слов, чел." } ] }`)
                }
                else {
                    // Трясём камеру
                    queueCommand(player, "camerashake add @s 0.2 0.1")

                    // Громкость крика без обработки
                    const basicShoutPower = command[0].length - 1

                    // Громкость крика с обработкой (сигмоида)
                    const L = 9
                    const k = 0.75
                    const x0 = 5.5
                    const offset = 10

                    const modifiedShoutPower = L / (1 + Math.exp(-k * (basicShoutPower - x0))) + offset

                    // Восклиц знаки
                    let additionalExcalmations = "!".repeat(Math.ceil(modifiedShoutPower / 12))

                    sendChatMessage(player, `§l${command.slice(1).join(" ").toUpperCase()}${additionalExcalmations}`, "§vКрик", modifiedShoutPower, player.getDynamicProperty('name'))
                }
            }
            else {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cВы не можете общаться, пока вы без сознания." } ] }`)
            }
        }

        else if (command[0].toLowerCase() == "!г" || command[0].toLowerCase() == "!g") {
            if (player.getDynamicProperty('respawnDelay') === 0) {
                if (!command[1]) {
                    player.sendMessage(`§cНельзя отправить пустое глобальное сообщение.`)
                }
                else {
                    sendChatMessage(player, trimmedMessage.slice(3).trim(), "§cГлобал.", 0, player.name)
                }
            }
            else {
                player.sendMessage(`§cВы не можете использовать глобальный чат, пока вы без сознания.`)
            }
        }
        else if (command[0] == "!camset") {
            if (player.getDynamicProperty('respawnDelay') === 0) {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§aКамера установлена.\n§eИспользование камеры с любой целью, кроме эстетического улучшения ракурса, является тяжёлым нарушением правил Аркса по части РП." } ] }`)
                queueCommand(player, `tellraw @a[rm=0.01, r=10] { "rawtext": [ { "text": "[§dSYSTEM§f] > "}, {"selector": "@s"}, { "text": " установил(а) камеру поблизости." } ] }`)
                queueCommand(player, `tellraw @a[scores={verify=2}] { "rawtext": [ { "text": "[§dSYSTEM§f] > "}, {"selector": "@s"}, { "text": " установил(а) камеру на ${Math.round(player.location.x)} ${Math.round(player.location.y)} ${Math.round(player.location.z)}." } ] }`)
                queueCommand(player, `camera @s set minecraft:free pos ~ ~1.7 ~ rot ~ ~`)
            }
            else {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cВы не можете управлять камерой, пока вы без сознания." } ] }`)
            }
        }
        else if (command[0] == "!camclr") {
            if (player.getDynamicProperty('respawnDelay') === 0) {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§aКамера сброшена." } ] }`)
                queueCommand(player, `tellraw @a[rm=0.01, r=10] { "rawtext": [ { "text": "[§dSYSTEM§f] > "}, {"selector": "@s"}, { "text": " сбросил(а) камеру поблизости." } ] }`)
                queueCommand(player, `tellraw @a[scores={verify=2}] { "rawtext": [ { "text": "[§dSYSTEM§f] > "}, {"selector": "@s"}, { "text": " сбросил(а) камеру." } ] }`)
                queueCommand(player, `camera @s clear`)
            }
            else {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cВы не можете управлять камерой, пока вы без сознания." } ] }`)
            }
        }

        else if (trimmedMessage.startsWith("!!")) {
            if (player.getDynamicProperty('respawnDelay') === 0) {
                emote(player, trimmedMessage)
            }
            else {
                player.sendMessage(`§cВы не можете использовать эмоции, пока вы без сознания.`)
            }
        }

        else {
            player.sendMessage(`§cТакой команды Аркса не существует.\nВведите §f!§c, чтобы посмотреть доступные.`)
        }
    }
    else { // Сообщение - не команда Аркса. Обработать и отправить
        sendChatMessage(player, trimmedMessage, "§aЛокал.", 8, player.getDynamicProperty('name'))
    }
}

// Send a message to chat
function sendChatMessage(player, speech, prefix, clearDistance = 0, senderName = undefined) {

    /*
    АРГУМЕНТЫ:
    speech: текстовое сообщение
    clearDistance: максимальная дистанция, на которой речь слышно без искажений. Если 0, то дистаниция бесконечная
    prefix: префикс речи, например "§aЛокал."
    senderName - имя отправителя сообщения, которое отобразится в чате
    */

    // Есть ли сообщение
    if (!speech || (speech.split("§").length - 1) * 2 == speech.length) {
        player.sendMessage('§cНевозможно отправить пустое сообщение.')
        return undefined
    }

    // Запрет на отправку сообщения из-за содержания \ или "
    if (speech.includes("\\") || speech.includes('"')) {
        player.sendMessage('§cИз-за технических особенностей невозможно отправить сообщение, содержащее двойную кавычку или обратный слеш.')
        return undefined
    }

    // Недопуск из-за нока
    if (player.getDynamicProperty('respawnDelay') > 0) {
        player.sendMessage("§cВы не можете разговаривать, пока вы без сознания.")
        return undefined
    }

    // Недопуск из-за отсутствия локального ника
    if (senderName === undefined) {
        player.sendMessage("§cУстановите имя персонажа, чтобы общаться. Это можно сделать командой §a!имя введите-имя-вашего-персонажа§c.")
        return undefined
    }

    // Недопуск из-за спектатора
    if (player.getGameMode() === 'Spectator' && prefix !== "§cГлобал.") {
        player.sendMessage("§cНевозможно использовать локальный чат в режиме наблюдателя.")
        return undefined
    }

    // ЕСЛИ ВКЛЮЧЕН РП ЧАТ
    // Делаем речевую эмоцию, если это нужно
    if (!player.hasTag('is_emoting_via_arx_command') && (prefix === "§aЛокал." || prefix === "§vКрик")) {
        speechEmote(player, speech)
    }

    // Записываем руну, если надо, используя кристалл синергии
    if (checkForItem(player, "Legs", 'arx:amul_hypersynergy') || checkForItem(player, "Legs", 'arx:amul_hypersynergy_improved') || checkForItem(player, "Legs", 'arx:amul_hypersynergy_superior')) {
        if (prefix !== "§cГлобал.") {
            const words = speech.split(' ')

            let rune = words[0]

            if (!words[1]) {
                rune = rune.toLowerCase()
                rune = rune.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+/g, "")

                // Обрабатываем форматирование
                while (true) {
                    if (rune.startsWith('§')) {
                        rune = rune.slice(2)
                    } else {
                        break
                    }
                }

                if (rune in runeCiphers) {
                    if (!player.getDynamicProperty('amul_hypersynergyCD') > 0) {
                        const item = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Legs)
                        cipherRuneSequence(player, rune, item?.getTags())
                        // Выдаем КД
                        if (checkForItem(player, "Legs", 'arx:amul_hypersynergy')) ssDP(player, 'amul_hypersynergyCD', 100)
                        if (checkForItem(player, "Legs", 'arx:amul_hypersynergy_improved')) ssDP(player, 'amul_hypersynergyCD', 35)
                        if (checkForItem(player, "Legs", 'arx:amul_hypersynergy_superior')) ssDP(player, 'amul_hypersynergyCD', 5)
                    }
                    else {
                        player.sendMessage("§cОткат амулета гиперсинергии ещё не закончился.")
                    }
                }
            }
        }
    }

    // Проходимся по каждому игроку
    for (const speechListener of world.getPlayers()) {

        // Если тот, кто получает сообщение не нокнут
        if (speechListener.getDynamicProperty('respawnDelay') === 0) {

            // Определяем дистанцию между говорящим и слушающим
            const dx = speechListener.location.x - player.location.x
            const dy = speechListener.location.y - player.location.y
            const dz = speechListener.location.z - player.location.z
            const distanceToListener = Math.sqrt(dx * dx + dy * dy + dz * dz)

            // Путаем речь зависимо от дистанции между говорящим и слущающим
            const speechReadyToSend = messSpeechByDistance(speech, distanceToListener, clearDistance)

            // Путаем никнейм
            const readySenderName = messSpeechByDistance(senderName, distanceToListener, clearDistance)

            // Если игрок должен получить какое-то сообщение
            if (speechReadyToSend) {
                // Настраиваем префикс чата
                let finalPrefix = prefix // значение по умолчанию

                // Срезаем префикс, если это нужно
                if (speechListener.getDynamicProperty('myRule:chatPrefixes') == 'shortEN') finalPrefix = prefix.slice(0, 3)

                // Отправляем сообщение
                speechListener.sendMessage(`[${finalPrefix}§f] <${readySenderName}§f> ${speechReadyToSend}`)
            }
        }
    }
}

function messSpeechByDistance(text, defactoDistance, allrightDistance) {
    // Задано, что дистанция бесконечная
    if (allrightDistance == 0) {
        return text
    }
    // Слышно идеально
    if (defactoDistance <= allrightDistance) {
        return text
    }
    // Слишком большое расстояние
    else if (defactoDistance > allrightDistance * 2) {
        return undefined
    }
    else { // Надо сшакалить качество

        let formatting = ''

        // Отеляем префикс
        while (true) {
            if (text.startsWith('§')) {
                formatting += text.slice(0, 2)
                text = text.slice(2)
            }
            else {
                break
            }
        }

        const russianAlphabetLowercase = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"

        let result = ''
        const spoilFactor = (defactoDistance - allrightDistance) / allrightDistance; // Значение от 0 до 1

        for (let i = 0; i < text.length; i++) {
            let char = text[i]

            if (char !== ' ') {

                if (Math.random() < spoilFactor) { // Вероятность "испортить" символ
                    // Портим
                    if (Math.random() < 0.125) { char = '.' }
                    else if (Math.random() < 0.250) { char = '..' }
                    else if (Math.random() < 0.375) { char = '...' }
                    else if (Math.random() < 0.5) { char = '■' }
                    else {
                        const randomIndex = Math.floor(Math.random() * russianAlphabetLowercase.length)
                        char = russianAlphabetLowercase[randomIndex]
                    }
                }
            }

            result += char;
        }

        return formatting + result;
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

    // Дальнейшая обработка phraseStats для выбора эмоции и воспроизведения её
    switch (processPhraseStats(phraseStats)) {
        case 'negativeMeaning':
            queueCommand(player, "playanimation @s animation.player.speechemote.negativemeaning")
            break
        case 'positiveMeaning':
            queueCommand(player, "playanimation @s animation.player.speechemote.positivemeaning")
            break
        case 'anger':
            queueCommand(player, "playanimation @s animation.player.speechemote.anger")
            break
        case 'fear':
            queueCommand(player, "playanimation @s animation.player.speechemote.fear")
            break
        case 'sadness':
            queueCommand(player, "playanimation @s animation.player.speechemote.sadness")
            break
        case 'excitement':
            queueCommand(player, "playanimation @s animation.player.speechemote.excitement")
            break
        case 'request':
            queueCommand(player, "playanimation @s animation.player.speechemote.request")
            break
        case 'informationSeeking':
            queueCommand(player, "playanimation @s animation.player.speechemote.informationseeking")
            break
        case 'threat':
            queueCommand(player, "playanimation @s animation.player.speechemote.threat")
            break
        case 'greet':
            queueCommand(player, "playanimation @s animation.player.speechemote.greet")
            break

        case 'noStats':
            queueCommand(player, "playanimation @s animation.player.speechemote.nostats")
            break
    }

    return phraseStats; // Возвращаем статистику для дальнейшего использования
}

export function msgFromGuide(player, message) {
    if (!player || !message) {
        console.warn(`Попытка отправить сообщение от гида игроку ${player.name} с содержанием ${message} с отсутствием достаточного числа аргументов`)
    }
    player.sendMessage(`[§aГид§f] > ${message}`)
    player.runCommand('playsound random.orb @s ~ ~ ~')
}
export function msgFromSystem(player, message) {
    if (!player || !message) {
        console.warn(`Попытка отправить сообщение от системы игроку ${player.name} с содержанием ${message} с отсутствием достаточного числа аргументов`)
    }
    player.sendMessage(`[§dСистема§f] > ${message}`)
}