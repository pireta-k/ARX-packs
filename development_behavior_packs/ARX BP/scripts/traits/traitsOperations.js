import { traitsList } from './traitsList'
import { queueCommand } from '../commandQueue'
import { gDP, sDP } from '../arxLib/DPOperations';

// Черты хранятся в dynamicProperty игрока вида trait:traitId = ( 0 === нет черты || 1 === есть черта || 2 === закреп )

// Объект, содержащий в себе все черты
const allTraits = { ...traitsList.positive, ...traitsList.neutral, ...traitsList.negative }

export function acquireTrait(player, weights = undefined, traitName = undefined) {



    // === Случай 1: Указана конкретная черта ===
    if (traitName) {
        // Проверяем, существует ли такая черта в любом из списков
        if (Object.hasOwn(allTraits, traitName)) {
            accureTrait(player, traitName)
        } else {
            console.warn(`[Traits] Попытка выдать несуществующую черту: ${traitName} игроку ${player.name}`);
        }

        return; // Завершаем, если черта была указана
    }



    // === Случай 2: Выбор случайной черты по весам ===
    if (!weights || weights.length !== 3) {
        console.warn(`[Traits] Некорректные веса (${weights}) для игрока ${player.name}.`);
        return
    }

    // Получаем все черты по категориям (исключаем закреплённые)
    const categories = [
        Object.keys(traitsList.positive).filter(key => player.getDynamicProperty(`trait:${key}`) !== 2),
        Object.keys(traitsList.neutral).filter(key => player.getDynamicProperty(`trait:${key}`) !== 2),
        Object.keys(traitsList.negative).filter(key => player.getDynamicProperty(`trait:${key}`) !== 2)
    ]

    // Выбираем категорию по весам
    const categoryIndex = weightedRandomIndex(weights);
    const availableTraits = categories[categoryIndex];

    if (availableTraits.length === 0) {
        console.warn(`[Traits] Нет доступных черт в категории ${categoryIndex} для игрока ${player.name}`);
        return
    }

    // Выбираем случайную черту из категории
    const randomTraitKey = availableTraits[Math.floor(Math.random() * availableTraits.length)];

    // Устанавливаем черту
    accureTrait(player, randomTraitKey)
}



// Функция удаляет черты
export function clearTraits(player, clearLocked = false) {
    // Если чистим все черты
    if (clearLocked) {
        Object.keys(allTraits).forEach(trait => {
            sDP(player, `trait:${trait}`, undefined)
        })
    }
    // Если чистим только незакреплённые
    else {
        Object.keys(allTraits).forEach(trait => {
            if (player.getDynamicProperty(`trait:${trait}`) !== 2) {
                sDP(player, `trait:${trait}`, undefined)
            }
        })
    }
}



// Функция проверки на наличие черты. Уведомляет, если запрошена несуществующая черта
export function checkForTrait(player, traitId) {
    if (!(traitId in allTraits)) {
        console.warn(`[Traits] запрос на наличие незарегистрированной в системе черты ${traitId} у игрока ${player.name}`)
    }

    return gDP(player, `trait:${traitId}`) > 0
}



// Функция выдает игроку нужную черту
function accureTrait(player, traitId) {

    // Определяем данные о черте
    let traitType
    let traitNameRU
    let traitDescriptionRU

    if (Object.keys(traitsList.positive).includes(traitId)) { traitType = 0; traitNameRU = traitsList.positive[traitId].name; traitDescriptionRU = traitsList.positive[traitId].description }
    else if (Object.keys(traitsList.neutral).includes(traitId)) { traitType = 1; traitNameRU = traitsList.neutral[traitId].name; traitDescriptionRU = traitsList.neutral[traitId].description }
    else if (Object.keys(traitsList.negative).includes(traitId)) { traitType = 2; traitNameRU = traitsList.negative[traitId].name; traitDescriptionRU = traitsList.negative[traitId].description }
    else { console.warn(`[Traits] попытка выдать несуществующую черту ${traitId} игроку ${player.name}`); return }

    // Выдаем черту
    const traitDP = `trait:${traitId}`
    let locked = false
    const currentTraitLockStatus = player.getDynamicProperty(traitDP)

    if (currentTraitLockStatus === 1) {
        locked = true
        sDP(player, traitDP, 2)
    }
    else if (currentTraitLockStatus === 2) {
        // Мы не можем выдать черту, так как она уже есть и закреплена
        return
    }
    else {
        sDP(player, traitDP, 1)
    }

    reportAboutAcquiringTrait(player, traitNameRU, traitDescriptionRU, traitType, locked)
}


// Функция сообщает игроку о том, что черта выдана
function reportAboutAcquiringTrait(player, traitName, traitDescription, type, is_locked = false) {
    // Type может быть 0 = positive || 1 = neutral || 2 = negative

    let traitTypeRU
    if (type === 0) { traitTypeRU = '§eположительная' }
    else if (type === 1) { traitTypeRU = '§bнейтральная' }
    else if (type === 2) { traitTypeRU = '§cотрицательная' }
    else { console.warn(`[Traits] Неожиданный аргумент type ${type} в reportAboutAcquiringTrait у ${player.name}`) }

    let getTypeRU
    if (is_locked) { getTypeRU = '§l§dЗАКРЕПЛЕНА' }
    else if (!is_locked) { getTypeRU = 'Получена' }
    else { console.warn(`[Traits] Неожиданный аргумент is_locked ${is_locked} в reportAboutAcquiringTrait у ${player.name}`) }

    let icon
    if (is_locked) {
        if (type === 0) { icon = '' }
        else if (type === 1) { icon = '' }
        else { icon = '' }
    } else {
        if (type === 0) { icon = '' }
        else if (type === 1) { icon = '' }
        else { icon = '' }
    }

    // Пишем в чат
    player.sendMessage(`${icon} ${getTypeRU}§r§f ${traitTypeRU} черта характера§f: ${traitName}\n§7§o(${traitDescription})`)

    // Шлём в титл
    queueCommand(player, `title @s subtitle ${getTypeRU}§r§f черта: ${traitTypeRU.slice(0, 2)}${traitName}`)
    queueCommand(player, `title @s title ${icon}`)
}



function weightedRandomIndex(weights) {
    if (!weights || weights.length === 0) {
        throw new Error("[Traits] Массив весов должен содержать хотя бы один элемент.");
    }

    const clampedWeights = weights.map(w => Math.max(0, w)); // обнуляем отрицательные
    const totalWeight = clampedWeights.reduce((a, b) => a + b, 0);

    if (totalWeight <= 0) {
        return Math.floor(Math.random() * weights.length);
    }

    const rand = Math.random() * totalWeight;
    let sum = 0;

    for (let i = 0; i < clampedWeights.length; i++) {
        sum += clampedWeights[i];
        if (rand < sum) return i;
    }

    return weights.length - 1; // фолбэк
}