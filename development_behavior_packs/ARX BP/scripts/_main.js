// ARX javascript

// Imports - Minecraft
import { system, world, EntityComponentTypes, EquipmentSlot, Player, ItemStack, MolangVariableMap, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"

import './vanillaPrototypes'

// Imports - Arx functions 
import { getScore, incScore, setScore } from './arxLib/scoresOperations'
import { increaseSkillProgress, wipeSkillsProgress } from './skillsOperations'
import { onConsume } from './food/onConsume'
import { registerCharacter } from "./registerCharacter"
import { executeCommandDelayed } from "./executeCommandDelayed"
import { showDialog } from './dialogues'
import { isEntityInCube } from './core/music_core'
import { interactWithViciousDemonSpawner } from './bosses/vicious_demon'
import { weighAnalysis } from './weighAnalysis'
import { fl, sl, slfs } from './lang/fetchLocalization'

// Imports - Local scripts
import './chat'
import './core/core'
import './items/on_use_general'
import './magic/on_use_magic_items'
import './stabilityTesting'
import './camera/processCamera'
import './sb/structureBuilder'
import './blocksHistory'
import './update'
import './arxLib/weather'

import { registerPlayerVars } from "./registerPlayerVars"
import { checkForItem } from "./items/checkForItem"
import { gDP, iDP, sDP } from "./arxLib/DPOperations"
import { checkForTrait } from "./traits/traitsOperations"
import { getPlayersInRadius } from "./getPlayersInRadius"
import { getItem } from "./items/getItem"
import { onWeaponInventoryChange, grantWeaponXpFromDamage, openWeaponSkillPick, WEAPON_SKILL_COMMAND } from "./items/weaponSkills"
import { getActiveStaffChannel } from "./magic/getActiveStaffChannel"
import { md5, obj2str } from "./arxLib/converters"
import { isAdmin, getAdmins, getHoster } from './arxLib/admin'
import { isPlayerCompletelyLoaded } from "./isPlayerCompletelyLoaded"
import { showLanguageForm } from "./lang/form"
import { setSBPoint } from "./sb/structureBuilder"
import { emote, emotionsList } from './emote'
import { Rob } from "./rob"
import { Knockout } from "./knockout"
import { UI } from "./arxLib/UI"
import { infoScreen } from "./info/_infoScreen"

// Type of release. 
// Available: alpha, beta, special, stable
export const RELEASE = 'alpha'
export const VERSION = [0, 2, 2]
export const REPOSITORY = 'https://github.com/pireta-k/ARX-packs'

world.afterEvents.playerButtonInput.subscribe((event) => {
    const button = event.button
    const state = event.newButtonState
    const player = event.player

    if (button === 'Jump') {
        // Кнопку нажали
        if (state === 'Pressed') {
            sDP(player, 'pressedJumpButton', true)
        }
        // Кнопку отпустили
        else {
            sDP(player, 'pressedJumpButton', false)
        }
    }
    else if (button === 'Sneak') {
        if (state === 'Pressed') {
            // Обновляем данные о посохе
            const item = getItem(player, 'mainhand')
            if (item) {
                const itemTags = item.getTags()
                let staffChannels
                for (const tag of itemTags) {
                    if (tag.includes('staff_channels_')) {
                        staffChannels = parseInt(tag.slice(15))
                    }
                }
                if (itemTags.includes('is_staff')) getActiveStaffChannel(player, staffChannels, true, true)
            }
        }
    }
})

// Item change
world.afterEvents.playerInventoryItemChange.subscribe((event) => {
    const p = event.player
    const item = event.itemStack
    if (item) {
        // Анализ поднимаемного игроком веса
        weighAnalysis(p)

        onWeaponInventoryChange(event)
    }
})

// A player has spawned
world.afterEvents.playerSpawn.subscribe(async (event) => {
    const player = event.player; // Получаем объект игрока
    player.nameTag = ""
    player.runCommand("function javascript/scores_autoreg")

    // Restart music
    sDP(player, 'musicLocation', undefined)

    sDP(player, 'camera:activeCamera', false)
    sDP(player, 'camera:tickCountdownToNextTimecode', 0)
    sDP(player, 'camera:numOfProcessedTimecodes', 0)

    registerPlayerVars(player)

    // If a player was knocked. 
    // InputPermissions resets after a player rejoins a world
    if (player.gDP('respawnDelay') !== 0) {
        Knockout.applyInputPermissionOnEnter(player)
    }

    // Is this the thirst time a player entered Arx?
    const playedBefore = player.getDynamicProperty('hasEverPlayedArx')
    if (!playedBefore) {
        // Notify admins about requred verification
        if (world.getDynamicProperty('requireUserVerification')) {
            for (const admin of getAdmins()) {
                slfs(admin, 'lobby.new_player_entered_arx', [player.name])
            }
        }
        // Check GM
        if (player.getGameMode() === 'Creative') {
            player.setGameMode("Survival")
            if (world.getPlayers().length > 1) { // Notify moderator about player's gamemode changing 
                for (const admin of getAdmins()) {
                    slfs(admin, 'lobby.new_player_auto_gamemode_change', [player.name])
                }
            }
        }
        // Give Info book
        {
            const item = new ItemStack("arx:united_player_data", 1)
            item.lockMode = "slot"
            item.keepOnDeath = true
            player.getComponent("inventory").container.setItem(8, item)
        }

        sDP(player, 'hasEverPlayedArx', true)
    }
});

// Спавн сущностей
world.afterEvents.entitySpawn.subscribe((spawnEvent) => {
    const entity = spawnEvent.entity

    if (entity.typeId === 'arx:hungry_rat' || entity.typeId === 'arx:larva') {
        if (isEntityInCube(entity, [-2274, 13, 1773], [-2205, 45, 1839]) || isEntityInCube(entity, [-2225, 24, 1839], [-2255, 30, 1868])) {
            entity.remove()
        }
    }
    if (entity.typeId === 'arx:grass_generator_launcher') {
        for (let i = 0; i < (Math.random() * 20 + 5); i++) {
            generateGrass({ x: entity.location.x + Math.random() * 42 - 21, y: entity.location.y + Math.random() * 4 - 2, z: entity.location.z + Math.random() * 42 - 21 }, entity.dimension)
        }
        entity.remove()
    }

    if (entity.typeId === 'arx:wandering_flame_of_mines') sDP(entity, 'dynamicLightPower', 9)
    if (entity.typeId === 'arx:wandering_flame_of_night') sDP(entity, 'dynamicLightPower', 12)
})

export function generateGrass(vector3, dimension) {
    // Нам не нужно генерировать траву нигде, кроме верхнего мира
    if (dimension.id !== 'minecraft:overworld') return

    // Далее код генерации травы
    const currentBlock = dimension.getBlock(vector3)
    // Если текущий блок - не воздух, ничего не делаем
    if (currentBlock?.typeId !== 'minecraft:air') return
    // Получаем блок ниже
    const blockBelow = dimension.getBlock({ x: vector3.x, y: vector3.y - 1, z: vector3.z });
    // Если не трава, ничего не делаем
    if (blockBelow.typeId !== 'minecraft:grass_block') return

    // Определяем, что ставить
    const grassRand = Math.random()
    let blockToPaste
    if (grassRand < 0.1) blockToPaste = 'minecraft:tall_grass'
    else if (grassRand < 0.15) blockToPaste = 'arx:stones'
    else if (grassRand < 0.18) blockToPaste = 'arx:kavra'
    else blockToPaste = 'minecraft:short_grass'

    const coords = `${vector3.x} ${vector3.y} ${vector3.z}`
    dimension.runCommand(`fill ${coords} ${coords} ${blockToPaste}`)
}

function calculateStrength(player) {
    let basicStrength = 0.5

    // Кольца
    if (checkForItem(player, "Feet", "arx:ring_gold_ruby")) { basicStrength += 1 }
    if (checkForItem(player, "Offhand", "arx:ring_gold_ruby")) { basicStrength += 1 }
    if (checkForItem(player, "Feet", "arx:ring_naginitis_ruby")) { basicStrength += 2 }
    if (checkForItem(player, "Offhand", "arx:ring_naginitis_ruby")) { basicStrength += 2 }
    if (checkForItem(player, "Feet", "arx:ring_caryite_ruby")) { basicStrength += 3 }
    if (checkForItem(player, "Offhand", "arx:ring_caryite_ruby")) { basicStrength += 3 }
    if (checkForItem(player, "Feet", "arx:ring_toliriite_ruby")) { basicStrength += 4 }
    if (checkForItem(player, "Offhand", "arx:ring_toliriite_ruby")) { basicStrength += 4 }
    if (checkForItem(player, "Feet", "arx:ring_lamenite_ruby")) { basicStrength += 5 }
    if (checkForItem(player, "Offhand", "arx:ring_lamenite_ruby")) { basicStrength += 5 }

    if (checkForItem(player, "Legs", "arx:durasteel_bracers")) { basicStrength += 1 }

    if (checkForItem(player, "Legs", "arx:amul_bloody_circle")) { basicStrength += 0.5 }
    if (checkForItem(player, "Legs", "arx:amul_essence_of_vicious_demon")) { basicStrength += 3 }

    // Прокач
    basicStrength += (player.getDynamicProperty('skill:strength_level') / 2)

    // Черты
    if (checkForTrait(player, 'loner')) {
        const playersNearLoner = getPlayersInRadius(player, 8)
        if (playersNearLoner.length > 0) { basicStrength -= 0.5 }
        else { basicStrength += 0.5 }
    }

    // Нокаут
    if (player.getProperty('arx:is_knocked')) { basicStrength -= 999 }

    // Нет перса
    if (player.getDynamicProperty('hasRegisteredCharacter') === false) { basicStrength -= 999 }

    // Увеличение от бонуса фиоликса
    if (player.getDynamicProperty('statsBonusByFiolix') > 0) { basicStrength += 2 }

    // От рюкзаков
    if (checkForItem(player, "Legs", "arx:big_bag")) { basicStrength -= 8 }
    if (checkForItem(player, "Legs", "arx:default_bag")) { basicStrength -= 4 }
    if (checkForItem(player, "Legs", "arx:mini_bag")) { basicStrength -= 1 }

    // Воздействие стресса
    switch (player.getDynamicProperty('stressLevel')) {
        case 4: basicStrength -= checkForTrait(player, 'conscious') ? 3 : 4; break
        case 3: basicStrength -= 2; break
        case 2: basicStrength -= 1; break
        case -2: basicStrength += 1; break
        case -3: basicStrength += 2; break
        case -4: basicStrength += 3; break
    }

    // Штрафовое срезание от перегруза
    if (player?.getDynamicProperty('overLoading') > 0) { basicStrength -= (player?.getDynamicProperty('overLoading') * 3) }

    // Срезание от кольца гладиатора
    if ((checkForItem(player, 'Feet', 'arx:ring_aluminum_amethyst') || checkForItem(player, 'Offhand', 'arx:ring_aluminum_amethyst')) && basicStrength > 1) basicStrength = 1

    // Штраф от запрета атаки
    if (player?.getDynamicProperty("prohibit_damage") > 0) { basicStrength -= 99999 }

    // Штрафовое срезание от отката
    basicStrength -= Math.ceil(player.getDynamicProperty("attackCD") / 20) * 4

    // Записывание в DP
    sDP(player, 'basicStrength', basicStrength)

    return basicStrength
}

// Intercept damage
world.beforeEvents.entityHurt.subscribe((event) => {
    // === Vars ===
    let dmg = event.damage + 0
    const e = event.hurtEntity
    const damager = event.damageSource.damagingEntity
    const cause = event.damageSource.cause

    // e.currentHP (== getComponent('minecraft:health')?.currentValue) returns hp AFTER the entity has taken damage.
    const healthAfter = e.currentHP
    const healthBefore = healthAfter !== undefined ? healthAfter + dmg : undefined
    // Is the hit killing the entity?
    const fatal = healthAfter !== undefined && (healthAfter <= 0)

    // === Edit damage ===
    if (damager?.typeId === 'minecraft:player') {
        dmg += calculateStrength(damager)
    }

    const healthAfterModification = healthBefore - dmg

    // console.warn(
    //     '\nhealthBefore: ', healthBefore,
    //     '\nhealthAfter: ', healthAfter,
    //     '\nhealthAfterModification: ', healthAfterModification,
    //     '\ndmg: ', dmg,
    //     '\nfatal: ', fatal
    // )

    // === Custom logic ===

    // A player was damaged
    if (e.typeId === 'minecraft:player') {
        // Not registered. Decline damage
        if (!e.gDP('hasRegisteredCharacter')) {
            event.cancel = true
        }
        // Fatal. Enter knockout without vanilla death.
        else if (fatal) {
            event.cancel = true
            Knockout.enter(e)
        }
    }

    // === Apply result damage ===
    event.damage = dmg
})

// Удары сущностей
world.afterEvents.entityHitEntity.subscribe((hitEvent) => {
    const damaged = hitEvent.hitEntity
    const damager = hitEvent.damagingEntity

    // Ударил игрок
    if (damager.typeId == 'minecraft:player') {
        iDP(damager, 'anticheat:autoclick_tracker')
        // Мечом модератора
        if (checkForItem(damager, "Mainhand", "arx:mod_sword")) {
            if (damager.hasTag('is_sneaking')) {
                damaged.remove()
            } else {
                damaged.kill()
            }
        }

        // Lobby character creation
        if (damaged.typeId === 'arx:lobby_character_creation') {
            const playerDeviceType = damager.clientSystemInfo.platformType
            switch (playerDeviceType) {
                case 'Desktop':
                    damager.sendMessage(`Right-click to interact`)
                    break
                case 'Mobile':
                    damager.sendMessage(`Long-press to interact`)
                    break
            }
        }
    }
    // Ударил культист воин
    if (damager.typeId == 'arx:cultist_warrior_rat') {
        if (Math.random() > 0.5) damager.runCommand('playanimation @s animation.cultist_warrior_rat.attack_slash')
        else damager.runCommand('playanimation @s animation.cultist_warrior_rat.attack_pierce')
    }
    // По игроку, блокировка
    if (damaged.typeId === 'minecraft:player' && damaged.getDynamicProperty('blockingResistanceCD') > 0) {

        // === ПРОВЕРКА: АТАКА СЗАДИ? ===
        const damagedPos = damaged.location;
        const damagerPos = damager.location;

        // Вектор от блокирующего к атакующему (в плоскости XZ)
        const toDamagerX = damagerPos.x - damagedPos.x;
        const toDamagerZ = damagerPos.z - damagedPos.z;

        // Направление взгляда блокирующего (уже нормализован)
        const viewDir = damaged.getViewDirection();

        // Скалярное произведение в плоскости XZ (игнорируем Y)
        const dot = viewDir.x * toDamagerX + viewDir.z * toDamagerZ;

        // Если dot <= 0 — атакующий сзади или точно сбоку (90°+)
        // Можно сделать порог, например, dot < -0.1 для "точно сзади", но пока просто <= 0
        // Игроку попали в спину
        if (dot <= 0) {
            if (damager.getDynamicProperty('basicStrength') > 0) {
                const damagerItem = damager.typeId === 'minecraft:player' ? damager.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand) : undefined
                const minimalDamage = damagerItem?.getTags()?.includes('is_weapon') ? 5 : 2

                damaged.runCommand('camera @s fade time 0 0 1.5 color 200 20 10')
                // Дамагаем с игнором брони
                const damageAmount = Math.max(damager.getDynamicProperty('basicStrength') ?? 0, minimalDamage)
                damaged.applyDamage(damageAmount, { cause: "ramAttack", damagingEntity: damager })
                damaged.addEffect('slowness', 20, { amplifier: 1, showParticles: false })
                sDP(damaged, 'blockingResistanceCD', 1)
                iDP(damaged, 'attackCD', 50)
            }
            else {
                if (damager.typeId === 'minecraft:player') damager.sendMessage('§cВы слишком ослаблены, чтобы нанести удар в спину')
            }
        }
        // Игроку попали в лицо
        else {

            // Animate attack + give CD. Default processAttack trigger won't trigger cus it triggers only when entity deals damage.
            if (damager.typeId === 'minecraft:player') processAttack(damager, false)

            const damagerItem = damager.typeId === 'minecraft:player' ? damager.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand) : undefined
            const damagedItem = damaged.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand)

            const damagerItemTags = damagerItem?.getTags()
            const damagedItemTags = damagedItem?.getTags()

            // Звук
            const pitch = 0.7 + Math.random() * 0.6;
            if (damagerItem) {
                if (damagerItemTags.includes('material_wooden')) damager.runCommand(`playsound blocking.onattack.wooden @a ~ ~ ~ 1 ${pitch}`)
                else if (damagerItemTags.includes('material_stone')) damager.runCommand(`playsound blocking.onattack.stone @a ~ ~ ~ 1 ${pitch}`)
                else if (damagerItemTags.includes('material_metal')) damager.runCommand(`playsound blocking.onattack.metal @a ~ ~ ~ 1 ${pitch}`)
                else if (damagerItemTags.includes('material_rare_metal')) damager.runCommand(`playsound blocking.onattack.rare_metal @a ~ ~ ~ 1 ${pitch}`)
            }
            if (damagedItem) {
                if (damagedItemTags.includes('material_wooden')) damaged.runCommand(`playsound blocking.onblock.wooden @a ~ ~ ~ 1 ${pitch}`)
                else if (damagedItemTags.includes('material_stone')) damaged.runCommand(`playsound blocking.onblock.stone @a ~ ~ ~ 1 ${pitch}`)
                else if (damagedItemTags.includes('material_metal')) damaged.runCommand(`playsound blocking.onblock.metal @a ~ ~ ~ 1 ${pitch}`)
                else if (damagedItemTags.includes('material_rare_metal')) damaged.runCommand(`playsound blocking.onblock.rare_metal @a ~ ~ ~ 1 ${pitch}`)
            }

            damaged.runCommand('playsound on_block @a ~ ~ ~')
            damaged.runCommand('execute positioned ~ ~1.0 ~ positioned ^ ^ ^0.5 run particle arx:blocking_sparks')
            // Отбрасываем
            const viewDirection = damager.getViewDirection() // Отталкиваем в направлении взгляда атакующего
            const blockingSkill = Math.cbrt(damaged.getDynamicProperty('skill:blocking_level') + 1)
            damaged.applyKnockback({ x: viewDirection.x * 2 / blockingSkill, z: viewDirection.z * 2 / blockingSkill }, 0.4 / blockingSkill)
            damager.applyKnockback({ x: viewDirection.x * -1 / blockingSkill, z: viewDirection.z * -1 / blockingSkill }, 0.2 / blockingSkill)
            // Обработка переменных
            if (damaged.getDynamicProperty('blockingResistanceCD') > 12) {
                iDP(damaged, 'blockingResistanceCD', -12)
            } else {
                sDP(damaged, 'blockingResistanceCD', 1)
            }
            if (damaged.getDynamicProperty('prohibit_damage') > 12) {
                iDP(damaged, 'prohibit_damage', -12)
            } else {
                sDP(damaged, 'prohibit_damage', 1)
            }
            sDP(damaged, 'blockingPlayerWasAttacked', 25)
            increaseSkillProgress(damaged, 'blocking', 20)
        }
    }
})

