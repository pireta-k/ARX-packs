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
    bodyText += ('§e' + fl(p, 'info.devs.lead') + '§f\n')
    bodyText += 'Kate (A.K.A. Pireta, Ellis)\n\n'

    bodyText += ('§e' + fl(p, 'info.devs.music') + '§f\n')
    bodyText += 'Kevin Macleod\n\n'

    bodyText += ('§e' + fl(p, 'info.devs.thanks') + '§f\n')
    for (const dev of specialThanks) {
        bodyText += (dev + '\n')
    }


    return bodyText
}

const specialThanks = ['Zelenchik', 'Magik', 'Максик', 'Ирочка']