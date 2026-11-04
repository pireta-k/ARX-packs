// Операции с навыками

import { checkForItem } from './items/checkForItem'
import { checkForTrait } from './traits/traitsOperations'
import { gDP, iDP, sDP } from './arxLib/dp'
import { Player } from '@minecraft/server'
import { fl } from './lang/fetchLocalization'
import { xpBonusRingsList } from './items/lists'
import { Cache } from './arxLib/cache'
import { getItem } from './items/getItem'

/**
 * A skill in Arx XP system
 * @typedef {keyof typeof skills} Skill
 */

export class XP {
    /**
     * Increase player's skill progress. 
     * @param {Player} player 
     * @param {Skill} skill 
     * @param {number} inputValue - number to increase. Ignores negative. +100 means 0 -> 1 lvl upgarde
     */
    static increaseSkillProgress(player, skill, inputValue) {
        if (inputValue <= 0) return undefined

        if (!(skill in skills)) {
            console.warn(`Trying to increase progress of a non-existent skill ${skill}`)
            return undefined
        }

        const gm = player.getGameMode()
        if (gm === 'Creative' || gm === 'Spectator') return undefined

        const progressDP = this.#getProgressDP(skill)

        // Define increaseValue
        let increaseValue = inputValue / (1.92 ** this.getLevel(player, skill))

        // XP mult
        const increaseMultiplier = this.calculateXPMultiplier(player)
        increaseValue *= increaseMultiplier

        // Write XP to player
        iDP(player, progressDP, increaseValue)

        // Level-up if needed
        if (this.getProgress(player, skill) >= 100) {
            this.#increaseSkillLevel(player, skill)
        }
    }

    /**
     * Get player's skill level
     * @param {Player} player 
     * @param {Skill} skill 
     * @returns {number}
     */
    static getLevel(player, skill) {
        return gDP(player, this.#getLevelDP(skill), 0)
    }

    /**
     * Get player's progerss of a skill from 0 to 100
     * @param {Player} player 
     * @param {Skill} skill 
     * @returns {number}
     */
    static getProgress(player, skill) {
        return gDP(player, this.#getProgressDP(skill), 0)
    }

    static #progressDPCache = new Cache()
    /**
     * Get progress DP for a skill
     * @param {Skill} skill 
     * @returns {string}
     */
    static #getProgressDP(skill) {
        return this.#progressDPCache.get(skill, () => `skill:${skill}_progress`)
    }

    static #levelDPCache = new Cache()
    /**
     * Get level DP for a skill
     * @param {Skill} skill 
     * @returns {string}
     */
    static #getLevelDP(skill) {
        return this.#levelDPCache.get(skill, () => `skill:${skill}_level`)
    }

    /**
     * Calculate XP multiplier for a player
     * @param {Player} player 
     * @returns {number}
     */
    static calculateXPMultiplier(player) {
        let increaseMultiplier = 1

        // Rings
        const feetItemId = getItem(player, 'feet')?.typeId
        const offhandItemId = getItem(player, 'offhand')?.typeId

        if (feetItemId in xpBonusRingsList) increaseMultiplier += xpBonusRingsList[feetItemId]
        if (offhandItemId in xpBonusRingsList) increaseMultiplier += xpBonusRingsList[offhandItemId]

        // Amul
        if (checkForItem(player, "Legs", "arx:amul_higher_knowledge")) increaseMultiplier += 0.5

        // By traits
        if (checkForTrait(player, 'genius')) increaseMultiplier += 0.1
        if (checkForTrait(player, 'lazy')) increaseMultiplier -= 0.1

        return increaseMultiplier
    }

    /**
     * Increase player's skill level. Ignores math. All math is calculated in increaseSkillPregress()
     * @param {Player} player 
     * @param {Skill} skill 
     */
    static #increaseSkillLevel(player, skill) {
        if (!(skill in skills)) {
            console.warn(`Trying to increase as level of a non-existent skill ${skill}`)
            return undefined
        }