// Постановка блоков
world.afterEvents.playerPlaceBlock.subscribe((placeEvent) => {
    // Увеличиваем счетчик поставленных блоков
    placeEvent.player.runCommand("scoreboard players add @s count_placed_blocks 1")
})

// Ломание блоков
world.afterEvents.playerBreakBlock.subscribe((breakEvent) => {
    // Увеличиваем счетчик сломаных блоков
    breakEvent.player.runCommand("scoreboard players add @s count_broken_blocks 1")
})

// Функция поднятия игрока. Не имеет встроенных проверок, только выполняет задачу
function pickUpPlayer(initiator, playerToPickUp) {
    playerToPickUp.runCommand(`ride @s start_riding "${initiator?.name}" teleport_rider`)
    playerToPickUp.runCommand('event entity @s arx:enter_knockout')
    initiator.runCommand('playanimation @s animation.player.pick_up_knocked_player')
}

/**
 * Вычисляет расстояние между двумя сущностями
 * @param {Entity} entity1 - Первая сущность
 * @param {Entity} entity2 - Вторая сущность
 * @returns {number} Расстояние в блоках
 */
export function getDistanceBetween(entity1, entity2) {
    if (!entity1?.location || !entity2?.location) return undefined;

    return Math.hypot(
        entity1.location.x - entity2.location.x,
        entity1.location.y - entity2.location.y,
        entity1.location.z - entity2.location.z
    );
}

