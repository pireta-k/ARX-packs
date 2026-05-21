import { queueCommand } from './commandQueue'
import { ssDP } from './arxLib/DPOperations';

// Анализ эмоций
export function emote(player, message) {

    let emotion = message.slice(3)
    let emotion_list = ["sit", "sit_alt", "lie_on_back", "lie_on_belly", "lie_star", "lie_on_right_side", "lie_on_left_side", "sit_like_gangster", "show_item", "hands_up", "half_sit", "facepalm", "proud", "sad", "whiny", "monk_pose", "think", "sit_on_knees", "bind_right_arm", "bind_left_arm"]
    let emotion_list_ru_visual = ["Сесть", "Сесть альтерн.", "Лечь на спину", "Лечь на живот", "Лечь звездочкой", "Лечь на правый бок", "Лечь на левый бок", "Гангстер", "Показать предмет", "Руки вверх", "Полусидя", "Фейспалм", "Гордость", "Грусть", "Плакать", "Поза монаха", "Размышлять", "Сесть на колени", "Свободное движение правой рукой", "Свободное движение левой рукой"];

    if (message === "!!") { // Введено просто два восклицательных знака. Надо вывести список эмоций
        let emotion_string = emotion_list_ru_visual
            .map((single_emotion, index) => `§d${index + 1}§a ${single_emotion}`) // Добавляем номер к каждому элементу
            .join("§f, ") + "§f"

        queueCommand(player, `tellraw @s { "rawtext": [ { "text": "Эмоции: ${emotion_string}." } ] }`)
    }
    else if (message[2] != " ") {
        queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cКажется, вы забыли поставить пробел между !! и номером эмоции." } ] }`)
    }
    else if (/^\d+$/.test(emotion) == true) {
        if (player.getTags().includes("is_moving")) {
            queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cЧтобы запустить анимацию, встаньте на одном месте." } ] }`)
        }
        else if (player.getTags().includes("is_riding")) {
            queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cЧтобы запустить анимацию, слезьте с того, на чем сидите." } ] }`)
        }
        else if (!player.getTags().includes("on_ground")) {
            queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cЧтобы запустить анимацию, прекратите летать." } ] }`)
        }
        else {
            if (parseInt(emotion) > 0 && parseInt(emotion) <= emotion_list.length) {
                ssDP(player, 'hasEverEmoted', true)

                queueCommand(player, `playanimation @s animation.emote.${emotion_list[parseInt(emotion) - 1]} a 0.1 "query.is_moving || query.is_sneaking || q.property('arx:is_knocked') == true"`)
                queueCommand(player, "tag @s add is_emoting_via_arx_command")
            }
            else {
                queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cНет эмоции с таким номером." } ] }`)
            }
        }
    }
    else {
        queueCommand(player, `tellraw @s { "rawtext": [ { "text": "§cВведите номер эмоции, а не текст, например <!! 5>." } ] }`)
    }
}