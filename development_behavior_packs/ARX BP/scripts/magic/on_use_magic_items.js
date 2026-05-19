// Imports - Minecraft
import { world, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";

import { runeCiphers } from './rune_cipher_list'

import { castJSSpell } from './castJSSpell'
import { findSpell } from "./findSpell"
import { getActiveStaffChannel } from './getActiveStaffChannel'

import { getScore, setScore } from "../scoresOperations";
import { increaseSkillProgress } from "../skillsOperations";

import { manageCD } from "../manageCD";
import { queueCommand } from "../commandQueue";
import { iDP, ssDP } from "../DPOperations";
import { spellRegistry } from "./spells/_spellRegistry";
import { getItem } from '../items/getItem'
import { channelRomanNums } from "./channelRomanNums";
import { fl, sl } from "../lang/fetchLocalization";
import { checkForItem } from "../checkForItem";

// Использование предметов
world.afterEvents.itemUse.subscribe((event) => { // Обнаружаем юзание предмета на ПКМ

    const player = event.source; // Получаем объект игрока
    const item = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand)

    if (!item) {
        return undefined
    }

    // Rune
    for (const itemTag of item?.getTags()) {
        // Нашли тег вида rune:runeName
        if (itemTag.includes('rune:')) {
            // Получили runeName
            const rune = itemTag.split(':')[1]
            // Если у руны есть кд
            if (!item?.getTags().includes('malafiotironite_rune')) {
                if (manageCD(player)) {
                    cipherRuneSequence(player, rune, item?.getTags())
                }
            } else { // Если руна без кд
                cipherRuneSequence(player, rune, item?.getTags())
            }
        }
    }
    // Посох
    if (item?.getTags().includes("is_staff")) {
        if (manageCD(player)) {
            // Кастуем
            useStaff(player)
        }
    }
    // Палочка
    else if (item?.getTags().includes("is_wand")) {
        if (manageCD(player)) {
            // Определяем каналы
            let channels
            for (const tag of item?.getTags()) {
                if (tag.includes('wand_channels_')) {
                    channels = parseInt(tag.slice(14))
                }
            }
            const channel = getActiveStaffChannel(player, channels, false)
            const targetDP = `channel_${channel}_target`

            // Логика
            if (player.getDynamicProperty(targetDP) == 1) ssDP(player, targetDP, 2)
            else ssDP(player, targetDP, 1)

            // Отчёт
            const magicTarget = player.getDynamicProperty(targetDP)
            const targetRu = magicTarget === 1 ? '§aна себя' : '§6на другого'
            player.sendMessage(`Установлена цель для §d${channelRomanNums[channel - 1]}§f канала: ${targetRu}`)

            // Анимируем
            const animVar = Math.floor(Math.random() * 4)
            if (animVar == 0) { player.runCommand("playanimation @s animation.arx.wand_a_a") }
            else if (animVar == 1) { player.runCommand("playanimation @s animation.arx.wand_a_b") }
            else if (animVar == 2) { player.runCommand("playanimation @s animation.arx.wand_a_b") }
            else if (animVar == 3) { player.runCommand("playanimation @s animation.arx.wand_b_a") }
        }
    }
})