// Взаимодействие с сущностями на пкм
world.afterEvents.playerInteractWithEntity.subscribe(async (interactEvent) => {
    // Interaction with a plater
    if (interactEvent.target?.typeId == "minecraft:player") {

        const self = interactEvent.player // Initiator
        const target = interactEvent.target // The entity that was interacted with
        const distance = getDistanceBetween(target, self)

        if (distance < 2) {
            UI.dynamicActionFormData(self, {
                pickUp: {
                    exe: async () => {
                        if (await isPlayerCompletelyLoaded(target)) {
                            const mainhandItem = getItem(target, 'mainhand')

                            if (!mainhandItem?.getTags().includes('is_weapon')) pickUpPlayer(self, target)
                            else {
                                self.sendMessage(`Can't pick up a player when he is holding a weapon`)
                            }
                        }
                        else {
                            self.sendMessage(`${target.getDynamicProperty('name')} is not fully loaded yet...`)
                        }
                    },
                    icon: "textures/ui/player_interaction/pick_up",
                },
                rob: {
                    condition: () => target.getProperty('arx:is_knocked'),
                    icon: "textures/ui/player_interaction/rob",
                    exe: () => Rob.openUI(self, target)
                },
                kill: {
                    condition: () => target.getProperty('arx:is_knocked') && !target.isRiding,
                    exe: () => Knockout.RPDeath(target),
                    icon: "textures/ui/player_interaction/kill",
                }
            },
                "player_interaction",
                { title: target.RPName }
            )
        }
    }
    // Создание персонажа в лобби
    else if (interactEvent.target?.typeId == "arx:lobby_character_creation") {
        registerCharacter(interactEvent.player)
    }
    // Статуя Синриады у Порочных Садов
    else if (interactEvent.target?.typeId == "arx:statue_of_sinriada") {
        sl(interactEvent.player, 'lobby.statue_of_sinriada')
    }
    // Аси
    else if (interactEvent.target?.typeId == "arx:asi") {
        showDialog(interactEvent.player, 'asi', 'start')
    }
    // Газ в баре
    else if (interactEvent.target?.typeId == "arx:gasgolder_in_bar") {
        showDialog(interactEvent.player, 'gasgolder_in_bar_ch1', 'start')
    }
})

