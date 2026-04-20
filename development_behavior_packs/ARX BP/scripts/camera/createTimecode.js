import { ModalFormData } from "@minecraft/server-ui"
import { timeline } from './launchCameraUI'
import { editTimeline } from "./editTimeline"

export function createTimecode(player) {

    // Определяем таймлайн игрока
    let playerTimeLine = timeline[player.name];

    // Определяем позицию головы игрока
    const playerPosition = {
        x: player.location.x,
        y: player.location.y + 1.5,
        z: player.location.z
    };

    // Определяем поворот игрока
    const playerRotation = player.getViewDirection();

    const form = new ModalFormData()
    form.title("Создание таймкода")
    form.label('[§ai§f] Таймкод создастся на ваших координатах с вашим повторотом камеры.')
    form.divider()
    form.textField('Время движения камеры, сек', "Число или дробное число", { tooltip: 'Время движения камеры - это время, которое камера будет двигаться от предыдущего таймкода до того, который вы сейчас создаете. Вводите либо целым числом, либо дробью через точку. Иначе таймкод не создастся.' })
    form.divider()
    form.dropdown('Интерполяция', ['Линейная', 'Плавная', 'Плавная ускоряющаяся', 'Плавная замедляющаяся', 'Отскок в начале', 'Отскок в конце', 'Отскок в начале и конце'], { defaultValueIndex: 1, tooltip: 'Интерполяция - это способ управления движением камеры между таймкодами. Разные интерполяции дают разные пути движения камеры.' })
    form.divider()
    form.submitButton('Сохранить таймкод')

    form.show(player).then(response => {
        if (response.formValues) {
            const lengthStr = response.formValues[2] // Получаем строку
            const lengthSec = parseFloat(lengthStr)   // Пытаемся преобразовать в число

            let timecodeInterpolation
            switch (response.formValues[4]) {
                case 0:
                    timecodeInterpolation = 'linear'
                    break
                case 1:
                    timecodeInterpolation = 'in_out_cubic'
                    break
                case 2:
                    timecodeInterpolation = 'in_cubic'
                    break
                case 3:
                    timecodeInterpolation = 'out_cubic'
                    break
                case 4:
                    timecodeInterpolation = 'in_bounce'
                    break
                case 5:
                    timecodeInterpolation = 'out_bounce'
                    break
                case 6:
                    timecodeInterpolation = 'in_out_bounce'
                    break
                default:
                    console.error('Неожиданный результат в timecodeInterpolation')
            }

            if (!isNaN(lengthSec)) {
                playerTimeLine.push({
                    position: playerPosition,
                    rotation: playerRotation,
                    lengthSec: lengthSec,
                    interpolation: timecodeInterpolation
                })
            }
        }

        editTimeline(player) //editTimeline все равно вызывается, даже если response.formValues пустой
    })
}

export function createFirstTimecode(player) {
    // Определяем таймлайн игрока
    let playerTimeLine = timeline[player.name];

    // Определяем позицию головы игрока
    const playerPosition = {
        x: player.location.x,
        y: player.location.y + 1.5,
        z: player.location.z
    };

    // Определяем поворот игрока
    const playerRotation = player.getViewDirection();

    playerTimeLine.push({
        position: playerPosition,
        rotation: playerRotation,
        lengthSec: 0,
        interpolation: 'linear'
    })
}