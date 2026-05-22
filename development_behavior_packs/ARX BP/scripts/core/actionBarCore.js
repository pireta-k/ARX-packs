import { world } from "@minecraft/server"

let actionBarGlobal = {}
/* Структура
actionBarGlobal = {
    "EllisyDL": {
        "attackCD": {
            time: 5
            message: 'Откат атаки: 5 тактов'
        }
    }
}
*/

// Функция посылает сообщение игроку в actionBar
// iD - идентефикатор отображения. Нужен на случай, чтобы ранее заданная инструкция к выводу перекрывалась полученной новой с тем же iD
// message - сообщение для вывода в actionBar
// time - время в тактах, которое нужно выводить данное сообщение
export function sendToActionBar(player, iD, message, time) {
    if (!iD || !message || !time) {
        console.warn('sendToActionBar вызвана без необходимых переменных')
        return
    }
    actionBarGlobal[player.name] ??= {}
    actionBarGlobal[player.name][iD] = { 'time': time, 'message': message }
}

// Отображение в actionbar. Если есть несколько актуальных сообщений, отображаются через |, наприм Откат атаки 1 | Мана 10 | Вы промокли
export function actionBarCoreTick() {
    for (const player of world.getPlayers()) {
        if (player.name in actionBarGlobal) {
            let messagesToDisplay = [] // Те messages, которые нам нужно в этом такте вывести на экран
            for (const key in actionBarGlobal[player.name]) {
                messagesToDisplay.push(actionBarGlobal[player.name][key]['message'])
                actionBarGlobal[player.name][key]['time'] -= 1
                if (actionBarGlobal[player.name][key]['time'] <= 0) {
                    delete actionBarGlobal[player.name][key]
                    continue
                }
            }
            if (messagesToDisplay.length > 0) {
                player.onScreenDisplay.setActionBar(messagesToDisplay.join(" §r§7|§f "));
            }
        }
    }
}