export const customDimensionIds = [
    'arx:guide_realm'
]

// При запуске мира
system.beforeEvents.startup.subscribe(initEvent => {
    initEvent.blockComponentRegistry.registerCustomComponent('arx:blockInteration', {
        onPlayerInteract(event) { // Взаимодействие с блоком через ПКМ
            const b = event.block
            let executeOnBlockPosition = `execute positioned ${b.location.x} ${b.location.y} ${b.location.z} run `
            switch (b.type.id) {

                // Таблички
                case "arx:ancient_nameplate_above_military_gate_in_e19": // ЗАМЕНИТЬ НА ТАБЛУ ПОРОЧНОГО ДЕМОНА
                    event.player.runCommand(executeOnBlockPosition + "function high_tec/nameplates/ancient_nameplate_above_military_gate_in_e19")
                    break

                // Капкан
                case "arx:iron_trap":
                    event.player.runCommand(executeOnBlockPosition + "function blocks/iron_trap/iron_trap_collapse_by_interaction")
                    break
                case "arx:iron_trap_collapsed":
                    event.player.runCommand(executeOnBlockPosition + "function blocks/iron_trap/iron_trap_open")
                    break

                // Меч порочного демона
                case "arx:vicious_demon_sword":
                    interactWithViciousDemonSpawner(event.player)
                    break

                case "arx:piece_of_red_cloth":
                    event.player.sendMessage('§c§lКлочок красной ткани\n§r§f§oИнтересно, как он тут оказался?')
                    break

                case "arx:provolocka_diary":
                    event.player.sendMessage('§v§lРаскрытая тетрадь\n§r§fВ прошлый раз я в локациях древних нашла столько всего! Продала Фринцеру с Цугундером на 6 с половиной крайнцев. В этот раз я повышаю ставку - надо пройти через скрытый портал в Порочных Садах, там наверняка куча всего интересного.\nЯ осмотрела это загадочное дрвенее место. Оно очень необычное! Здесь есть стальная машина, я уже встречала такую - ей надо дать слиток железа, и она вернёт какую-то зеленую бумажку. Пустая трата ресурсов, да и к тому же эта машина, видать, сломана. Я нашла кучу всего, что можно вынести. Секунду, кажется я слышу шаги. Допишу позже')
                    break

                // Мусорка
                case "arx:trash_can":
                    event.player.runCommand(executeOnBlockPosition + "function high_tec/talk_with_trash_can")
                    break

                // Табличка у порочного демона
                case "arx:ancient_nameplate_in_scull_temple":
                    event.player.runCommand(executeOnBlockPosition + "function high_tec/nameplates/ancient_nameplate_in_scull_temple")
                    break

                // Алтарь
                case "arx:divine_altar":
                    event.player.runCommand(`tellraw @s { "rawtext": [ { "text": "§fНанесите удар по непризрачному разумному вырубленному существу на этом алтаре, чтобы уничтожить его и получить перо Бога." } ] }`)
                    break

                // Cotton
                case "arx:cotton_plant":
                    if (b.permutation.getState("arx:growth_stage") == 6) { // Has the plant finally grown?
                        b.setPermutation(b.permutation.withState("arx:growth_stage", 4))
                        b.dimension.runCommand(executeOnBlockPosition + `loot spawn ~ ~ ~ loot "blocks/nature/cotton_plant_mature"`)
                    }
                    break

                // Grape
                case "arx:grape_plant":
                    const finalStage = 9

                    if (b.permutation.getState("arx:growth_stage") == finalStage) { // Has the plant finally grown?
                        b.setPermutation(b.permutation.withState("arx:growth_stage", 5))
                        b.dimension.runCommand(executeOnBlockPosition + `loot spawn ~ ~ ~ loot "blocks/nature/grape_mature_finally"`)
                    }
                    break
            }
        }
    });
    initEvent.blockComponentRegistry.registerCustomComponent('arx:onEntityStepOn', {
        onStepOn(event) { // Наступаение на блок
            const b = event.block
            let executeOnBlockPosition = `execute positioned ${b.location.x} ${b.location.y} ${b.location.z} run `
            switch (b.type.id) {

                // Таблички
                case "arx:mushroom":
                case "arx:mp_mushroom":
                case "arx:fly_agaric":
                    if (event.entity.typeId === "minecraft:player") {
                        b.setType('minecraft:air')
                    }
                    break

                // Капкан
                case "arx:iron_trap":
                    event.entity.runCommand(executeOnBlockPosition + "function blocks/iron_trap/iron_trap_collapse_by_step")
                    break
            }
        }
    });
    initEvent.blockComponentRegistry.registerCustomComponent('arx:onTick', {
        onTick(event) { // Тиканье блока
            const b = event.block
            const d = b.dimension
            let executeOnBlockPosition = `execute positioned ${b.location.x} ${b.location.y} ${b.location.z} run `
            switch (b.type.id) {

                // Защитные конструкции
                case "arx:wooden_obstruction":
                    d.runCommand(executeOnBlockPosition + "damage @e[type=!item, r=1] 1 none")
                    break
                case "arx:iron_obstruction":
                    d.runCommand(executeOnBlockPosition + "damage @e[type=!item, r=1] 4 none")
                    break
                case "arx:chloronite_obstruction":
                    d.runCommand(executeOnBlockPosition + "damage @e[type=!item, r=1] 8 none")
                    d.runCommand(executeOnBlockPosition + "effect @e[type=!item, r=1] fatal_poison 5 2")
                    break

                // Прерыватели магического передвижения
                case "arx:breaker_of_modified_moving_t1":
                    d.runCommand(executeOnBlockPosition + "tag @a[r=8] add disable_magic_of_modified_moving_activate")
                    d.runCommand(executeOnBlockPosition + "tag @a[r=8] add disable_magic_of_modified_moving")
                    break
                case "arx:breaker_of_modified_moving_t2":
                    d.runCommand(executeOnBlockPosition + "tag @a[r=16] add disable_magic_of_modified_moving_activate")
                    d.runCommand(executeOnBlockPosition + "tag @a[r=16] add disable_magic_of_modified_moving")
                    break
                case "arx:breaker_of_modified_moving_t3_":
                    d.runCommand(executeOnBlockPosition + "tag @a[r=32] add disable_magic_of_modified_moving_activate")
                    d.runCommand(executeOnBlockPosition + "tag @a[r=32] add disable_magic_of_modified_moving")
                    break

                // Нагреватор
                case "arx:heater":
                    d.runCommand(executeOnBlockPosition + "tag @a[r=16] add heating_by_heater_block_activate")
                    d.runCommand(executeOnBlockPosition + "tag @a[r=16] add heating_by_heater_block_control")
                    break

                // Порочный кирпич
                case "arx:grim_stonebricks":
                    d.runCommand(executeOnBlockPosition + "particle arx:grim_stonebricks ~ ~ ~")
                    break

                // Горн
                case "arx:forge_crafting_table":
                    d.runCommand(executeOnBlockPosition + "particle minecraft:lava_particle ~ ~1 ~")
                    break

                default:
                    const blockId = event.block.typeId
                    // Baits
                    if (blockId.startsWith("arx:bait_")) {
                        event.block.setType('air')
                    }

                    // Блок - светящийся блок
                    if (blockId.startsWith("arx:dynamic_light_block")) {
                        // Получаем сущности рядом
                        const entities = event.block.dimension.getEntities({ location: event.block.location, maxDistance: 2 })
                        // Если никого нет, сразу ставим воздух
                        if (entities.length === 0) event.block.setType('minecraft:air')
                        // Если есть
                        else {
                            let allowBlockToStay = false
                            for (const entity of entities) {
                                const dynamicLightPower = entity.getDynamicProperty('dynamicLightPower')
                                const currentBlockLightPower = blockId.slice(24)
                                if (dynamicLightPower == currentBlockLightPower) allowBlockToStay = true
                            }
                            if (!allowBlockToStay) event.block.setType('minecraft:air')
                        }
                    }
            }
        }
    });
    initEvent.blockComponentRegistry.registerCustomComponent('arx:onRandomTick', {
        onRandomTick(event) { // Рандомное тиканье блока
            const b = event.block
            switch (b.type.id) {

                // Tea
                case "arx:tea_corp":
                    if (b.permutation.getState("arx:growth_stage") < 4 && Math.random() < 0.15) { // Has the plant finally grown?
                        b.setPermutation(b.permutation.withState("arx:growth_stage", b.permutation.getState("arx:growth_stage") + 1))
                    }
                    break

                // Cotton
                case "arx:cotton_plant":
                    if (b.permutation.getState("arx:growth_stage") < 6 && Math.random() < 0.07) { // Has the plant finally grown?
                        b.setPermutation(b.permutation.withState("arx:growth_stage", b.permutation.getState("arx:growth_stage") + 1))
                    }
                    break

                // Grape
                case "arx:grape_plant":
                    if (b.permutation.getState("arx:growth_stage") < 9 && Math.random() < 0.1) { // Has the plant finally grown?
                        b.setPermutation(b.permutation.withState("arx:growth_stage", b.permutation.getState("arx:growth_stage") + 1))
                    }
                    break
            }
        }
    })
    for (const dId of customDimensionIds) {
        initEvent.dimensionRegistry.registerCustomDimension(dId)
    }
    // === Custom commands ===
    const ccr = initEvent.customCommandRegistry

    // Weapon upgrade
    ccr.registerCommand(
        {
            name: WEAPON_SKILL_COMMAND,
            description: 'Apply an upgrade to you weapon',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
        },
        origin => {
            const player = origin.initiator ?? origin.sourceEntity
            openWeaponSkillPick(player)
            return { status: CustomCommandStatus.Success }
        }
    )
    // Structure Builder
    ccr.registerEnum('arx:sbOptions', ['p1', 'p2'])
    ccr.registerCommand(
        {
            name: 'arx:sb',
            description: 'Structure Builder functions',
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: true,
            mandatoryParameters: [
                {
                    name: 'arx:sbOptions',
                    type: CustomCommandParamType.Enum
                }
            ]
        },
        (origin, arg0) => {
            const p = origin.initiator ?? origin.sourceEntity
            if (arg0 === "p1") {
                setSBPoint(p, 1, p.location)
            }
            else if (arg0 === "p2") {
                setSBPoint(p, 2, p.location)
            }
            return { status: CustomCommandStatus.Success }
        }
    )
    // sDP
    ccr.registerEnum('arx:sdpOptions0', ['me', 'world'])
    ccr.registerEnum('arx:sdpOptions1', ['number', 'bool', 'string'])
    ccr.registerCommand(
        {
            name: 'arx:sdp',
            description: 'Set Dynamic Property',
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: true,
            mandatoryParameters: [
                { // target
                    name: 'arx:sdpOptions0',
                    type: CustomCommandParamType.Enum
                },
                { // data type
                    name: 'arx:sdpOptions1',
                    type: CustomCommandParamType.Enum
                },
                { // dp name
                    name: 'arx:dpName',
                    type: CustomCommandParamType.String
                },
                { // value
                    name: 'arx:value',
                    type: CustomCommandParamType.String
                }
            ]
        },
        (origin, arg0, arg1, arg2, arg3) => {
            const p = origin.initiator ?? origin.sourceEntity
            let entityToSetDP = arg1 === 'world' ? world : p

            if (arg1 === 'number') arg3 = Number(arg3)
            if (arg1 === 'bool') {
                if (arg3.toLowerCase() === 'true') arg3 = true
                else arg3 = false
            }
            sDP(entityToSetDP, arg2, arg3)

            return { status: CustomCommandStatus.Success }
        }
    )
    // Emote
    ccr.registerEnum('arx:emotionsEnum', emotionsList)
    ccr.registerCommand(
        {
            name: 'arx:emote',
            description: 'Run emotion',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                {
                    name: 'arx:emotionsEnum',
                    type: CustomCommandParamType.Enum
                }
            ]
        },
        (origin, arg0) => {
            const p = origin.initiator ?? origin.sourceEntity
            // Run emotion
            emote(p, arg0)
            return { status: CustomCommandStatus.Success }
        }
    )
    // Ftp (Fast teleportation)
    ccr.registerEnum('arx:ftpOptions', ['spawn', 'lobby', 'save', 'load'])
    ccr.registerCommand(
        {
            name: 'arx:ftp',
            description: 'Fast teleportation (for specific Arx locations)',
            permissionLevel: CommandPermissionLevel.Admin,
            cheatsRequired: false,
            mandatoryParameters: [
                {
                    name: 'arx:ftpOptions',
                    type: CustomCommandParamType.Enum
                }
            ]
        },
        (origin, arg0) => {
            const p = origin.initiator ?? origin.sourceEntity
            // Action
            switch (arg0) {

                case 'spawn':
                    const spawn = world.gDP('worldSpawnPoint')
                    if (spawn) {
                        system.run(() => {
                            p.teleport(spawn, { dimension: world.getDimension('minecraft:overworld') })
                        })
                    } else {
                        p.sendMessage('§cCannot do it beacuse Arx spawn do not exist')
                    }

                    break

                case 'lobby':
                    system.run(() => {
                        p.teleport({ x: -9999.5, y: 4, z: -9999.5 }, { dimension: world.getDimension('minecraft:overworld') })
                    })
                    break

                case 'save':
                    p.sDP('ftpSaved', { location: p.location, dimensionId: p.dimension.id })
                    p.sendMessage('Location is saved')
                    break

                case 'load':
                    const saved = p.gDP('ftpSaved')
                    if (saved) {
                        system.run(() => {
                            p.teleport(saved.location, { dimension: world.getDimension(saved.dimensionId) })
                        })
                    } else {
                        p.sendMessage('§cNo location is saved')
                    }
                    break
            }
            return { status: CustomCommandStatus.Success }
        }
    )
    // Pos
    ccr.registerCommand(
        {
            name: 'arx:pos',
            description: 'Get my coordinates',
            permissionLevel: CommandPermissionLevel.Admin,
            cheatsRequired: true,
        },
        origin => {
            const player = origin.initiator ?? origin.sourceEntity
            if (player.location) {
                const { x, y, z } = player.location;
                const xPos = x.toFixed(1);
                const yPos = y.toFixed(1);
                const zPos = z.toFixed(1);

                player.sendMessage(`Pos > ${xPos} ${yPos} ${zPos}`);
            } else {
                player.sendMessage("Cannot get your position");
            }
        }
    )
    // SetName
    ccr.registerCommand(
        {
            name: 'arx:setname',
            description: 'Change in-game name',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                {
                    name: 'arx:name',
                    type: CustomCommandParamType.String
                }
            ]
        },
        (origin, arg0) => {
            const player = origin.initiator ?? origin.sourceEntity
            if (!arg0) {
                sl(player, 'custom_commands.setName.cannot.empty')
                return
            }
            if (arg0.length > 30) {
                sl(player, 'custom_commands.setName.cannot.long')
                return
            }
            player.sendMessage(``)
            sl(player, 'custom_commands.setName.success', [arg0])
        }
    )
    // Menu
    ccr.registerCommand(
        {
            name: 'arx:menu',
            description: 'Open Arx menu',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
        },
        origin => {
            const player = origin.initiator ?? origin.sourceEntity
            system.run(() => { infoScreen(player) })
        }
    )
    // Menu short
    ccr.registerCommand(
        {
            name: 'arx:m',
            description: 'Open Arx menu',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
        },
        origin => {
            const player = origin.initiator ?? origin.sourceEntity
            system.run(() => { infoScreen(player) })
        }
    )
})

