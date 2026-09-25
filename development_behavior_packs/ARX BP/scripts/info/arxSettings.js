import { ModalFormData, ActionFormData, FormCancelationReason } from "@minecraft/server-ui"
import { gDP, sDP } from "../arxLib/DPOperations"
import { fl, getPlayerLanguage, langMap } from "../lang/fetchLocalization"
import { isAdmin } from "../arxLib/admin"
import { world } from "@minecraft/server"

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