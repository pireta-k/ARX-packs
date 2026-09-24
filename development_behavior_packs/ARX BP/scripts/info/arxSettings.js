import { UI } from "../arxLib/UI"
import { RELEASE, VERSION } from "../_main"
import { ModalFormData, ActionFormData, FormCancelationReason } from "@minecraft/server-ui"
import { gDP, sDP } from "../arxLib/DPOperations"
import { fl, getPlayerLanguage, langMap } from "../lang/fetchLocalization"
import { isAdmin } from "../arxLib/admin"
import { Player, world } from "@minecraft/server"
import { coreFramework, coreErrorCounts, corePing } from "../core/core"
import {
    getReviewLanguages,
    analyzeLocalization,
    buildLocalizationOverviewBody,
    buildLocalizationMissingKeysBody,
    getMissingKeysPageCount,
} from "../lang/localizationReview"

/** @param {string} coreKey */
function isDevCoreBlockActive(coreKey) {
    const block = coreFramework[coreKey]
    if (!block) return false
    if (!('condition' in block)) return true
    try {
        return !!block.condition()
    } catch {
        return false
    }
}

const coreReviewDivider = '§8────────────────§r'

/** @param {import("@minecraft/server").Player} p */
function buildCoreReviewBody(p) {
    const lines = []
    let errorsTotal = 0
    const keys = Object.keys(coreFramework)

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const numOfErrors = coreErrorCounts[key] ?? 0
        const ping = corePing[key] ?? '?'
        errorsTotal += numOfErrors

        const tick = coreFramework[key].tickSpeed
        const errsMsg = numOfErrors === 0 ? `§a${numOfErrors}` : `§c${numOfErrors}`
        const active = isDevCoreBlockActive(key)

        if (i > 0) lines.push(coreReviewDivider) // Push divider if not first line
        // Core part str name and data, like [E 20t 1ms] mcf20
        const status = active ? "§aEnabled" : '§8Disabled'
        const pingColor = ping === 0 ? "§a" : ping === 1 ? "§e" : "§c"

        // Add line to text
        lines.push(`§r§f${key}\n§f${status}§f ${tick}t ${pingColor}${ping}§fms`)

        // Errors of this block
        lines.push(fl(p, 'info.dev_options.core_review.block_errors', [errsMsg]))
    }

    const totalErrorsMsg = errorsTotal === 0 ? `§a${errorsTotal}` : `§c${errorsTotal}`
    const header = [
        fl(p, 'info.dev_options.core_review.intro'),
        fl(p, 'info.dev_options.core_review.total', [totalErrorsMsg]),
        coreReviewDivider,
    ].join('\n')

    return header + '\n' + lines.join('\n')
}