// Попадание сняряда по сущности
world.afterEvents.projectileHitEntity.subscribe((hitEvent) => {
    const damagedEntity = hitEvent.getEntityHit().entity
    const damager = hitEvent.source

    if (damager?.typeId === "minecraft:player" && hitEvent.projectile?.typeId === "minecraft:arrow") {

        if ((getEntityFamilies(damagedEntity).includes('mob') || getEntityFamilies(damagedEntity).includes('animal') || getEntityFamilies(damagedEntity).includes('monster') || damagedEntity.typeId === 'player') &&
            damager != damagedEntity) {

            increaseSkillProgress(damager, "shooting", 15)
        }
    }
})

function bleed(entity, intencity, damager) {
    const particleLoc = entity.getHeadLocation()
    const molang = new MolangVariableMap()
    const hitDirection = damager?.getViewDirection() ?? { x: 0, y: 0, z: 0 }
    molang.setVector3('variable.direction', hitDirection)

    if (intencity > 0) {
        for (let i = 0; i < intencity * 5; i++) {
            entity.dimension.spawnParticle('arx:blood_drop_bright', particleLoc, molang)
        }
        for (let i = 0; i < intencity; i++) {
            entity.dimension.spawnParticle('arx:blood_drop_brightest', particleLoc, molang)
        }
        for (let i = 0; i < intencity * 2; i++) {
            entity.dimension.spawnParticle('arx:blood_drop_dark', particleLoc, molang)
        }
        if (intencity > 5) {
            entity.dimension.spawnParticle('arx:blood_drop_darkest', particleLoc, molang)
        }
    }
}