// Шифруем последовательность данных по факту набора последовательности рун (АКТИВИРУЕТСЯ ПРИ ЮЗАНИИ РУНЫ)
export function cipherRuneSequence(player, runeName, runeTags) {

    // Определяем каналы
    let channel = undefined
    if (runeTags?.includes('plumbum_rune')) { channel = 4 }
    else if (runeTags?.includes('naginitis_rune')) { channel = 6 }
    else if (runeTags?.includes('forfacorite_rune')) { channel = 10 }
    else if (runeTags?.includes('special_rune')) { channel = 10 }
    else if (runeTags?.includes('malafiotironite_rune')) { channel = 8 }
    else if (runeTags?.includes('amul_hypersynergy')) { channel = 4 }
    else if (runeTags?.includes('amul_hypersynergy_improved')) { channel = 6 }
    else if (runeTags?.includes('amul_hypersynergy_superior')) { channel = 8 }

    if (channel === undefined) {
        console.warn(`Не удалось определить канал при записи руны в шифр (функция cipherRuneSequence)`)
        return undefined
    }

    channel = getActiveStaffChannel(player, channel, false)

    // Сохраняем некоторые данные
    const dynamicPropertyName = `channel_${channel}_rune_sequence`

    // Проверяем, существует ли указаная руна
    if (!(runeName in runeCiphers)) {
        console.warn(`Попытка использовать несуществующую руну ${runeName}`)
        return undefined
    }

    // Устанавливаем напрямую данные о рунах в DynamicProperty

    ssDP(player, dynamicPropertyName, runeCiphers[runeName] + player.getDynamicProperty(dynamicPropertyName))

    // Срезаем длину строки, если она более 100 символов
    if (player.getDynamicProperty(dynamicPropertyName).length > 100) {
        ssDP(player, dynamicPropertyName, player.getDynamicProperty(dynamicPropertyName).substring(0, 100))
    }

    // Сообщаем игроку о введенной руне
    const runeNameCapitalized = runeName[0].toUpperCase() + runeName.slice(1)
    sl(player, 'magic.rune_writed_into_cannel', [runeNameCapitalized, channelRomanNums[channel - 1]])
}

