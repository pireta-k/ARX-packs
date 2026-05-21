import { ActionFormData } from "@minecraft/server-ui"
import { getScore } from "../arxLib/scoresOperations"

// Отображение UI статистики игрока
export function infoAboutStatistics(player) {
    const form = new ActionFormData()
        .title("Статистика")
        .body(getBodyText(player))
        .show(player)
}

function getBodyText(player) {
    let bodyText = ''

    bodyText += `Время игры: §d${getScore(player, 'time_h')}ч. §d${getScore(player, 'time_m')}мин.\n§f`

    bodyText += '§6===\n§f'

    bodyText += `Убито мобов: §d${getScore(player, 'count_mob_kills')}\n§f`

    bodyText += `Убито мини-боссов: §d${getScore(player, 'count_mbs_kills')}\n§f`

    bodyText += `Убито боссов: §d${getScore(player, 'count_bss_kills')}\n§f`

    bodyText += '§6===\n§f'

    bodyText += `Нокаутов: §d${getScore(player, 'count_death')}\n§f`

    bodyText += `Получено ударов: §d${getScore(player, 'count_hits')}\n§f`

    bodyText += `Пройденная дистанция: §d${Math.round(player.getDynamicProperty('statistics:distance'))} блоков\n§f`

    bodyText += `Сломано блоков: §d${getScore(player, 'count_broken_blocks')}\n§f`

    bodyText += `Поставлено блоков: §d${getScore(player, 'count_placed_blocks')}\n§f`

    bodyText += '§6===\n§f'

    bodyText += `Заклинаний сотворено: §d${getScore(player, 'count_spells')}\n§f`

    bodyText += `Маны потрачено: §d${getScore(player, 'count_spent_mp')} MP\n§f`

    bodyText += '§6===\n§f'

    bodyText += `Съедено Le Fishe: §d${player.getDynamicProperty('eatenLeFisheCounter')}`

    return bodyText
}