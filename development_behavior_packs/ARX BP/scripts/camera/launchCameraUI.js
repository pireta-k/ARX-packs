import { ActionFormData } from "@minecraft/server-ui"
import { editTimeline } from './editTimeline'
import { indicateTimecodes } from './indicateTimecodes'
import { ssDP } from "../arxLib/DPOperations"

// Переменная, хранящая все таймлайны камеры всех игроков
export let timeline = {}

// Выводим экранчик с опциями навыков
export function launchCameraUI(player) {

    // Создаем таймлайн, если его не было вообще
    if (!(player.name in timeline)) {
        timeline[player.name] = []
    }

    const form = new ActionFormData()
        .title("Камера")
        
        .button(`Редактировать таймлайн\n§o${timeline[player.name].length} элементов`, 'textures/ui/camera/edit_timeline')
        .button("Запустить камеру", 'textures/ui/camera/launch_camera')
        .button("Подсветить существующие таймкоды", 'textures/ui/camera/indicate_timecodes')

        .show(player).then(response => {

            if (response.selection === 0) {
                editTimeline(player)
            } else if (response.selection === 1) {
                if (timeline[player.name].length === 0) {
                    player.runCommand(`tellraw @s { "rawtext": [ { "text": "§cВаш таймлайн пуст, невозможно запустить камеру." } ] }`)
                } else if (timeline[player.name].length === 1) {
                    player.runCommand(`tellraw @s { "rawtext": [ { "text": "§cУ вас установлен только стартовый таймкод. Для работы камеры необходимо минимум два таймкода." } ] }`)
                } else {
                    ssDP(player, 'camera:activeCamera', true)
                    ssDP(player, 'camera:numOfProcessedTimecodes', 0)
                    ssDP(player, 'camera:tickCountdownToNextTimecode', 0)
                }
            } else if (response.selection === 2) {
                if (timeline[player.name].length === 0) {
                    player.runCommand(`tellraw @s { "rawtext": [ { "text": "§cВы не создали ни одного таймкода. Чтобы создать их, зайдите в меню <Редактировать таймлайн>." } ] }`)
                }
                else {
                    indicateTimecodes(player)
                }
            }
        })
}