import { ActionFormData } from "@minecraft/server-ui"

import { infoAboutCharacter } from "./infoAboutCharacter"
import { infoAboutTastes } from "./infoAboutTastes"
import { infoSkillsScreen } from "./infoSkillsScreen"
import { infoAboutStats } from "./infoAboutStats"
import { infoAboutStatistics } from "./infoAboutStatistics"
import { infoAboutAchievements } from "./infoAboutAchievements"
import { knownSpellsBook } from "./knownSpellsBook"
import { infoAboutTraits } from "./infoAboutTraits"
import { arxSettings, arxGlobalSettings } from "./arxSettings"
import { infoAboutArxDevs } from "./devs"
import { questsInfo } from '../quests'

import { getStabilityTestResult } from '../stabilityTesting'
import { gDP } from "../DPOperations"
import { fl } from "../lang/fetchLocalization"
import { isAdmin } from "../admin"

// Show to player the main info screen
export function infoScreen(player) {

    // No character
    if (!gDP(player, 'hasRegisteredCharacter')) {
        player.sendMessage("§cВы не имеете зарегистрированного персонажа, невозможно вызвать <Инфо>.")
        return
    }

    // All info options
    let infoOptions = {
        character: {
            icon: 'textures/ui/info/about_character',
            exe: () => infoAboutCharacter(player)
        },
        quests: {
            icon: 'textures/ui/info/quests',
            exe: () => questsInfo(player)
        },
        skills: {
            icon: 'textures/ui/info/about_skills',
            exe: () => infoSkillsScreen(player)
        },
        spells: {
            icon: 'textures/ui/info/known_spells_book',
            exe: () => knownSpellsBook(player)
        },
        stats: {
            icon: 'textures/ui/info/about_stats',
            exe: () => infoAboutStats(player)
        },
        traits: {
            icon: 'textures/ui/info/about_traits',
            exe: () => infoAboutTraits(player)
        },
        tastes: {
            icon: 'textures/ui/info/about_tastes',
            exe: () => infoAboutTastes(player)
        },
        achievements: {
            icon: 'textures/ui/info/about_achievements',
            exe: () => infoAboutAchievements(player)
        },
        settings: {
            icon: 'textures/ui/info/options',
            exe: () => arxSettings(player)
        },
        globalSettings: {
            condition: () => isAdmin(player),
            icon: 'textures/ui/info/globalSettings',
            exe: () => arxGlobalSettings(player)
        },
        statistics: {
            icon: 'textures/ui/info/about_statistics',
            exe: () => infoAboutStatistics(player)
        },
        authors: {
            icon: 'textures/ui/info/about_authors',
            exe: () => infoAboutArxDevs(player)
        },
        devOptions: {
            condition: () => isAdmin(player) && gDP(player, 'myRule:devMode'),
            icon: 'textures/ui/info/devOptions',
            exe: () => infoAboutArxDevs(player)
        },
    }

    // User's info options
    let userOptions = []
    for (const key in infoOptions) {
        const option = infoOptions[key]
        const available = !('condition' in option) || option.condition()
        if (available) userOptions.push(key)
    }

    // Create form
    let form = new ActionFormData()

    if (gDP(player, 'myRule:canSeeServerSpeedInInfoBook')) {
        const serverSpeed = getStabilityTestResult()
        if (serverSpeed) {
            form = form.body(`${fl(player, 'info.stability.result')}: ${serverSpeed}`)
        } else {
            form = form.body(fl(player, 'info.stability.no_result'))
        }
    }

    // Add options to form
    for (const option of userOptions) {
        const current = infoOptions[option] // Get current option obj

        form.button(fl(player, `info.option.${option}`), current.icon)
    }

    form.title(fl(player, "info.title"))

    form.show(player).then((response) => {
        if (!response.canceled) infoOptions[userOptions[response.selection]].exe() // Run requested function
    })
} 