import { ActionFormData } from "@minecraft/server-ui"

import { infoAboutCharacter } from "./infoAboutCharacter"
import { infoAboutTastes } from "./infoAboutTastes"
import { infoSkillsScreen } from "./infoSkillsScreen"
import { infoAboutStats } from "./infoAboutStats"
import { infoAboutStatistics } from "./infoAboutStatistics"
import { infoAboutAchievements } from "./infoAboutAchievements"
import { knownSpellsBook } from "./knownSpellsBook"
import { infoAboutTraits } from "./infoAboutTraits"
import { arxSettings } from "./arxSettings"
import { guide } from "./guide"
import { infoAboutArxDevs } from "./devs"

import { getStabilityTestResult } from '../stabilityTesting'

// Выводим экранчик с книжки инфо
export function infoScreen(player) {
    if (player.getDynamicProperty('hasRegisteredCharacter') === true) { // Если персонаж зарегистрирован
        let form = new ActionFormData()

        if (player.getDynamicProperty("myRule:canSeeServerSpeedInInfoBook") === true) {
            const serverSpeed = getStabilityTestResult()
            if (serverSpeed) {
                form = form.body(`Производительность сервера: ${serverSpeed}`); // Добавляем .body() если serverSpeed есть
            } else {
                form = form.body('Измерения стабильности на этом хосте ещё не происходило.'); // Добавляем .body() если serverSpeed нет
            }
        }

        form.title("Информация")
        form.button("Гид", 'textures/ui/info/guide')
        form.button("О персонаже", 'textures/ui/info/about_character')
        form.button("Навыки", 'textures/ui/info/about_skills')
        form.button("Открытые заклинания", 'textures/ui/info/known_spells_book')
        form.button("Характеристики", 'textures/ui/info/about_stats')
        form.button("Черты характера", 'textures/ui/info/about_traits')
        form.button("Вкусы", 'textures/ui/info/about_tastes')
        form.button("Достижения", 'textures/ui/info/about_achievements')
        form.button("Настройки Аркса", 'textures/ui/info/options')
        form.button("Статистика", 'textures/ui/info/about_statistics')
        form.button("Авторы и разработчики", 'textures/ui/info/about_authors')

        form.show(player).then((response) => {
            switch (response.selection) {
                case 0: guide(player); break;
                case 1: infoAboutCharacter(player); break;
                case 2: infoSkillsScreen(player); break;
                case 3: knownSpellsBook(player); break;
                case 4: infoAboutStats(player); break;
                case 5: infoAboutTraits(player); break;
                case 6: infoAboutTastes(player); break;
                case 7: infoAboutAchievements(player); break;
                case 8: arxSettings(player); break;
                case 9: infoAboutStatistics(player); break;
                case 10: infoAboutArxDevs(player); break
            }
        })
    } else {
        player.sendMessage("§cВы не имеете зарегистрированного персонажа, невозможно вызвать <Инфо>.")
    }
}