import { ActionFormData } from "@minecraft/server-ui"

// Отображение UI о персонаже
export function infoAboutCharacter(player) {
    const form = new ActionFormData()
        .title("§d§l" + player?.getDynamicProperty('name'))
        .body(getBodyText(player))
        .show(player)
}

function getBodyText(player) {
    let bodyText = ''

    if (player.getProperty("arx:gender") == 1) {
        bodyText += "§bМужской§f пол"
    } else {
        bodyText += "§dЖенский§f пол"
    }

    if (player.getDynamicProperty('height')) {
        bodyText += `\nРост: §a${player.getDynamicProperty('height')} §fсм`
    }

    if (player.getProperty('arx:bust_size') !== 0 || player.getProperty('arx:gender') !== 1) {
        bodyText += `\nРазмер груди: §a${player.getProperty('arx:bust_size')}`
    }

    return bodyText
}