// User's options
export function arxSettings(p) {
    // Default slider values
    let manaDisplayModeDefaultDropdownPos
    const manaDisplayMode = gDP(p, 'myRule:manaDisplayMode')
    if (manaDisplayMode === 'integers') manaDisplayModeDefaultDropdownPos = 0
    else if (manaDisplayMode === 'decimals') manaDisplayModeDefaultDropdownPos = 1
    else if (manaDisplayMode === 'none') manaDisplayModeDefaultDropdownPos = 2

    let showAttackCDModeDefaultDropdownPos
    const showAttackCDMode = gDP(p, 'myRule:showAttackCDMode')
    if (showAttackCDMode === 'seconds') showAttackCDModeDefaultDropdownPos = 0
    else if (showAttackCDMode === 'secondsFloat') showAttackCDModeDefaultDropdownPos = 1
    else if (showAttackCDMode === 'ticks') showAttackCDModeDefaultDropdownPos = 2
    else if (showAttackCDMode === 'line') showAttackCDModeDefaultDropdownPos = 3
    else if (showAttackCDMode === 'none') showAttackCDModeDefaultDropdownPos = 4

    let chatPrefixesDefaultDropdownPos
    const chatPrefixes = gDP(p, 'myRule:chatPrefixes')
    if (chatPrefixes === 'full') chatPrefixesDefaultDropdownPos = 0
    if (chatPrefixes === 'short') chatPrefixesDefaultDropdownPos = 1

    const gameLangs = Object.keys(langMap)
    const playerLang = getPlayerLanguage(p)
    const langDefaultDropdownPos = gameLangs.indexOf(playerLang) ?? 0

    const canSeeServerSpeedInInfoBookDefaultTogglePos = p.getDynamicProperty('myRule:canSeeServerSpeedInInfoBook')
    const devModeDefaultTogglePos = p.getDynamicProperty('myRule:devMode')

    const form = new ModalFormData()
    form.title(fl(p, 'info.settings.title'))
    form.dropdown(fl(p, 'info.settings.save_is_necessary') + '\n\n' + '\uE10D ' + fl(p, 'info.settings.mana_display'), [fl(p, 'info.settings.mana_display.natural_numbers'), fl(p, 'info.settings.mana_display.decimal'), '§c' + fl(p, 'info.settings.mana_display.not')], { defaultValueIndex: manaDisplayModeDefaultDropdownPos })
    form.dropdown('\uE10A ' + fl(p, 'info.settings.attack_cd_display'), [fl(p, 'info.settings.attack_cd_display.seconds_integers'), fl(p, 'info.settings.attack_cd_display.seconds_fractional'), fl(p, 'info.settings.attack_cd_display.ticks'), fl(p, 'info.settings.attack_cd_display.line'), fl(p, 'info.settings.attack_cd_display.not')], { defaultValueIndex: showAttackCDModeDefaultDropdownPos })
    form.dropdown(fl(p, 'info.settings.chat_prefixes'), [fl(p, 'info.settings.chat_prefixes.full'), fl(p, 'info.settings.chat_prefixes.short')], { defaultValueIndex: chatPrefixesDefaultDropdownPos })
    form.toggle(fl(p, 'info.settings.performance'), { defaultValue: canSeeServerSpeedInInfoBookDefaultTogglePos })
    if (isAdmin) {
        form.toggle(fl(p, 'info.settings.dev_mode'), { defaultValue: devModeDefaultTogglePos, tooltip: fl(p, 'info.settings.dev_mode.tooltip') })
    }


    form.submitButton(fl(p, 'info.settings.submit'))

    form.show(p).then(response => {

        if (response.formValues) {
            // myRule:manaDisplayMode
            if (response.formValues[0] === 0) sDP(p, 'myRule:manaDisplayMode', 'integers')
            else if (response.formValues[0] === 1) sDP(p, 'myRule:manaDisplayMode', 'decimals')
            else if (response.formValues[0] === 2) sDP(p, 'myRule:manaDisplayMode', 'none')

            if (response.formValues[1] === 0) sDP(p, 'myRule:showAttackCDMode', 'seconds')
            else if (response.formValues[1] === 1) sDP(p, 'myRule:showAttackCDMode', 'secondsFloat')
            else if (response.formValues[1] === 2) sDP(p, 'myRule:showAttackCDMode', 'ticks')
            else if (response.formValues[1] === 3) sDP(p, 'myRule:showAttackCDMode', 'line')
            else if (response.formValues[1] === 4) sDP(p, 'myRule:showAttackCDMode', 'none')

            if (response.formValues[2] === 0) sDP(p, 'myRule:chatPrefixes', 'full')
            else if (response.formValues[2] === 1) sDP(p, 'myRule:chatPrefixes', 'short')

            sDP(p, 'myRule:canSeeServerSpeedInInfoBook', response.formValues[3])

            sDP(p, 'myRule:devMode', response.formValues[4])
        }
    })
}

export function arxGlobalSettings(p) {

    const currentGenerateGrass = gDP(world, 'generateGrass') ?? false
    const currentAnticheat = gDP(world, 'anticheat') ?? false
    const currentCameras = gDP(world, 'allowArxCameras') ?? false
    const currentWorldBorder = gDP(world, 'enableWorldBorder') ?? false
    const currentWorldBorderRange = gDP(world, 'worldBorderRange') ?? 1000

    const form = new ModalFormData()
        .title(fl(p, 'info.global_settings.title'))

        .toggle(fl(p, 'info.global_settings.generate_grass'), { defaultValue: currentGenerateGrass, tooltip: fl(p, 'info.global_settings.generate_grass.tooltip') })
        .toggle(fl(p, 'info.global_settings.anticheat'), { defaultValue: currentAnticheat, tooltip: fl(p, 'info.global_settings.anticheat.tooltip') })
        .toggle(fl(p, 'info.global_settings.allow_arx_cameras'), { defaultValue: currentCameras })
        .toggle(fl(p, 'info.global_settings.enable_world_border'), { defaultValue: currentWorldBorder })
        .slider(fl(p, 'info.global_settings.world_border_range'), 1000, 10000, { defaultValue: currentWorldBorderRange })

        .submitButton(fl(p, 'info.global_settings.submit'))

    form.show(p).then(response => {
        const fv = response.formValues
        if (response.formValues) {
            sDP(world, 'generateGrass', fv[0])
            sDP(world, 'anticheat', fv[1])
            sDP(world, 'allowArxCameras', fv[2])
            sDP(world, 'enableWorldBorder', fv[3])
            sDP(world, 'worldBorderRange', fv[4])
        }
    })
}

