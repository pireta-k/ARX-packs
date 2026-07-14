import { ActionFormData } from "@minecraft/server-ui"
import { world } from "@minecraft/server"

import { infoAboutCharacter } from "./infoAboutCharacter"
import { infoAboutTastes } from "./infoAboutTastes"
import { infoSkillsScreen } from "./infoSkillsScreen"
import { infoAboutStats } from "./infoAboutStats"
import { infoAboutStatistics } from "./infoAboutStatistics"
import { infoAboutAchievements } from "./infoAboutAchievements"
import { knownSpellsBook } from "./knownSpellsBook"
import { infoAboutTraits } from "./infoAboutTraits"
import { arxSettings, arxGlobalSettings, devOptions } from "./arxSettings"
import { infoAboutArxDevs } from "./devs"
import { questsInfo } from '../quests'

import { getStabilityTestResult } from '../stabilityTesting'
import { gDP } from "../arxLib/DPOperations"
import { fl } from "../lang/fetchLocalization"
import { isAdmin } from "../arxLib/admin"
import { launchCameraUI } from "../camera/launchCameraUI"

// Show to player the main info screen
export function infoScreen(player) {

    // All info options
    let infoOptions = {
        character: {
            condition: () => gDP(player, 'hasRegisteredCharacter'),
            icon: 'textures/ui/info/about_character',
            exe: () => infoAboutCharacter(player)
        },
        quests: {
            condition: () => gDP(player, 'hasRegisteredCharacter'),
            icon: 'textures/ui/info/quests',
            exe: () => questsInfo(player)
        },
        skills: {
            condition: () => gDP(player, 'hasRegisteredCharacter'),
            icon: 'textures/ui/info/about_skills',
            exe: () => infoSkillsScreen(player)
        },
        spells: {
            condition: () => gDP(player, 'hasRegisteredCharacter'),
            icon: 'textures/ui/info/known_spells_book',
            exe: () => knownSpellsBook(player)
        },
        stats: {
            icon: 'textures/ui/info/about_stats',
            exe: () => infoAboutStats(player)
        },
        traits: {
            condition: () => gDP(player, 'hasRegisteredCharacter'),
            icon: 'textures/ui/info/about_traits',
            exe: () => infoAboutTraits(player)
        },
        tastes: {
            condition: () => gDP(player, 'hasRegisteredCharacter'),
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
        camera: {
            condition: () => gDP(world, 'allowArxCameras') && isAdmin(player),
            icon: 'textures/ui/info/camera',
            exe: () => launchCameraUI(player)
        },
        authors: {
            icon: 'textures/ui/info/about_authors',
            exe: () => infoAboutArxDevs(player)
        },
        devOptions: {
            condition: () => isAdmin(player) && gDP(player, 'myRule:devMode'),
            icon: 'textures/ui/info/devOptions',
            exe: () => devOptions(player)
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

    // Add stability data
    if (gDP(player, 'myRule:canSeeServerSpeedInInfoBook')) {
        const serverSpeed = getStabilityTestResult()
        if (serverSpeed) {
            form.body(`${fl(player, 'info.stability.result')}: ${serverSpeed}`)
        } else {
            form.body(fl(player, 'info.stability.no_result'))
        }
    }

    // Add options to form
    for (const option of userOptions) {
        const current = infoOptions[option] // Get current option obj

        form.button(fl(player, `info.option.${option}`), current.icon)
    }

    form.title(fl(player, "info.title"))

    form.show(player).then((response) => {
        // If canceled, return
        if (response.canceled) return

        // Get option
        const optionKey = userOptions[response.selection]
        const option = infoOptions[optionKey]
        if (!option) return
        if (option.condition && !option.condition()) return

        // Run function
        option.exe()
    })
} 