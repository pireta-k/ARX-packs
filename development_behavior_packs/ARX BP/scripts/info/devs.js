import { ActionFormData } from "@minecraft/server-ui"
import { fl } from "../lang/fetchLocalization"

// Arx developers
export function infoAboutArxDevs(p) {
    const form = new ActionFormData()
        .title(fl(p, 'info.devs.title'))
        .body(getBodyText(p))
        .show(p)
}

function getBodyText(p) {
    let bodyText = ''
    // Lead dev
    bodyText += ('§e' + fl(p, 'info.devs.lead') + '§f\n')
    bodyText += 'Kate (A.K.A. Pireta, Ellis)\n\n'

    // Music
    bodyText += ('§e' + fl(p, 'info.devs.music') + '§f\n')
    bodyText += 'Kevin Macleod\n\n'

    // Official Links
    bodyText += ('§e' + fl(p, 'info.devs.links') + '§f\n')
    bodyText += 'Telegram: §bt.me/arxult§f\n'
    bodyText += 'Discord: §bdiscord.gg/CngH7spGbn§f\n'
    bodyText += 'Github: §bgithub.com/pireta-k/ARX-packs§f\n'
    bodyText += '\n'
    bodyText += 'You can report bugs to §bgithub.com/pireta-k/ARX-packs/issues§f\n'
    bodyText += '\n'

    // Thanks
    bodyText += ('§e' + fl(p, 'info.devs.thanks') + '§f\n')
    for (const dev of specialThanks) {
        bodyText += (dev + '\n')
    }


    return bodyText
}

const specialThanks = ['Serty & RPG++', 'Zelenchik', 'Magik', 'Максик', 'Ирочка', 'Tima', 'Fanat']