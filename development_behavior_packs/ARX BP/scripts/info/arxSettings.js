import { ModalFormData } from "@minecraft/server-ui"
import { gDP, ssDP } from "../DPOperations"
import { fl } from "../lang/fetchLocalization"
import { isAdmin } from "../admin"
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
    if (chatPrefixes === 'fullEN') chatPrefixesDefaultDropdownPos = 0
    if (chatPrefixes === 'shortEN') chatPrefixesDefaultDropdownPos = 1

    const canSeeServerSpeedInInfoBookDefaultTogglePos = p.getDynamicProperty('myRule:canSeeServerSpeedInInfoBook')
    const cinematographicModeDefaultTogglePos = p.getDynamicProperty('myRule:cinematographicMode')
    const devModeDefaultTogglePos = p.getDynamicProperty('myRule:devMode')

    const form = new ModalFormData()
    form.title("Настройки Аркса")

    form.dropdown('Не забудьте нажать кнопку §aсохранить§f внизу этого экрана!\n\nОтображение §bманы', ['Натуральные числа', 'Десятичные дроби', '§cНе отображать'], { defaultValueIndex: manaDisplayModeDefaultDropdownPos })
    form.dropdown('Отображение §cотката атаки', ['Секунды, целые числа', 'Секунды, десятичные дроби', 'Такты (сек/20)', 'Линия', '§cНе отображать'], { defaultValueIndex: showAttackCDModeDefaultDropdownPos })
    form.dropdown('Префиксы §aчатов', ['Полные §f[§aЛокал.§f]', 'Сокращённые §f[§aЛ§f]'], { defaultValueIndex: chatPrefixesDefaultDropdownPos })
    form.toggle("Отображение производительности в <Инфо>", { defaultValue: canSeeServerSpeedInInfoBookDefaultTogglePos })
    form.toggle("Кинематографический режим", { defaultValue: cinematographicModeDefaultTogglePos, tooltip: 'Вы сможете вызывать меню управления камерой, использовав предмет <Инфо> на присяде.' })
    if (isAdmin) {
        form.toggle("Режим разработчика", { defaultValue: devModeDefaultTogglePos, tooltip: 'Вы сможете видеть технические данные.' })
    }


    form.submitButton('Сохранить')

    form.show(p).then(response => {

        if (response.formValues) {
            // myRule:manaDisplayMode
            if (response.formValues[0] === 0) ssDP(p, 'myRule:manaDisplayMode', 'integers')
            else if (response.formValues[0] === 1) ssDP(p, 'myRule:manaDisplayMode', 'decimals')
            else if (response.formValues[0] === 2) ssDP(p, 'myRule:manaDisplayMode', 'none')

            if (response.formValues[1] === 0) ssDP(p, 'myRule:showAttackCDMode', 'seconds')
            else if (response.formValues[1] === 1) ssDP(p, 'myRule:showAttackCDMode', 'secondsFloat')
            else if (response.formValues[1] === 2) ssDP(p, 'myRule:showAttackCDMode', 'ticks')
            else if (response.formValues[1] === 3) ssDP(p, 'myRule:showAttackCDMode', 'line')
            else if (response.formValues[1] === 4) ssDP(p, 'myRule:showAttackCDMode', 'none')

            if (response.formValues[2] === 0) ssDP(p, 'myRule:chatPrefixes', 'fullEN')
            else if (response.formValues[2] === 1) ssDP(p, 'myRule:chatPrefixes', 'shortEN')

            ssDP(p, 'myRule:canSeeServerSpeedInInfoBook', response.formValues[3])

            ssDP(p, 'myRule:cinematographicMode', response.formValues[4])
            ssDP(p, 'myRule:devMode', response.formValues[5])
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
            ssDP(world, 'generateGrass', fv[0])
            ssDP(world, 'anticheat', fv[1])
            ssDP(world, 'allowArxCameras', fv[2])
            ssDP(world, 'enableWorldBorder', fv[3])
            ssDP(world, 'worldBorderRange', fv[4])
        }
    })
}