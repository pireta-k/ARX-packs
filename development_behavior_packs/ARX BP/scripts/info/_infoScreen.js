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
import { UI } from "../arxLib/UI"

// Show to player the main info screen
export function infoScreen(player) {

    // Add stability data
    let bodyText
    if (gDP(player, 'myRule:canSeeServerSpeedInInfoBook')) {
        const serverSpeed = getStabilityTestResult()
        if (serverSpeed) {
            bodyText = (`${fl(player, 'info.stability.result')}: ${serverSpeed}`)
        } else {
            bodyText = (fl(player, 'info.stability.no_result'))
        }
    }

    // All info options
    UI.dynamicActionFormData(player, {
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
    },
        'info',
        {
            body: gDP(player, 'myRule:canSeeServerSpeedInInfoBook') ? bodyText : undefined,
            title: fl(player, "info.title")
        }
    )
} 