import { system, world } from "@minecraft/server"
import { timeline } from './launchCameraUI'
import { ssDP, iDP } from "../arxLib/DPOperations";

// Обработка камеры
system.runInterval(() => {
    for (const player of world.getPlayers()) {

        // Если у игрока запущена камера
        if (player.getDynamicProperty('camera:activeCamera')) {

            // Определяем таймлайн игрока
            const playerTimeLine = timeline[player.name]

            // Отсчитываем кд до след таймкода
            iDP(player, 'camera:tickCountdownToNextTimecode', -1)

            // Если отсчет до след таймкода закончился
            if (player.getDynamicProperty('camera:tickCountdownToNextTimecode') <= 0) {

                // Если больше нет таймкодов (количество обработанных таймокодов равно количеству созданных игроком таймкодов)
                if (player.getDynamicProperty('camera:numOfProcessedTimecodes') === playerTimeLine.length) {
                    ssDP(player, 'camera:activeCamera', false)
                    player.runCommand('camera @s clear')
                }
                // Если таймкоды остались
                else {
                    const currentTimecode = playerTimeLine[player.getDynamicProperty('camera:numOfProcessedTimecodes')]
                    // Выставляем камеру
                    // Вычисляем 
                    const { yaw, pitch } = convertViewDirectionToYawPitch(currentTimecode.rotation)
                    player.runCommand(`camera @s set minecraft:free ease ${currentTimecode.lengthSec} ${currentTimecode.interpolation} pos ${currentTimecode.position.x} ${currentTimecode.position.y} ${currentTimecode.position.z} rot ${pitch} ${yaw}`)

                    // Выставляем кд
                    ssDP(player, 'camera:tickCountdownToNextTimecode', currentTimecode.lengthSec * 20)
                }

                // Увеличиваем счетчик обработанных таймкодов
                iDP(player, 'camera:numOfProcessedTimecodes')
            }
        }
    }
}, 1);

function convertViewDirectionToYawPitch(rotXYZ) {
    const x = rotXYZ.x;
    const y = rotXYZ.y;
    const z = rotXYZ.z;

    // Вычисляем горизонтальный угол (yaw)
    let yaw = Math.atan2(-x, z) * (180 / Math.PI);

    // Нормализуем yaw в диапазон [-180, 180)
    yaw = yaw % 360;
    if (yaw > 180) {
        yaw -= 360;
    } else if (yaw < -180) {
        yaw += 360;
    }

    // Вычисляем вертикальный угол (pitch)
    let pitch = -Math.asin(y) * (180 / Math.PI);
    // Ограничиваем pitch в диапазон [-90, 90]
    pitch = Math.max(-90, Math.min(90, pitch));

    return { yaw, pitch };
}