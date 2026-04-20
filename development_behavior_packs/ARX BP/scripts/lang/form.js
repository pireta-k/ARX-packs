import { setPlayerLanguage } from "./fetchLocalization"
import { ActionFormData } from "@minecraft/server-ui"
import { fl } from "./fetchLocalization"

export async function showLanguageForm(p) {
    const langform = new ActionFormData()
        .title(fl(p, 'lobby.registration.lang.title'))
        .body(fl(p, 'lobby.registration.lang.body'))
        .button("English", 'textures/ui/registration/lang_en')
        .button("Русский", 'textures/ui/registration/lang_ru')

    const response = await langform.show(p)

    if (response.selection === 0) {
        setPlayerLanguage(p, 'en')
    } else if (response.selection === 1) {
        setPlayerLanguage(p, 'ru')
    }
    // Returns true if the player has answered the form
    return typeof response.selection === 'number'
}