import { ModalFormData, MessageFormData, ActionFormData } from "@minecraft/server-ui"
import { getScore, setScore } from "./arxLib/scoresOperations"
import { gDP, sDP } from "./arxLib/DPOperations"
import { world } from "@minecraft/server"
import { fl, setPlayerLanguage } from "./lang/fetchLocalization"
import { showLanguageForm } from "./lang/form"
import { RELEASE } from "./_main"
import { isArxWorldReady } from "./update/_update"

const thirstRegStep = 10

// Register character
export async function registerCharacter(player) {
    // Migrations still running (e.g. first-time 0.0.0 setup)
    if (!isArxWorldReady()) {
        const formNo = new ActionFormData()
            .title(fl(player, 'lobby.registration.cannot_registrate.title'))
            .body(fl(player, 'lobby.registration.cannot_registrate.arx_is_setting_up'))
            .show(player)
    }
    // Player already has a character
    else if (player.getDynamicProperty('hasRegisteredCharacter') === true) {
        const formNo = new ActionFormData()
            .title(fl(player, 'lobby.registration.cannot_registrate.title'))
            .body(fl(player, 'lobby.registration.cannot_registrate.already_has_a_character', [player.getDynamicProperty('name')]))
            .button(fl(player, 'lobby.registration.cannot_registrate.return_to_spawn_button'))
            .show(player)
            .then((r) => {
                if (r.selection === 0) {
                    player.teleport(gDP(world, 'worldSpawnPoint'), { dimension: world.getDimension('minecraft:overworld'), checkForBlocks: false, keepVelocity: false })
                }
            })
    }
    // Player isn't verified
    else if (world.getDynamicProperty('requireUserVerification') && player.getDynamicProperty('verify') === false) {
        const form = new ActionFormData()
            .title(fl(player, 'lobby.registration.cannot_registrate.title'))
            .body(`Добро пожаловать в Аркс, §a${player.name}§f!\n\nДождитесь, пока вас верифицируют! Верификация означает, что вы можете играть здесь.\n\nВам сразу же выдадут верификацию, как удостоверяется, что вы §aзнаете правила§f и §aимеете подходящий скин§f.\n\n\n\n\n\n\n\nВы получите сообщение, когда вас верифицируют.`)
            .show(player)
    }
    // Everything is fine
    else {
        // Version notification check
        if (RELEASE != 'stable' && !gDP(player, 'hasAlreadySeenVersionWarning')) sDP(player, 'registerCharacterStage', -9)
        // Language check
        if (gDP(player, 'language') === undefined) sDP(player, 'registerCharacterStage', -10)

        switch (player.getDynamicProperty('registerCharacterStage')) {

            case undefined:
            case -10: // Language
                const responce = await showLanguageForm(player)
                if (responce) setRegWindow(player, thirstRegStep)
                break

            case -9: // Warning
                const formWarning = new ModalFormData()
                    .title(fl(player, 'lobby.registration.notStableRelease.title'))
                    .label(fl(player, `lobby.registration.notStableRelease.${RELEASE}`)) // alpha | beta | special
                    .submitButton(fl(player, 'lobby.registration.notStableRelease.confirm'))

                    .show(player)
                    .then((response) => {
                        if (response.formValues) {
                            setRegWindow(player, thirstRegStep)
                        }
                    })
                sDP(player, 'hasAlreadySeenVersionWarning', true)
                break

            case 10: // Выбор пола 10
                const form1 = new ActionFormData()
                    .title(fl(player, 'lobby.registration.gender.title'))
                    .body(fl(player, 'lobby.registration.gender.body'))
                    .button(fl(player, 'lobby.registration.gender.m'), 'textures/ui/registration/gender_man')
                    .button(fl(player, 'lobby.registration.gender.f'), 'textures/ui/registration/gender_woman')

                    .show(player)
                    .then((response) => {
                        if (response.selection === 0) { // Муж
                            player.setProperty('arx:gender', 1)
                            setScore(player, "gender", 1)
                            player.setProperty('arx:bust_size', 0)

                            setRegWindow(player, 30)
                        } else if (response.selection === 1) { // Жен
                            player.setProperty('arx:gender', 2)
                            setScore(player, "gender", 2)

                            setRegWindow(player, 20)
                        }
                    })
                break

            case 20: // Выбор размера груди 20
                const form2 = new ActionFormData()
                    .title("Размер груди")
                    .body('§lВыберите размер груди вашего персонажа.\nВлияет на отображение груди на одежде.')
                    .button("Плоская. Абсолютно ровная доска", 'textures/ui/registration/bust_size_0')
                    .button("Небольшая. Аккуратная и изящная", 'textures/ui/registration/bust_size_1')
                    .button("Достойная. Объёмная, но не черезмерная", 'textures/ui/registration/bust_size_2')
                    .button("Огромная. Большая, мягкая и грациозная", 'textures/ui/registration/bust_size_3')

                    .show(player)
                    .then((response) => {
                        if (response.selection != undefined) { // Выбран размер
                            player.setProperty('arx:bust_size', response.selection)

                            setRegWindow(player, 30)
                        }
                    })
                break

            case 30: // Установка имени 30
                const form3 = new ModalFormData()
                    .title("Character's name")
                    .textField(`Character's name. Will be displayed in §aLocal chat§f and §bon weapons you crafted§f.\n\n§7§oCan be changed with command §d/§asetname§7.`, "Character's name")
                    .submitButton('Set name')

                    .show(player).then(response => {

                        if (response.formValues) {

                            const correctedName = response.formValues[0].trim()

                            let wrongInput = false

                            if (correctedName == "") {
                                player.sendMessage("§cИмя не может быть пустым.")
                                wrongInput = true
                            } else if (correctedName.length > 30) {
                                player.sendMessage("§cИмя не может быть таким длинным.")
                                wrongInput = true
                            }

                            if (!wrongInput) {
                                sDP(player, "name", correctedName)

                                setRegWindow(player, 40)
                            }
                        }
                    })
                break

            case 40: // Tastes 40

                const responce_variants = [
                    `§a${fl(player, 'food.taste_var.2')}`,
                    `§2${fl(player, 'food.taste_var.1')}`,
                    `§6${fl(player, 'food.taste_var.0')}`,
                    `§v${fl(player, 'food.taste_var.-1')}`,
                    `§c${fl(player, 'food.taste_var.-2')}`,
                ]

                // Index of value - weight of value
                const tasteWeights = [3, 1, 0, -1, -3]
                const tasteDPs = [80, 25, 8, -25, -80]

                const defaultValues = gDP(player, 'tastesRegSelection') ?? [2, 2, 2, 2, 2, 2]

                const form4 = new ModalFormData()
                    .title(fl(player, 'food.registration.title'))
                    .dropdown(' ' + fl(player, 'food.type.meat'), responce_variants, { defaultValueIndex: defaultValues[0] })
                    .dropdown(' ' + fl(player, 'food.type.fish'), responce_variants, { defaultValueIndex: defaultValues[1] })
                    .dropdown(' ' + fl(player, 'food.type.bread'), responce_variants, { defaultValueIndex: defaultValues[2] })
                    .dropdown(' ' + fl(player, 'food.type.dairy'), responce_variants, { defaultValueIndex: defaultValues[3] })
                    .dropdown(' ' + fl(player, 'food.type.herbal'), responce_variants, { defaultValueIndex: defaultValues[4] })

                    .show(player)
                    .then(response => {
                        const fv = response.formValues
                        if (fv) {
                            sDP(player, 'tastesRegSelection', fv)

                            // Is the selection balanced?
                            const resultWeight = fv.reduce((sum, selectedIndex) => sum + tasteWeights[selectedIndex], 0)
                            // It is CRAZY
                            if (resultWeight == 15) {
                                setRegWindow(player, 43)
                            }
                            // It is unbalanced
                            else if (resultWeight > 3) {
                                setRegWindow(player, 42)
                            }
                            // It is balanced
                            else {
                                sDP(player, 'playerTaste_meat', tasteDPs[fv[0]])
                                sDP(player, 'playerTaste_fish', tasteDPs[fv[1]])
                                sDP(player, 'playerTaste_bread', tasteDPs[fv[2]])
                                sDP(player, 'playerTaste_dairy', tasteDPs[fv[3]])
                                sDP(player, 'playerTaste_herbal', tasteDPs[fv[4]])

                                setRegWindow(player, 50)
                            }
                        }
                    })
                break

            case 42: // unbalanced tastes input 42
                const form42 = new ModalFormData()
                    .title(fl(player, 'food.registration.title'))
                    .label(fl(player, 'food.registration.unbalanced.label'))
                    .submitButton(fl(player, 'food.registration.unbalanced.confirm'))

                    .show(player)
                    .then((response) => {
                        if (response.formValues) {
                            setRegWindow(player, 40)
                        }
                    })
                break

            case 43: // unbalanced tastes input 43
                const form43 = new ModalFormData()
                    .title(fl(player, 'food.registration.title'))
                    .label(fl(player, 'food.registration.highly_unbalanced.label'))
                    .submitButton(fl(player, 'food.registration.unbalanced.confirm'))

                    .show(player)
                    .then((response) => {
                        if (response.formValues) {
                            setRegWindow(player, 40)
                        }
                    })
                break

            case 50: // Установка формы рук 50
                const form5 = new ActionFormData()
                    .title("Форма рук")
                    .body("Какова форма рук скина вашего персонажа?\nЭто скорректирует отображение некоторой одежды")
                    .button("Широкие (как у Стива)", 'textures/ui/registration/arms_type_steve')
                    .button("Тонкие (как у Алекс)", 'textures/ui/registration/arms_type_alex')
                    .button("Мне надо рассмотреть скин\n(закрыть это меню)", 'textures/ui/registration/arms_type_check')

                    .show(player).then(response => {

                        if (response.selection != 2 && response.selection != undefined) {
                            player.setProperty('arx:arms_type', response.selection)
                            setRegWindow(player, 60)
                        }
                    })
                break

            case 60: // Установка роста 60
                let defaultHeightValue
                player.getDynamicProperty('height') === undefined ? defaultHeightValue = 175 : defaultHeightValue = player.getDynamicProperty('height')
                const form6 = new ModalFormData()
                    .title("Рост персонажа")
                    .slider("У §aнизких§f персонажей §aменьше хитбокс§f\n\nУ §aвысоких§f персонажей §aвыше скорость бега (не более +5Ũ)§f\n\n§cЭти эффекты незначительны на практике! Выбирайте рост персонажа исходя из его лора, а не из бонусов\n\n§fРост вашего персонажа", 150, 195, { defaultValue: defaultHeightValue })
                    .submitButton('Посмотреть, как это выглядит')

                    .show(player).then(response => {

                        if (response.formValues) {
                            sDP(player, 'height', response.formValues[0])
                            player.setProperty("arx:height", response.formValues[0])
                            player.runCommand(`event entity @s arx:setHeight_${response.formValues[0]}`)


                            sDP(player, "registerCharacterStage", 70)
                            player.runCommand(`tellraw @s { "rawtext": [ { "text": "Посмотрите на своего персонажа от третьего лица, §aвам нравится§f его §aрост§f? Возвращайтесь к <создать персонажа>, когда определитесь с ответом." } ] }`)
                        }
                    })
                break

            case 70: // Проверка роста 70
                const form7 = new MessageFormData()
                    .title("Рост персонажа")
                    .body('Сохраняем рост?')
                    .button1("Да, мне нравится")
                    .button2("Нет, изменить рост")

                    .show(player)
                    .then((response) => {
                        if (response.selection === 0) { // Игрок нажал "продолжить"
                            setRegWindow(player, 80)
                        } else if (response.selection === 1) {
                            setRegWindow(player, 60)
                        }
                    })
                break

            case 80: // Установка типа глаз 80

                const form8 = new ActionFormData()
                    .title("Позиция глаз")
                    .body('§aВыберите позицию глаз§f вашего персонажа. Это нужно для более точного отображения некоторых аксессуаров.')
                    .button("Отступ от низа головы в 4 пикселя", 'textures/ui/registration/eyes_position_man_high')
                    .button("Отступ от низа головы в 3 пикселя", 'textures/ui/registration/eyes_position_man_default')
                    .button("Отступ от низа головы в 2 пикселя", 'textures/ui/registration/eyes_position_woman_high')
                    .button("Отступ от низа головы в 1 пиксель,\nДвойной размер глаз", 'textures/ui/registration/eyes_position_woman_default')
                    .button("Отступ от низа головы в 1 пиксель,\nОбычный размер глаз", 'textures/ui/registration/eyes_position_woman_low')
                    .button("Мне нужно рассмотреть скин", 'textures/ui/registration/eyes_position_check')

                    .show(player)
                    .then((response) => {
                        if (response.selection != undefined) { // Игрок нажал хоть что-то
                            // Устанавливаем высоту глаз, зависимо от выбранно опции
                            if (response.selection === 0) { player.setProperty('arx:eyes_position', 2) }
                            if (response.selection === 1) { player.setProperty('arx:eyes_position', 1) }
                            if (response.selection === 2) { player.setProperty('arx:eyes_position', 0) }
                            if (response.selection === 3) { player.setProperty('arx:eyes_position', 0) }
                            if (response.selection === 4) { player.setProperty('arx:eyes_position', 0) }
                            // Перекидываем на след этап регистрации
                            if (response.selection !== 5) {
                                setRegWindow(player, 99)
                            }
                        }
                    })
                break

            case 99: // Спавн в мире 99
                let bodyText
                getScore(player, "gender") === 1 ? bodyText = `${player.getDynamicProperty('name')} создан!` : bodyText = `${player.getDynamicProperty('name')} создана!`
                const form9 = new ActionFormData()
                    .title("Появление в мире")
                    .body(bodyText)
                    .button("Поехали!\n(рекомендуется помолиться)", 'textures/ui/registration/spawn')
                    .button("Перепройти регистрацию", 'textures/ui/registration/restart')
                    .button("Я пока позависаю в лобби", 'textures/ui/registration/spawn_pass_for_now')

                    .show(player)
                    .then((response) => {
                        if (response.selection != undefined) { // Игрок нажал хоть что-то
                            if (response.selection === 0) {
                                player.teleport(gDP(world, 'worldSpawnPoint'), { dimension: world.getDimension('minecraft:overworld'), checkForBlocks: false, keepVelocity: false })

                                sDP(player, "registerCharacterStage", thirstRegStep)
                                sDP(player, "hasRegisteredCharacter", true)
                            }
                            else if (response.selection === 1) setRegWindow(player, thirstRegStep)
                        }
                    })
                break

            // Smth unexpected
            default:
                player.sendMessage('Unexpected registerCharacterStage value. Registration restarted.')
                sDP(player, 'registerCharacterStage', thirstRegStep)
        }
    }
}

function setRegWindow(player, value) {
    sDP(player, "registerCharacterStage", value)
    registerCharacter(player)
}