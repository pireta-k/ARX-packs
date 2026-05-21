// Задача функции - вычислить текущий канал и вернуть его индекс
// channels - число каналов, которое мы рассматриваем
// considerChannelHolding - стоит ли нам обращать внимание на правило удержания канала?

import { ssDP } from "../arxLib/DPOperations";

export function getActiveStaffChannel(player, channels, considerChannelHolding = true, forceChannelHolding = false) {

    if (!channels) return

    // Если нам не надо обращать внимание на удержание канала
    if (!considerChannelHolding) {
        return getChannel(player, channels)
    }
    // Если надо
    else {
        // Мы на присяде, и у нас выбор каналов должен работать по правилу поворота камеры
        if (player.isSneaking || forceChannelHolding) {
            // Запоминаем текущий канал
            const channel = getChannel(player, channels)
            ssDP(player, 'holdedMagicChannel', channel)
            return channel
        }
        // Мы не на присяде. Надо вернуть канал, который был последним удержанным
        else {
            const holdedChannel = player.getDynamicProperty('holdedMagicChannel')
            if (channels >= holdedChannel) return holdedChannel
            else return channels
        }
    }
}

// Получаем активный канал по правилу поворота камеры
function getChannel(player, channels) {
    const yRotation = player.getViewDirection().y;

    // Нормализуем диапазон с [-1..1] до [0..1]
    const yRotationNormalized = yRotation * 0.5 + 0.5

    // Определяем шаг между двумя точками
    const step = 1 / channels

    let currentStep = 0
    // Считаем канал, поднимаясь с низких каналов наверх
    for (let i = channels; i > 0; i--) {
        currentStep += step
        if (currentStep > yRotationNormalized) {
            return i
        }
    }

    // Фоллбэк, если что-то пошло не так
    return 1
}