const bleedingMobs = [
    // Vanilla mobs
    'minecraft:cow', 'minecraft:sheep', 'minecraft:chicken', 'minecraft:pig', 'minecraft:bat', 'minecraft:wolf', 'minecraft:polar_bear', 'minecraft:ocelot', 'minecraft:cat',
    'minecraft:parrot', 'minecraft:rabbit', 'minecraft:llama', 'minecraft:horse', 'minecraft:donkey', 'minecraft:mule', 'minecraft:turtle', 'minecraft:panda', 'minecraft:fox', 'minecraft:cave_spider',
    'minecraft:piglin', 'minecraft:hoglin', 'minecraft:goat', 'minecraft:axolotl', 'minecraft:frog', 'minecraft:camel', 'minecraft:sniffer', 'minecraft:armadillo',

    'minecraft:villager', 'minecraft:pillager',

    // Arx
    "arx:cave_rat", "arx:fat_larva", "arx:deer", "arx:tsugunder", "arx:snow_lady", "arx:snow_bars", "arx:small_rat_white", "arx:small_rat_black", "arx:rat_monster_white", "arx:rat_monster",
    "arx:rat_eliminator", "arx:leech", "arx:larva", "arx:kapibara", "arx:hungry_rat", "arx:goose", "arx:gasgolder_istribitor", "arx:gasgolder", "arx:gabz", "arx:frintser", "arx:fiercewolf", "arx:crocodile",
    "arx:buffalo", "arx:big_leech", "arx:bear", "arx:baguk"
]