/** @param {import("@minecraft/server").Player} p @param {string} langId @param {number} [page] */
export function devLocalizationReviewLang(p, langId, page = 0) {
    const stats = analyzeLocalization(langId)
    const pageCount = getMissingKeysPageCount(langId, stats.missing.length)

    const form = new ActionFormData()
        .title(fl(p, 'info.dev_options.localization_review.lang_title', [langId.toUpperCase()]))
        .body(buildLocalizationMissingKeysBody(p, langId, page))

    /** @type {('prev' | 'next' | 'back')[]} */
    const actions = []
    if (page > 0) actions.push('prev')
    if (stats.missing.length > 0 && page < pageCount - 1) actions.push('next')
    actions.push('back')

    for (const action of actions) {
        if (action === 'prev') form.button(fl(p, 'info.dev_options.localization_review.prev'))
        else if (action === 'next') form.button(fl(p, 'info.dev_options.localization_review.next'))
        else form.button(fl(p, 'info.dev_options.localization_review.back_overview'))
    }

    form.show(p).then(response => {
        if (response.canceled) return

        const action = actions[response.selection]
        if (action === 'prev') devLocalizationReviewLang(p, langId, page - 1)
        else if (action === 'next') devLocalizationReviewLang(p, langId, page + 1)
        else devLocalizationReview(p)
    })
}

/** @param {import("@minecraft/server").Player} p */
export function devLocalizationReview(p) {
    const langs = getReviewLanguages()

    const form = new ActionFormData()
        .title(fl(p, 'info.dev_options.localization_review.title'))
        .body(buildLocalizationOverviewBody(p))

    for (const langId of langs) {
        const stats = analyzeLocalization(langId)
        const pctFmt = stats.percent === 100 ? `§a${stats.percent}%` : `§c${stats.percent}%`
        form.button(`${langId.toUpperCase()}: ${pctFmt}\n§d§o${stats.translated}/${stats.total}`)
    }

    form.button(fl(p, 'info.dev_options.back'))

    form.show(p).then(response => {
        if (response.canceled) return

        if (response.selection < langs.length) {
            devLocalizationReviewLang(p, langs[response.selection], 0)
            return
        }

        simpleDevOptions(p)
    })
}

/** @param {import("@minecraft/server").Player} p */
export function devCoreReview(p) {
    const form = new ActionFormData()
        .title(fl(p, 'info.dev_options.core_review.title'))
        .body(buildCoreReviewBody(p))
        .button(fl(p, 'info.dev_options.update'))

    form.show(p).then(response => {
        if (!response.canceled) devCoreReview(p)
    })
}


/**
 * Show dev options screen to player
 * This one is updated. The old one was made with AI and I utterly hate it (fuck cursor)
 * @param {Player} p 
 */
export function simpleDevOptions(p) {
    UI.dynamicActionFormData(p,
        {
            devWorldSettings: {
                icon: 'textures/ui/info/dev_options/worldSettings',
                exe: () => {
                    devWorldSettings(p)
                }
            },
            coreReview: {
                icon: 'textures/ui/info/dev_options/core',
                exe: () => {
                    devCoreReview(p)
                }
            },
            localizationReview: {
                icon: 'textures/ui/info/dev_options/lang',
                exe: () => {
                    devLocalizationReview(p)
                }
            },
        },
        "info.dev_options",
        {
            title: fl(p, 'info.dev_options.title'),
            body: `Arx §6Ultima§f v.${VERSION}\nRelease type: ${RELEASE}`
        }
    )
}

/**
 * Show dev world's settings
 * @param {Player} p 
 */
export function devWorldSettings(p) {
    const ambiencePreviousValue = gDP(world, 'enableAmbienceCore', false)
    const fogsPreviousValue = gDP(world, 'enableFogs', false)
    const DNPCMLogPreviousValue = gDP(world, 'enableDNPCMLog', false)

    const f = new ModalFormData()
        .title(fl(p, 'info.dev_world_settings.title'))
        .toggle(fl(p, 'info.dev_world_settings.enable_ambience_core'), { defaultValue: ambiencePreviousValue, tooltip: fl(p, 'info.dev_world_settings.enable_ambience_core.tooltip') })
        .toggle(fl(p, 'info.dev_world_settings.enable_fogs'), { defaultValue: fogsPreviousValue, tooltip: fl(p, 'info.dev_world_settings.enable_fogs.tooltip') })
        .toggle(fl(p, 'info.dev_world_settings.enable_DNPCM_log'), { defaultValue: DNPCMLogPreviousValue, tooltip: fl(p, 'info.dev_world_settings.enable_DNPCM_log.tooltip') })
        .submitButton(fl(p, 'info.dev_world_settings.save'))

    f.show(p).then(responce => {
        const fv = responce.formValues
        if (fv) {
            sDP(world, 'enableAmbienceCore', fv[0])
            sDP(world, 'enableFogs', fv[1])
            sDP(world, 'enableDNPCMLog', fv[2])
        }
        if (responce.cancelationReason === FormCancelationReason.UserClosed) simpleDevOptions(p)

    })
}