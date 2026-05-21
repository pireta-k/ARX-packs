// Операции с навыками

import { queueCommand } from './commandQueue'
import { checkForItem } from './items/checkForItem'
import { checkForTrait } from './traits/traitsOperations'
import { iDP, ssDP } from './arxLib/DPOperations'

// Увеличиваем прогресс навыка на inputValue, учитывая срезание прогресса от уровня
export function increaseSkillProgress(player, skill, inputValue) {

    // Отрицательный/нулевой прирост навыка - запрещаем начисление
    if (inputValue <= 0) {
        return undefined
    }

    // Если улучшаемого навыка не существует
    if (!(skill in registeredSkills)) {
        console.warn(`Попыка увеличить прогресс незарегистрированного навыка ${skill}`)
        return undefined
    }

    // Если мы в креативе или наблюдателе
    if (player.getGameMode() === 'Creative' || player.getGameMode() === 'Spectator') {
        return undefined
    }

    // Определяем, насколько нужно улучшить навык
    let increaseValue = inputValue / (1.92 ** player.getDynamicProperty(`skill:${skill}_level`))

    // Определяем множитель получаемого опыта
    const increaseMultiplier = calculateXPMultiplier(player)

    // Домножаем получаемый опыт на множитель
    increaseValue *= increaseMultiplier

    // Добавляем опыт игроку
    iDP(player, `skill:${skill}_progress`, increaseValue)


    // Проверяем, надо ли делать левелап
    if (player.getDynamicProperty(`skill:${skill}_progress`) >= 100) {
        increaseSkillLevel(player, skill)
    }
}

export function calculateXPMultiplier(player) {
    // Настраиваем множитель получаемного опыта
    let increaseMultiplier = 1

    if (checkForItem(player, "Feet", "arx:ring_lamenite_zircon")) { increaseMultiplier += 0.5 }
    if (checkForItem(player, "Offhand", "arx:ring_lamenite_zircon")) { increaseMultiplier += 0.5 }

    if (checkForItem(player, "Feet", "arx:ring_malafiotironite_zircon")) { increaseMultiplier += 0.4 }
    if (checkForItem(player, "Offhand", "arx:ring_malafiotironite_zircon")) { increaseMultiplier += 0.4 }

    if (checkForItem(player, "Feet", "arx:ring_caryite_zircon")) { increaseMultiplier += 0.3 }
    if (checkForItem(player, "Offhand", "arx:ring_caryite_zircon")) { increaseMultiplier += 0.3 }

    if (checkForItem(player, "Feet", "arx:ring_naginitis_zircon")) { increaseMultiplier += 0.2 }
    if (checkForItem(player, "Offhand", "arx:ring_naginitis_zircon")) { increaseMultiplier += 0.2 }

    if (checkForItem(player, "Feet", "arx:ring_gold_zircon")) { increaseMultiplier += 0.1 }
    if (checkForItem(player, "Offhand", "arx:ring_gold_zircon")) { increaseMultiplier += 0.1 }

    if (checkForItem(player, "Feet", "arx:ring_aluminum_zircon")) { increaseMultiplier += 0.05 }
    if (checkForItem(player, "Offhand", "arx:ring_aluminum_zircon")) { increaseMultiplier += 0.05 }

    // Amul
    if (checkForItem(player, "Legs", "arx:amul_higher_knowledge")) { increaseMultiplier += 0.5 }

    // By traits
    if (checkForTrait(player, 'genius')) { increaseMultiplier += 0.1 }
    if (checkForTrait(player, 'lazy')) { increaseMultiplier -= 0.1 }

    // Отправляем increaseMultiplier в DP
    ssDP(player, 'xpMultiplier', increaseMultiplier)

    // Возврат
    return increaseMultiplier
}

// Увеличиваем уровень
export function increaseSkillLevel(player, skill) {
    if (player.getDynamicProperty('hasRegisteredCharacter') == true) {
        if (!(skill in registeredSkills)) {
            console.warn(`Попыка увеличить уровень незарегистрированного навыка ${skill}`)
            return undefined
        }

        // Изменяем properties игрока
        ssDP(player, `skill:${skill}_progress`, 0)
        iDP(player, `skill:${skill}_level`)
        // Отчитываемся в чат
        queueCommand(player, `playsound player.skill.levelUp @s ~ ~ ~`)
        queueCommand(player, `tellraw @s { "rawtext": [ { "text": "${getSkillIcon(skill, player.getDynamicProperty(`skill:${skill}_level`))} §e§lНовый уровень§r§f: ${registeredSkills[skill].nameRU}§f: §a${player.getDynamicProperty(`skill:${skill}_level`)}\n" } ] }`)
    }
}

// Возвращаем данные о навыках, отсортированные по уровню (от высокого к низкому)
export function getSkillsData(player) {
    // Собираем все навыки в массив с их данными
    const skillsArray = Object.keys(registeredSkills).map(skill => {
        const level = Math.max(0, Number(player.getDynamicProperty(`skill:${skill}_level`)) || 0);
        const progress = Number(player.getDynamicProperty(`skill:${skill}_progress`)) || 0;
        return { skill, level, progress };
    });

    // Сортируем по уровню: сначала высокие
    skillsArray.sort((a, b) => b.level - a.level);

    let resultString = '';

    for (const { skill, level, progress } of skillsArray) {
        resultString += `\n${getSkillIcon(skill, level)} §a${level}§f ур. ${registeredSkills[skill].nameRU}§f\n     `;

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

// Возвращаем данные о том как вкачать навык
export function getInfoAboutHowToIncreaseSkills(player) {
    let resultString = ''

    for (const skill in registeredSkills) {

        resultString += `${registeredSkills[skill].nameRU} §f${registeredSkills[skill].howToIncrease}\n${registeredSkills[skill].nameRU.slice(0, 2)}-----\n`
    }

    return resultString
}

// Возвращаем данные о баффах от 1 уровня навыка
export function getInfoAboutSkillsBuffs(player) {
    let resultString = ''

    for (const skill in registeredSkills) {

        resultString += `${registeredSkills[skill].nameRU} §f${registeredSkills[skill].buff}\n${registeredSkills[skill].nameRU.slice(0, 2)}-----\n`
    }

    return resultString
}

// Стираем уровень навыков и их прогресс
export function wipeSkills(player) {
    wipeSkillsProgress(player)

    for (const skill in registeredSkills) {
        ssDP(player, `skill:${skill}_level`, 0)
    }
}

// Стираем прогресс всех навыков
export function wipeSkillsProgress(player) {

    for (const skill in registeredSkills) {
        ssDP(player, `skill:${skill}_progress`, 0)
    }
}

// Получить иконку навыка
function getSkillIcon(skillName, level) {
    // Базовый символ
    const base = 0xE000
    // Смещение
    const offsetByLevel = level < 15 ? Math.floor(level / 2) : 7
    const offset = registeredSkills[skillName].iconIndex * 16 + offsetByLevel
    return String.fromCodePoint(base + offset)
}

// Зарегистрированные навыки
export const registeredSkills = {
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
    },
    // 'psycoSupport': {
    //     nameRU: "§3Поддержка",
    //     howToIncrease: "повышается, когда вы общаетесь с разумными в позитивном ключе.",
    //     buff: "игроки чувствуют себя лучше, когда вы общаетесь с ними не в негативных тонах.",
    // }
}