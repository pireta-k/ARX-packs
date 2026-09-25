import { Player, world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
import { UI } from "../arxLib/UI"
import { RELEASE, VERSION } from "../_main"
import { gDP, sDP } from "../arxLib/DPOperations"
import { defaultLanguage, fl, langMap } from "../lang/fetchLocalization"
import { coreFramework, coreErrorCounts, corePing } from "../core/core"

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
function devWorldSettings(p) {
    const ambiencePreviousValue = gDP(world, 'enableAmbienceCore', false)
    const fogsPreviousValue = gDP(world, 'enableFogs', false)
    const DNPCMLogPreviousValue = gDP(world, 'enableDNPCMLog', false)

    const f = new ModalFormData()
        .title(fl(p, 'info.dev_world_settings.title'))
        .toggle(fl(p, 'info.dev_world_settings.enable_ambience_core'), { defaultValue: ambiencePreviousValue, tooltip: fl(p, 'info.dev_world_settings.enable_ambience_core.tooltip') })
        .toggle(fl(p, 'info.dev_world_settings.enable_fogs'), { defaultValue: fogsPreviousValue, tooltip: fl(p, 'info.dev_world_settings.enable_fogs.tooltip') })
        .toggle(fl(p, 'info.dev_world_settings.enable_DNPCM_log'), { defaultValue: DNPCMLogPreviousValue, tooltip: fl(p, 'info.dev_world_settings.enable_DNPCM_log.tooltip') })
        .submitButton(fl(p, 'info.dev_world_settings.save'))

    f.show(p).then(response => {
        const fv = response.formValues
        if (fv) {
            sDP(world, 'enableAmbienceCore', fv[0])
            sDP(world, 'enableFogs', fv[1])
            sDP(world, 'enableDNPCMLog', fv[2])
        }
        if (response.cancelationReason === FormCancelationReason.UserClosed) simpleDevOptions(p)

    })
}

/** 
 * Get a review about core performance
 * @param {Player} p 
 */
function devCoreReview(p) {
    const form = new ActionFormData()
        .title(fl(p, 'info.dev_options.core_review.title'))
        .body(buildCoreReviewBody(p))
        .button(fl(p, 'info.dev_options.core_review.update'))

    form.show(p).then(response => {
        if (response.selection === 0) devCoreReview(p) // Refresh
        if (response.cancelationReason === FormCancelationReason.UserClosed) simpleDevOptions(p)
    })

    /** 
     * Create a Core Review form body element
     * @param {Player} p 
     */
    function buildCoreReviewBody(p) {
        const coreReviewDivider = '§8────────────────§r'
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
}

/**
 * Get a review about Arx localizations 
 * @param {Player} p 
 */
function devLocalizationReview(p) {
    const flPref = 'info.dev_options.locale.'
    const f = new ActionFormData().title(fl(p, flPref + 'title'))
        .body(fl(p, flPref + 'body'))

    for (let lang in langMap) {
        const isDefault = lang === defaultLanguage
        let buttonText = ', §2Keys§8: ' + Object.keys(langMap[lang]).length + '\n'
        if (isDefault) {
            buttonText += fl(p, flPref + 'default_lang')
        } else {
            buttonText += `(§2OK§8: ${getTranslatedKeys(lang)?.length ?? '???'} / §6Exc.§8: ${getExcessiveKeys(lang)?.length ?? '???'} / §4Miss.§8: ${getMissingKeys(lang)?.length ?? '???'})`
        }

        f.button(lang + buttonText)
    }

    f.show(p).then((response) => {
        if (typeof response.selection === 'number') {
            singleLanguageForm(p, Object.keys(langMap)[response.selection])
        }
        if (response.cancelationReason === FormCancelationReason.UserClosed) simpleDevOptions(p)
    })

    /**
     * Get translated keys for a language
     * @param {string} lang 
     * @returns {string[]}
     */
    function getTranslatedKeys(lang) {
        if (lang === defaultLanguage) return []
        return Object.keys(langMap[lang]).filter(key => key in langMap[defaultLanguage])
    }

    /**
     * Get excessive keys for a language
     * @param {string} lang 
     * @returns {string[]}
     */
    function getExcessiveKeys(lang) {
        if (lang === defaultLanguage) return []
        return Object.keys(langMap[lang]).filter(key => !(key in langMap[defaultLanguage]))
    }

    /**
     * @typedef {'translated' | 'excessive' | 'missing'} translationKeyType
     */

    /**
     * Get missing keys for a language
     * @param {string} lang 
     * @returns {string[]}
     */
    function getMissingKeys(lang) {
        if (lang === defaultLanguage) return []
        return Object.keys(langMap[defaultLanguage]).filter(key => !(key in langMap[lang]))
    }

    /**
     * Get an options to do with a single language
     * @param {string} lang 
     */
    function singleLanguageForm(p, lang) {
        // Default lang
        if (lang === defaultLanguage) {
            const f = new ActionFormData().title(lang)
            f.body(fl(p, 'info.dev_options.locale.single.default'))
            f.show(p).then(r => {
                if (r.cancelationReason === FormCancelationReason.UserClosed) devLocalizationReview(p)
            })
        }

        // Not default lang
        else {
            const flPref = 'info.dev_options.locale.single.'
            const f = new ActionFormData().title(lang)

            const keys = {
                translated: getTranslatedKeys(lang),
                excessive: getExcessiveKeys(lang),
                missing: getMissingKeys(lang),
            }

            f.button(fl(p, flPref + 'translated') + ` (${keys.translated.length})`)
            f.button(fl(p, flPref + 'excessive') + ` (${keys.excessive.length})`)
            f.button(fl(p, flPref + 'missing') + ` (${keys.missing.length})`)

            f.show(p).then(r => {
                if (typeof r.selection === 'number') {
                    switch (r.selection) {
                        case 0: showKeys(p, lang, 'translated', keys.translated); break
                        case 1: showKeys(p, lang, 'excessive', keys.excessive); break
                        case 2: showKeys(p, lang, 'missing', keys.missing); break
                    }
                }
                else if (r.cancelationReason === FormCancelationReason.UserClosed) devLocalizationReview(p)
            })
        }
    }

    /**
     * Show keys to player
     * @param {Player} p 
     * @param {string} lang 
     * @param {translationKeyType} type
     * @param {Array} keys 
     */
    function showKeys(p, lang, type, keys) {
        const f = new ActionFormData().title(fl(p, 'info.dev_options.locale.single.show_keys.title', [fl(p, 'info.dev_options.locale.single.type.' + type), lang]))

        // Body
        if (keys.length > 1) f.body(keys.join('\n'))
        else f.body(fl(p, 'info.dev_options.locale.single.show_keys.no_keys'))

        f.show(p).then(r => {
            if (r.cancelationReason === FormCancelationReason.UserClosed) singleLanguageForm(p, lang)
        })
    }
}