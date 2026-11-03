import { ActionFormData } from "@minecraft/server-ui"
import { XP } from "../skills"


// Выводим экранчик с опциями навыков
export function infoSkillsScreen(player) {
    const form = new ActionFormData()
        .title("Навыки")
        .button("Мои навыки", 'textures/ui/info/about_skills_my_skills')
        .button("Как прокачать навыки", 'textures/ui/info/about_skills_levelup')
        .button("Бонусы от навыков", 'textures/ui/info/about_skills_buffs')

        .show(player)
        .then((response) => {
            if (response.selection === 0) {
                new ActionFormData()
                    .title("Мои навыки")
                    .body(XP.getSkillsData(player))
                    .show(player)

            } else if (response.selection === 1) {
                new ActionFormData()
                    .title("Как прокачать навыки")
                    .body(XP.getInfoAboutHowToIncreaseSkills())
                    .show(player)

            } else if (response.selection === 2) {
                new ActionFormData()
                    .title("Бонусы от навыков")
                    .body(`За §a1 уровень§f навыка:\n\n${XP.getInfoAboutSkillsBuffs()}`)
                    .show(player)
            }
        })
}