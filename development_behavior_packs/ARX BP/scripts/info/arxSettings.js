import { ModalFormData } from "@minecraft/server-ui"
import { gDP, ssDP } from "../DPOperations"
import { fl } from "../lang/fetchLocalization"
import { isAdmin } from "../admin"

// User's options
export function arxSettings(player) {
    // Default slider values
    let manaDisplayModeDefaultDropdownPos
    const manaDisplayMode = gDP(player, 'myRule:manaDisplayMode')
    if (manaDisplayMode === 'integers') manaDisplayModeDefaultDropdownPos = 0
    else if (manaDisplayMode === 'decimals') manaDisplayModeDefaultDropdownPos = 1
    else if (manaDisplayMode === 'none') manaDisplayModeDefaultDropdownPos = 2

    let showAttackCDModeDefaultDropdownPos
    const showAttackCDMode = gDP(player, 'myRule:showAttackCDMode')
    if (showAttackCDMode === 'seconds') showAttackCDModeDefaultDropdownPos = 0
    else if (showAttackCDMode === 'secondsFloat') showAttackCDModeDefaultDropdownPos = 1
    else if (showAttackCDMode === 'ticks') showAttackCDModeDefaultDropdownPos = 2
    else if (showAttackCDMode === 'line') showAttackCDModeDefaultDropdownPos = 3
    else if (showAttackCDMode === 'none') showAttackCDModeDefaultDropdownPos = 4

    let chatPrefixesDefaultDropdownPos
    const chatPrefixes = gDP(player, 'myRule:chatPrefixes')
    if (chatPrefixes === 'fullEN') chatPrefixesDefaultDropdownPos = 0
    if (chatPrefixes === 'shortEN') chatPrefixesDefaultDropdownPos = 1

    const canSeeServerSpeedInInfoBookDefaultTogglePos = player.getDynamicProperty('myRule:canSeeServerSpeedInInfoBook')
    const cinematographicModeDefaultTogglePos = player.getDynamicProperty('myRule:cinematographicMode')
    const devModeDefaultTogglePos = player.getDynamicProperty('myRule:devMode')

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

    form.show(player).then(response => {

        if (response.formValues) {
            // myRule:manaDisplayMode
            if (response.formValues[0] === 0) ssDP(player, 'myRule:manaDisplayMode', 'integers')
            else if (response.formValues[0] === 1) ssDP(player, 'myRule:manaDisplayMode', 'decimals')
            else if (response.formValues[0] === 2) ssDP(player, 'myRule:manaDisplayMode', 'none')

            if (response.formValues[1] === 0) ssDP(player, 'myRule:showAttackCDMode', 'seconds')
            else if (response.formValues[1] === 1) ssDP(player, 'myRule:showAttackCDMode', 'secondsFloat')
            else if (response.formValues[1] === 2) ssDP(player, 'myRule:showAttackCDMode', 'ticks')
            else if (response.formValues[1] === 3) ssDP(player, 'myRule:showAttackCDMode', 'line')
            else if (response.formValues[1] === 4) ssDP(player, 'myRule:showAttackCDMode', 'none')

            if (response.formValues[2] === 0) ssDP(player, 'myRule:chatPrefixes', 'fullEN')
            else if (response.formValues[2] === 1) ssDP(player, 'myRule:chatPrefixes', 'shortEN')

            ssDP(player, 'myRule:canSeeServerSpeedInInfoBook', response.formValues[3])

            ssDP(player, 'myRule:cinematographicMode', response.formValues[4])
            ssDP(player, 'myRule:devMode', response.formValues[5])
        }
    })
}

export function arxGlobalSettings(player) {
    const form = new ModalFormData()
        .title(fl(player, 'info.global_settings.title'))
        .toggle(fl(player, 'info.global_settings.generate_grass'))
        .toggle(fl(player, 'info.global_settings.anticheat'))
        .toggle(fl(player, 'info.global_settings.allow_arx_cameras'))
        .textField(fl(player, 'info.global_settings.world_border'))

        .submitButton(fl(player, 'info.global_settings.submit'))

    form.show(player).then(response => { 
        
    })
}