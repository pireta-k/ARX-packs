import { ActionFormData } from "@minecraft/server-ui"
import { getScore } from "../scoresOperations"
import { calculateXPMultiplier } from "../skillsOperations"
import { defineCastDistance } from "../magic/spells/castJSSpell"
import { gDP } from "../DPOperations"

// UI
export function infoAboutStats(p) {
    // Recalculate stats
    calculateXPMultiplier(p)
    defineCastDistance(p)

    // Show
    const form = new ActionFormData()
        .title("Характеристики")
        .body(getBodyText(p))
        .show(p)
}

function getBodyText(p) {
    let bodyText = ''

    bodyText += "§e|§f "

    {
        switch (gDP(p, 'stressLevel')) {
            case 4:
                bodyText += ' Стресс 4 (макс.) уровня.\n§e|§f Характеристики §4сильно понижены§f'
                break
            case 3:
                bodyText += ' Стресс 3 уровня.\n§e|§f Характеристики §cпонижены§f'
                break
            case 2:
                bodyText += ' Стресс 2 уровня.\n§e|§f Характеристики §eнемного понижены§f'
                break
            case 1:
                bodyText += ' Стресс 1 уровня.\n§e|§f Характеристики не изменены'
                break
            case 0:
                bodyText += ' Нейтральное настроение.\n§e|§f Характеристики не изменены'
                break
            case -1:
                bodyText += ' Счастье 1 уровня.\n§e|§f Характеристики не изменены'
                break
            case -2:
                bodyText += ' Счастье 2 уровня.\n§e|§f Характеристики §aнемного повышены§f'
                break
            case -3:
                bodyText += ' Счастье 3 уровня.\n§e|§f Характеристики §aповышены§f'
                break
            case -4:
                bodyText += ' Счастье 4 (макс.) уровня.\n§e|§f Характеристики §aсильно повышены§f'
                break
            default:
                bodyText += 'Непредвиденная ошибка определения состояния счастья'
                console.warn('Непредвиденная ошибка определения состояния счастья при использовании <инфо> у ' + p.name)
        }

    }

    bodyText += "\n§8|§f\n"

    bodyText += "§c|§f " + `Базовый урон: §b${gDP(p, 'basicStrength')}§f\n`

    bodyText += "§c|§f " + `Загруженность: §b${gDP(p, 'weighLoading')}§f из§b ${gDP(p, 'weighLimit')}§f\n`

    bodyText += "§8|§f\n"

    bodyText += "§d|§f " + `Макс мана: §b${gDP(p, 'maxMp')}§f\n`

    bodyText += "§d|§f " + `Регенерация маны: §b${gDP(p, 'mpRegenPower').toFixed(2)}§f в сек.\n`

    bodyText += "§d|§f " + `Дальность заклинаний: §b${gDP(p, 'spellDistance')}§f блоков\n`

    bodyText += "§8|§f\n"

    bodyText += "§a|§f " + `Точность стрельбы: §b${p.getProperty("arx:ranged_attack_accuracy")}§f §7§o(20 = макс.)§r§f\n`

    bodyText += "§a|§f " + `Скорость: §b${gDP(p, 'speedPower')}§fŨ\n`

    bodyText += "§a|§f " + `Усиление прыжка: §b${gDP(p, 'jumpPower')}§f\n`

    bodyText += "§8|§f\n"

    bodyText += "§6|§f " + `Увеличение получаемого опыта: §b${gDP(p, 'xpMultiplier')}§fx\n`

    return bodyText
}