        // Set values
        iDP(player, this.#getLevelDP(skill))
        sDP(player, this.#getProgressDP(skill), 0)

        // Report
        const newLevel = this.getLevel(player, skill)
        player.runCommand('playsound player.skill.levelUp @s ~ ~ ~')
        player.sendMessage(`${this.#getSkillIcon(skill, newLevel)} §e§l${fl(player, 'skills.levelup')}§r§f: ${skills[skill].nameRU}§f: §a${newLevel}\n`)
    }

    /**
     * Get a text about player's skills
     * @param {Player} player 
     * @returns {string}
     */
    static getSkillsData(player) {
        // Собираем все навыки в массив с их данными
        const skillsArray = Object.keys(skills).map(skill => {
            const level = Math.max(0, this.getLevel(player, skill))
            const progress = this.getProgress(player, skill)
            return { skill, level, progress };
        });

        // Сортируем по уровню: сначала высокие
        skillsArray.sort((a, b) => b.level - a.level);

        let resultString = '';

        for (const { skill, level, progress } of skillsArray) {
            resultString += `\n${this.#getSkillIcon(skill, level)} §a${level}§f ур. ${skills[skill].nameRU}§f\n     `;

            const symb = 'I';
            const lineLength = 25;
            const progressClamped = Math.max(0, Math.min(100, Number(progress) || 0));
            const lengthDone = Math.max(0, Math.min(lineLength, Math.floor(lineLength * progressClamped / 100)));
            const lengthUndone = Math.max(0, lineLength - lengthDone);

            let progressString = '[§a' + symb.repeat(lengthDone) + `§r§l${symb}§r§8` + symb.repeat(lengthUndone) + `§f] (§a${Math.floor(progressClamped)}§fŨ)`;
            resultString += progressString;
        }

        return resultString;
    }

    /**
     * Returns a text about ways to increase different skills
     * @returns {string}
     */
    static getInfoAboutHowToIncreaseSkills() {
        let resultString = ''

        for (const skill in skills) {
            resultString += `${skills[skill].nameRU} §f${skills[skill].howToIncrease}\n${skills[skill].nameRU.slice(0, 2)}-----\n`
        }

        return resultString
    }

    /**
     * Returns a text about buffs that skills give
     * @returns {string}
     */
    static getInfoAboutSkillsBuffs() {
        let resultString = ''

        for (const skill in skills) {
            resultString += `${skills[skill].nameRU} §f${skills[skill].buff}\n${skills[skill].nameRU.slice(0, 2)}-----\n`
        }

        return resultString
    }

    /** 
     * Reset all skills
     * @param {Player} player 
     */
    static wipeSkills(player) {
        for (const skill in skills) {
            sDP(player, this.#getProgressDP(skill), 0)
            sDP(player, this.#getLevelDP(skill), 0)
        }
    }

    /**
     * Clear progress of all skills (but not levels)
     * @param {Player} player 
     */
    static wipeSkillsProgress(player) {
        for (const skill in skills) {
            sDP(player, this.#getProgressDP(skill), 0)
        }
    }

    /**
     * Get E-symbol code of an icon
     * @param {Skill} skill 
     * @param {number} level 
     * @returns {string}
     */
    static #getSkillIcon(skill, level) {
        // Базовый символ
        const base = 0xE000
        // Смещение
        const offsetByLevel = level < 15 ? Math.floor(level / 2) : 7
        const offset = skills[skill].iconIndex * 16 + offsetByLevel
        return String.fromCodePoint(base + offset)
    }
}

// Зарегистрированные навыки
export const skills = {
    'strength': {
        nameRU: "§cСила",
        howToIncrease: "повышается, когда вы наносите удары в ближнем бою, при этом увеличение навыка прямо зависит от нанесённого урона.",
        buff: "увеличивает базовый урон на 0.5.",
        iconIndex: 1,
    },
    'endurance': {
        nameRU: "§6Выносливость",
        howToIncrease: "повышается, когда вы сражаетесь в ближнем бою, будучи перегруженным, либо когда вы ходите с перегрузом.",
        buff: "увеличивает переносимый вес на 1",
        iconIndex: 2,
    },
    'running': {
        nameRU: "§2Бег",
        howToIncrease: "повышается, когда вы бежите без перегруза.",
        buff: "увеличивает скорость бега на 2Ũ.",
        iconIndex: 3,
    },
    'shooting': {
        nameRU: "§aСтрельба",
        howToIncrease: "повышается, когда вы стреляете и попадаете из дистанционного немагического оружия.",
        buff: "увеличивает точность и дальность стрельбы, а так же урон от стрел.",
        iconIndex: 4,
    },
    'mana': {
        nameRU: "§bМана",
        howToIncrease: "повышается, когда вы сотворяете заклинания, требующие небольшое количество маны.",
        buff: "увеличивает максимальную ману на 5.",
        iconIndex: 5,
    },
    'mp_regen': {
        nameRU: "§dРегенерация маны",
        howToIncrease: "повышается, когда вы сотворяете заклинания, требующие большое количество маны.",
        buff: "увеличивает скорость регенерации маны на 0.2.",
        iconIndex: 6,
    },
    'mp_range': {
        nameRU: "§bДистанция заклинаний",
        howToIncrease: "повышается, когда вы сотворяете заклинания на цель, которая далеко от вас.",
        buff: "увеличивает дистанцию заклинаний на 1 блок.",
        iconIndex: 11,
    },
    'hp': {
        nameRU: "§eСтойкость",
        howToIncrease: "повышается, когда вы получаете удары, при этом увеличение навыка прямо зависит от полученного урона.",
        buff: "увеличивает здоровье на сердце.",
        iconIndex: 7,
    },
    'swimming': {
        nameRU: "§bПлавание",
        howToIncrease: "повышается, когда вы плаваете.",
        buff: "увеличивает скорость плавания.",
        iconIndex: 8,
    },
    'fortitude': {
        nameRU: "§9Сила духа",
        howToIncrease: "повышается, когда у вас низкий уровень здоровья.",
        buff: "уменьшает время, которое вы пребываете в нокауте на 2 сек.",
        iconIndex: 9,
    },
    'blocking': {
        nameRU: "§vБлокирование",
        howToIncrease: "повышается, когда вы блокируете атаки.",
        buff: "уменьшает силу, с которой вас отбрасывает, когда вы блокируете атаку.",
        iconIndex: 10,
    }
}