// Using a staff
export function useStaff(player, forceChannel = undefined) {

    // Get a staff object
    const staffItem = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand)

    // Get num of staff channels
    let staffChannels
    const tagPrefix = "staff_channels_";

    for (const tag of staffItem?.getTags()) {
        if (tag.startsWith(tagPrefix)) {
            const numStr = tag.substring(tagPrefix.length);
            const num = parseInt(numStr, 10);

            if (!isNaN(num) && num > 0) {
                staffChannels = num;
                break; // нашли — выходим
            }
        }
    }

    // Get active caster's channel
    let activeChannel = 1
    if (forceChannel) activeChannel = forceChannel
    else activeChannel = getActiveStaffChannel(player, staffChannels)

    // Get spell (spell - string, spellArray - array of runes)
    const spell = findSpell(player, activeChannel, 'sequence')
    const spellArray = spell?.split(' ')

    // Отчитываемся, какая используется цель и канал
    const magicTarget = player.getDynamicProperty(`channel_${activeChannel}_target`)
    const targetRu = magicTarget === 1 ? '§aна себя' : '§6на другого'
    player.sendMessage(`§b${channelRomanNums[activeChannel - 1]} §fканал ${targetRu}`)
    if (![1, 2].includes(magicTarget)) console.warn(`Использовано заклинание ${spell} с недопустимой целью ${magicTarget} игроком ${player.name}`)

    // Если есть закл
    if (spell) {
        // Spell mp cost multiplier
        let spellCostMult = 1

        // Определяем, есть ли скидка по руне или рунам. Тег хранится в виде spell_cost_reduction_with_rune_runename:0.25 и может находиться на любом экипируемом предмете
        const spellCostReductionPrefix = 'spell_cost_reduction_with_rune_'
        const equipment = getItem(player, 'equipment')
        for (let equipmentItem of equipment) for (const tag of equipmentItem?.getTags()) {
            if (!equipmentItem) continue
            if (tag.startsWith(spellCostReductionPrefix)) {
                const costReductionData = tag.substring(spellCostReductionPrefix.length).split(':')
                if (costReductionData.length !== 2) console.warn(`Неожиданная длинна ${costReductionData} для заклинания ${spell}, игрока ${player.name}`)
                if (spellArray.includes(costReductionData[0]) || costReductionData[0] === 'any') spellCostMult -= +costReductionData[1]
            }
        }

        // Mp reduction by rare gem amuls
        if (checkForItem(player, 'Legs', 'arx:amul_magic_painit') && magicTarget === 2) spellCostMult -= 0.25
        if (checkForItem(player, 'Legs', 'arx:amul_magic_titanite') && magicTarget === 1) spellCostMult -= 0.25
        if (checkForItem(player, 'Legs', 'arx:amul_magic_zoisite')) spellCostMult -= 0.1

        // If mp reduction is more than 0.9 
        if (spellCostMult < 0.1) spellCostMult = 0.1

        // Check that the caster has enough MP
        const spellCostReq = Math.round(spellRegistry[spell].mpCost * spellCostMult)
        const canCast = player.getDynamicProperty('mp') >= spellCostReq

        // Если можем использовать
        if (canCast) {
            // Активируем заклинание, и получаем от него ответ, что оно сделало или не сделало
            const spellResponce = castJSSpell(player, spell, magicTarget)

            // Ставим это заклинание, как известное
            const knownDpellDP = `ksb:${spellRegistry[spell].cipher}`
            const isAlreadyKnown = player.getDynamicProperty(knownDpellDP)
            if (!isAlreadyKnown) {
                player.sendMessage(`Открыто §dновое заклинание§f ${spell}!`)
                player.runCommand('playsound random.orb @s ~ ~ ~')
                ssDP(player, knownDpellDP, true)
            }

            // Если заклинание успешно использовано
            switch (spellResponce) {
                case 'ok':
                    withdrawMP(player, spellCostReq, spellCostMult)
                    player.runCommand("playanimation @s animation.arx.staff_a")
                    break

                case 'noValidEntity':
                    player.sendMessage('§vНе на кого сотворять заклинание')
                    player.runCommand("playanimation @s animation.arx.no")
                    break

                case 'wrongEntityType':
                    player.sendMessage('§vЭто заклинание невозможно применить на это существо')
                    player.runCommand("playanimation @s animation.arx.no")
                    break

                case 'noValidTarget':
                    player.sendMessage('§vЗаклинание не поддерживает выбранную цель')
                    player.runCommand("playanimation @s animation.arx.no")
                    break
            }
        }
        else {
            player.runCommand("playanimation @s animation.arx.no")
            player.sendMessage(`§vТребуется §b${spellCostReq}§v маны §o§7(не хватает ${smartRound(spellCostReq - player.getDynamicProperty('mp'))})`)
        }
    }
    // Если заклинания нет
    else {
        player.runCommand("playanimation @s animation.arx.no")
        player.sendMessage(`§cЗаклинание не заготовлено в ${channelRomanNums[activeChannel - 1]} канале`)
    }
}

function smartRound(num) {
    const rounded = Math.round(num * 10) / 10;
    return rounded % 1 === 0 ? Math.trunc(rounded) : rounded;
}

function withdrawMP(player, spellCostReq, spellCostMult) {
    // spellCostReq - уже с рассчётом скидки
    iDP(player, 'mp', -spellCostReq)

    // РЕГЕН mpRegenSkillIncreaseValue: Низкое значение до 30, резкий рост после.
    const mpRegenSkillIncreaseValue = spellCostReq <= 30 ? spellCostReq / 6 : spellCostReq;
    // МАКС МП manaSkillIncreaseValue: Высокое значение до 30, низкое после.
    const manaSkillIncreaseValue = spellCostReq <= 30 ? spellCostReq * 3 : spellCostReq / 2;

    increaseSkillProgress(player, "mp_regen", mpRegenSkillIncreaseValue)
    increaseSkillProgress(player, "mana", manaSkillIncreaseValue)

    if (spellCostMult === 1) player.sendMessage(`Потрачено §b${spellCostReq}§f маны`)
    else player.sendMessage(`Потрачено §b${spellCostReq}§f маны §a§o(скидка ${Math.round((1 - spellCostMult) * 100)}Ũ)`)
}