// Ранение сущности
world.afterEvents.entityHurt.subscribe((hurtEvent) => {
    const damager = hurtEvent.damageSource.damagingEntity
    const damaged = hurtEvent.hurtEntity
    const damageCause = hurtEvent.damageSource.cause

    // Если нам надо кровоточить за моба
    if (bleedingMobs.includes(damaged.typeId)) {

        let bloodIntencity = hurtEvent.damage - 2

        // Если есть колесо крови
        if (checkForItem(damager, "Legs", "arx:amul_bloody_circle")) {
            bloodIntencity *= 3
        }

        bleed(damaged, bloodIntencity, damager)
    }

    // Если ранили игрока
    if (damaged.typeId === "minecraft:player" && hurtEvent.damage >= 0) {
        const player = damaged

        // Проверяем тип урона
        if (damaged != damager && damageCause != 'campfire' && damageCause != 'contact' && damageCause != 'drowning' && damageCause != 'fall' && damageCause != 'magma' &&
            damageCause != 'soulCampfire' && damageCause != 'starve' && damageCause != 'suffocation' && damageCause != 'fire' && damageCause != 'fireTick' && damageCause != 'freezing') {

            increaseSkillProgress(damaged, "hp", hurtEvent.damage * 10)

            if (checkForItem(player, 'Legs', 'arx:amul_dash')) {
                player.applyKnockback({ x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6 }, 0.3)
            }
        }

        // Кровь игрока
        if (damageCause != 'campfire' && damageCause != 'drowning' && damageCause != 'magma' && damageCause != 'soulCampfire' && damageCause != 'starve' && damageCause != 'suffocation' &&
            damageCause != 'fire' && damageCause != 'fireTick' && damageCause != 'freezing' && damageCause != 'lava') {

            let bloodIntencity = hurtEvent.damage - 2 // Определяем интенсивность кровотечения

            // Если есть колесо крови
            if (damager && checkForItem(damager, "Legs", "arx:amul_bloody_circle")) {
                bloodIntencity *= 3
            }

            if (bloodIntencity > 100) { bloodIntencity = 100 }

            bleed(damaged, bloodIntencity, damager)
        }
        // Стресс
        {
            const stressMultiplier = checkForTrait(player, 'cowardly') ? 2 : 1

            const valueToAccure = hurtEvent.damage * 150 * stressMultiplier + 50

            if (valueToAccure > 0) iDP(player, 'stress', valueToAccure)
        }
        // Visual
        {
            player.runCommand('camerashake add @s 0.5 0.1 rotational')
            player.runCommand('camerashake add @s 0.2 0.1 positional')
            player.addEffect('blindness', 20, { amplifier: 0, showParticles: false })
        }
        // Обработка черты "добрый"
        const nearbyPlayers = getPlayersInRadius(player, 10, false)
        for (const nearbyPlayer of nearbyPlayers) {
            if (checkForTrait(nearbyPlayer, 'kind')) {
                if (hurtEvent.damage > 0) iDP(nearbyPlayer, 'stress', 30 * hurtEvent.damage)
            }
        }
        // Hits counter
        incScore(player, 'count_hits')
    }
    else if (damaged.typeId === "arx:whipping_dummy") { // Если ранили куклу для битья
        damaged?.runCommand(`tellraw @a[r=8] { "rawtext": [ { "text": "§cDMG >>> §l§f${hurtEvent.damage.toFixed(1)}" } ] }`)
        const randomIndex = Math.floor(Math.random() * 4 + 1)
        damaged?.runCommand(`effect @s instant_health 1 255 true`)

        if (damageCause != "fire" && damageCause != "fireTick" && damageCause != "lava") {
            damaged?.runCommand(`playanimation @s animation.whipping_dummy.on_hit${randomIndex}`)
            damaged?.runCommand(`playsound whipping_dummy.take_hit @a ~ ~ ~`)
            const particlesNum = hurtEvent.damage > 200 ? 200 : hurtEvent.damage
            for (let i = 0; i < particlesNum; i++) {
                damaged?.runCommand('particle arx:whipping_dummy_filing ~ ~ ~')
            }
        }
    }
    else if (damaged.typeId === "arx:gasgolder") {
        damaged.runCommand('summon arx:gasgolder_istribitor ~ ~ ~ facing @p')
        damaged.runCommand('effect @a[r=7] blindness 2 0 true')
        damaged.runCommand('playsound mob.rat_eliminator.spawn @a ~ ~ ~')

        damaged.runCommand('event entity @s arx:on_hurt_event')
    }

    // Если атакует игрок
    if (damager) { // Проверяем, есть ли вообще атакующая сущность
        // Если атакует игрок
        if (damager.typeId === "minecraft:player" && damageCause !== "projectile" && !damager.hasTag('used_magic_damage_just_now')) {

            processAttack(damager)

            // Вкач. Проверяем, не бьем ли мы куклу для битья
            if ((getEntityFamilies(damaged).includes('mob') || getEntityFamilies(damaged).includes('animal') || getEntityFamilies(damaged).includes('monster') || getEntityFamilies(damaged).includes('player'))
                && damaged != damager) {

                // Увеличиваем силу
                increaseSkillProgress(damager, "strength", hurtEvent.damage * 2)

                // Увеличиваем выносливость, если мы с перегрузом
                if (damager.getDynamicProperty("overLoading") > 0) {
                    increaseSkillProgress(damager, "endurance", hurtEvent.damage * 4)
                }
            }

            grantWeaponXpFromDamage(damager, hurtEvent.damage)
        }
    }
})

