// Imports - Minecraft
import { world, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";

import { runeCiphers } from './rune_cipher_list'

import { castJSSpell, prepareSpellData } from './castJSSpell'
import { findSpell } from "./findSpell"
import { getActiveStaffChannel } from './getActiveStaffChannel'

import { getScore, setScore } from "../scoresOperations";
import { increaseSkillProgress } from "../skillsOperations";

import { manageCD } from "../manageCD";
import { queueCommand } from "../commandQueue";
import { gDP, iDP, ssDP } from "../DPOperations";
import { spellRegistry } from "./spells/_spellRegistry";
import { getItem } from '../items/getItem'
import { channelRomanNums } from "./channelRomanNums";
import { sl } from "../lang/fetchLocalization";
import { checkForItem } from "../items/checkForItem";

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
            // TO-DO
            // Wand works as a staff, but has only one channel and forces a spell to cast, e.g. Protection wand will always cast defence spell

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

    ssDP(player, dynamicPropertyName, runeCiphers[runeName] + gDP(player, dynamicPropertyName))

    // Срезаем длину строки, если она более 100 символов
    if (gDP(player, dynamicPropertyName).length > 100) {
        ssDP(player, dynamicPropertyName, gDP(player, dynamicPropertyName).substring(0, 100))
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

    // Отчитываемся, какой используется канал
    sl(player, 'magic.staff.channel', [channelRomanNums[activeChannel - 1]])

    // Если есть закл
    if (spell) {
        const spellData = prepareSpellData(player, spell)
        const magicTarget = spellData.targetRaw

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
            player.runCommand("playanimation @s animation.arx.staff_a")

            // Активируем заклинание, и получаем от него ответ, что оно сделало или не сделало
            const spellResponce = castJSSpell(player, spell, spellData)

            // Ставим это заклинание, как известное
            const knownDpellDP = `ksb:${spellRegistry[spell].cipher}`
            const isAlreadyKnown = player.getDynamicProperty(knownDpellDP)
            if (!isAlreadyKnown) {
                sl(player, 'magic.spell.discovered', [spell])
                player.runCommand('playsound random.orb @s ~ ~ ~')
                ssDP(player, knownDpellDP, true)
            }

            // Если заклинание успешно использовано
            switch (spellResponce) {
                case 'ok':
                    withdrawMP(player, spellCostReq, spellCostMult)
                    break

                case 'noValidEntity':
                    sl(player, 'magic.spell.no_valid_entity')
                    break

                case 'wrongEntityType':
                    sl(player, 'magic.spell.wrong_entity_type')
                    break

                case 'noValidTarget':
                    if (spellRegistry[spell].validTargets.includes(1)) {
                        sl(player, 'magic.spell.only_self')
                    } else sl(player, 'magic.spell.cannot_self')

                    break
            }
        }
        else {
            player.runCommand("playanimation @s animation.arx.no")
            sl(player, 'magic.spell.insufficient_mp', [spellCostReq, smartRound(spellCostReq - player.getDynamicProperty('mp'))])
        }
    }
    // Если заклинания нет
    else {
        player.runCommand("playanimation @s animation.arx.no")
        sl(player, 'magic.spell.not_prepared', [channelRomanNums[activeChannel - 1]])
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

    if (spellCostMult === 1) sl(player, 'magic.spell.spent_mp', [spellCostReq])
    else sl(player, 'magic.spell.spent_mp_discount', [spellCostReq, Math.round((1 - spellCostMult) * 100)])
}