// Обрабатываем атаку. Выдаем кд + анимируем
function processAttack(player, playSound = true) {
    const weapon = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand)
    if (weapon !== undefined) { // Определяем, есть ли какие-то теги на том, чем наносим удар

        if (weapon.getTags().includes("is_dagger")) {
            iDP(player, 'attackCD', 20)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            if (player.isOnGround) playRandomAnimation(player, ['animation.attack.dagger.a', 'animation.attack.dagger.b'])
            else playRandomAnimation(player, ['animation.attack.dagger.c'])
        }
        else if (weapon.getTags().includes("is_default_sword")) {
            iDP(player, 'attackCD', 30)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            if (player.isMoving) playRandomAnimation(player, ['animation.attack.default.fast_moving'])
            else playRandomAnimation(player, ['animation.attack.default.a', 'animation.attack.default.b', 'animation.attack.default.c'])
        }
        else if (weapon.getTags().includes("is_heavy_sword")) {
            iDP(player, 'attackCD', 60)
            if (playSound) player.runCommand('playsound axe_use @a ~ ~ ~')
            playRandomAnimation(player, ['animation.attack.heavy.a'])
        }
        else if (weapon.getTags().includes("is_lance")) {
            iDP(player, 'attackCD', 40)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            playRandomAnimation(player, ['animation.attack.lance.a', 'animation.attack.lance.b'])
        }
        else if (weapon.getTags().includes("is_long_sword")) {
            iDP(player, 'attackCD', 40)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            playRandomAnimation(player, ['animation.attack.longsword.a', 'animation.attack.longsword.b', 'animation.attack.longsword.c'])
        }
        else if (weapon.getTags().includes("is_scythe")) {
            iDP(player, 'attackCD', 40)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            playRandomAnimation(player, ['animation.attack.scythe.a'])
        }
        else if (weapon.getTags().includes("is_staff")) {
            iDP(player, 'attackCD', 40)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            playRandomAnimation(player, ['animation.attack.staff.a'])
        }
        else if (weapon.getTags().includes("is_hheavy_sword")) {
            iDP(player, 'attackCD', 80)
            if (playSound) player.runCommand('playsound axe_use @a ~ ~ ~')
            playRandomAnimation(player, ['animation.attack.veryheavy.a'])
        }
        else if (weapon.getTags().includes("is_wand")) {
            iDP(player, 'attackCD', 30)
            playRandomAnimation(player, ['animation.attack.unarmed.a'])
        }
        else { // Например, игрок атакует куриным мясом. Оно не регистрируется, как оружие
            iDP(player, 'attackCD', 35)
            playRandomAnimation(player, ['animation.attack.unarmed.a'])
        }
    }
    else { // Атакующий атакует руками
        iDP(player, 'attackCD', 35)
        playRandomAnimation(player, ['animation.attack.unarmed.a'])
    }
}

/**
 * Проигрывает случайную анимацию у игрока
 * @param {Player} player - игрок, у которого будет проиграна анимация
 * @param {string[]} animations - массив названий анимаций (строки)
 */
function playRandomAnimation(player, animations) {
    if (!animations || animations.length === 0) {
        console.warn("playRandomAnimation: передан пустой массив анимаций");
        return;
    }

    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    player.runCommand(`playanimation @s ${randomAnimation}`);
}

// Функция для получения family сущности
export function getEntityFamilies(entity) {
    const familyComponent = entity.getComponent(EntityComponentTypes.TypeFamily);

    if (familyComponent) {
        // Компонент 'minecraft:family' существует.
        return familyComponent.getTypeFamilies(); // Возвращаем массив строк.
    } else {
        return []; // Возвращаем пустой массив.
    }
}

// Food catch
world.afterEvents.itemCompleteUse.subscribe((event) => {
    onConsume(event.source, event.itemStack)
})