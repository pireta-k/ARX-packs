// ARX javascript

// Imports - Minecraft
import { system, world, EntityComponentTypes, EquipmentSlot, Player, ItemStack, MolangVariableMap, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"

// Imports - Arx functions 
import { getScore, setScore } from './scoresOperations'
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
import './structureBuilder'
import './blocksHistory'

import { registerPlayerVars } from "./registerPlayerVars"
import { checkForItem } from "./checkForItem"
import { gDP, iDP, ssDP } from "./DPOperations"
import { checkForTrait } from "./traits/traitsOperations"
import { getPlayersInRadius } from "./getPlayersInRadius"
import { getItem } from "./items/getItem"
import { getActiveStaffChannel } from "./magic/getActiveStaffChannel"
import { md5, obj2str } from "./converters"
import { isAdmin, getAdmins, getHoster } from './admin'
import { isPlayerCompletelyLoaded } from "./isPlayerCompletelyLoaded"
import { showLanguageForm } from "./lang/form"

// Type of release. 
// Available: alpha, beta, special, stable
export const RELEASE = 'alpha'
export const VERSION = [0, 1, 13]
export const REPOSITORY = 'https://github.com/Ellisy1/ARX-packs'

world.afterEvents.playerButtonInput.subscribe((event) => {
    const button = event.button
    const state = event.newButtonState
    const player = event.player

    if (button === 'Jump') {
        // Кнопку нажали
        if (state === 'Pressed') {
            ssDP(player, 'pressedJumpButton', true)
        }
        // Кнопку отпустили
        else {
            ssDP(player, 'pressedJumpButton', false)
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

// Изменились предметы в инвентаре
world.afterEvents.playerInventoryItemChange.subscribe((event) => {
    const player = event.player
    const item = event.itemStack
    if (item) {

        // Анализ поднимаемного игроком веса
        weighAnalysis(player)

        // Swords registry
        if (item.getTags().includes('is_weapon')) {
            if (!gDP(item, 'everHolded')) {
                item.setLore([
                    'Made by '
                ]);
                ssDP(item, 'everHolded', true)
                ssDP(item, 'xp', 0)
                ssDP(item, 'level', 0)
                ssDP(item, 'abilities', [])
            }
        }
    }
})

// Player spawned (also triggers after knockout)
world.afterEvents.playerSpawn.subscribe(async (event) => {
    const player = event.player; // Получаем объект игрока
    player.nameTag = ""
    player.runCommand("function javascript/scores_autoreg")

    // Restart music
    ssDP(player, 'musicLocation', undefined)

    ssDP(player, 'camera:activeCamera', false)
    ssDP(player, 'camera:tickCountdownToNextTimecode', 0)
    ssDP(player, 'camera:numOfProcessedTimecodes', 0)

    registerPlayerVars(player)

    if (world.getPlayers().length === 1) { // Если только один игрок в мире, т.е. только хостер

        // Check, is this the first time the hoster entered the world with Arx
        let arxEverLoaded = world.getDynamicProperty('arxEverLoaded')
        // It's the first time
        if (!arxEverLoaded) {
            console.warn('Start')
            player.runCommand("function world_reg/_world_reg") // Register scores 
            setScore(player, 'verify', 2) // Register the player as a hoster
            ssDP(player, 'isHoster', true)
            world.setDefaultSpawnLocation({ x: -10000, y: 4, z: -10000 })

            // Gamerules default settings
            world.gameRules.sendCommandFeedback = false
            world.gameRules.doInsomnia = false
            world.gameRules.doWeatherCycle = false
            world.gameRules.showDeathMessages = false
            world.gameRules.doImmediateRespawn = true
            world.gameRules.locatorBar = false
            world.gameRules.spawnRadius = 0
            world.gameRules.showTags = false
            world.gameRules.naturalRegeneration = true
            world.gameRules.recipesUnlock = false

            // Arx default settings
            ssDP(world, 'localChatEnabled', true)

            const d = world.getDimension('minecraft:overworld')

            // Create tickarea
            d.runCommand('tickingarea add -9980 0 -9980 -10020 0 -10020 lobbyReg true')
            const delay = (ticks) => new Promise(resolve => system.runTimeout(resolve, ticks));
            await delay(1)

            // Wait till the hoster is loaded
            await waitUntilHosterIsLoaded(player)
            console.warn('Hoster is loaded')
            player.runCommand('camera @s fade time 0 2 0 color 10 10 10')
            ssDP(world, 'worldSpawnPoint', player.location) // The location where a player spawn after registration

            // Creates lobby and verifies it
            await createLobby(d, player)

            // Loading screen for hoster
            player.runCommand('camera @s fade time 0 2 0 color 10 10 10')
            player.runCommand('title @s title §gArx Ultima')

            ssDP(world, 'arxEverLoaded', true)

            // Functions 
            async function createLobby(d, hoster) {
                // Is the world completely loaded?
                try {
                    console.warn('Trying to create lobby...')
                    hoster.teleport({ x: -9999.5, y: 4, z: -9999.5 }, { checkForBlocks: true, dimension: d, facingLocation: { x: -9999.5, y: 4, z: -9993 }, keepVelocity: false })
                    hoster.runCommand('fill ~-10 ~-10 ~-10 10 10 10 air')
                    // Verify lobby loading
                    // Blocks above broken portal
                    const b1 = d.getBlock({ x: -10001, y: 5, z: -10001 })
                    const b2 = d.getBlock({ x: -10001, y: 5, z: -9999 })
                    const b3 = d.getBlock({ x: -9999, y: 5, z: -10001 })
                    const b4 = d.getBlock({ x: -9999, y: 5, z: -9999 })
                    if (!b1 || !b2 || !b3 || !b4) throw new Error('Lobby is still loading')

                    d.placeFeature('arx:lobby_feature', { x: -9991, y: 0, z: -9989 }, true)

                    // Are the upper blocks really air?
                    const air = 'minecraft:air'
                    if (b1.typeId != air || b2.typeId != air || b3.typeId != air || b4.typeId != air) throw new Error('Wrong lobby placement')

                    // Are the bottom blocks correct?
                    const b5 = d.getBlock({ x: -10001, y: 3, z: -10001 }) // mossy_stone_bricks
                    const b6 = d.getBlock({ x: -10001, y: 3, z: -9999 }) // stone_bricks
                    const b7 = d.getBlock({ x: -9999, y: 3, z: -10001 }) // stone_bricks
                    const b8 = d.getBlock({ x: -9999, y: 3, z: -9999 }) // cracked_stone_bricks

                    if (b5.typeId != 'minecraft:mossy_stone_bricks' || b6.typeId != 'minecraft:stone_bricks' || b7.typeId != 'minecraft:stone_bricks' || b8.typeId != 'minecraft:cracked_stone_bricks') throw new Error('Wrong lobby placement')
                }
                catch {
                    system.runTimeout(() => {
                        createLobby(d, hoster)
                    }, 2)
                }
                // Other thing we have to do
                d.spawnEntity('arx:lobby_character_creation', { x: -9999.5, y: 4, z: -9993 }, { initialRotation: 180 })
                d.spawnEntity('arx:carved_bench', { x: -9994.5, y: 4, z: -10003.5 }, { initialRotation: 90 })
                d.spawnEntity('arx:statue_of_sinriada', { x: -9991.5, y: 8, z: -9997.0 }, { initialRotation: 90 })
                d.runCommand('tickingarea remove lobbyReg')
            }

            async function waitUntilHosterIsLoaded(hoster) {
                hoster.addEffect('instant_health', 60, { amplifier: 255, showParticles: false })
                const hosterLoaded = await isPlayerCompletelyLoaded(hoster)
                // Loading screen for hoster
                if (!hosterLoaded) {
                    await waitUntilHosterIsLoaded(hoster)
                }
            }
        }
    }

    // Is this the thirst time the player entered Arx?
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
        // Set unique id
        {
            ssDP(player, 'id', md5(player.name) + Math.random() * 1000000)
        }

        ssDP(player, 'hasEverPlayedArx', true)
    }
});

// Спавн сущностей
world.afterEvents.entitySpawn.subscribe((spawnEvent) => {
    const entity = spawnEvent.entity

    if (entity.typeId === 'arx:grave') {
        entity.nameTag = 'Hit to break'
    }
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

    if (entity.typeId === 'arx:wandering_flame_of_mines') ssDP(entity, 'dynamicLightPower', 9)
    if (entity.typeId === 'arx:wandering_flame_of_night') ssDP(entity, 'dynamicLightPower', 12)
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
        // По гробу
        if (damaged.typeId === 'arx:grave' && damager.getProperty('arx:is_knocked') === false) {
            damaged.runCommand('kill @s')
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
                ssDP(damaged, 'blockingResistanceCD', 1)
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
                ssDP(damaged, 'blockingResistanceCD', 1)
            }
            if (damaged.getDynamicProperty('prohibit_damage') > 12) {
                iDP(damaged, 'prohibit_damage', -12)
            } else {
                ssDP(damaged, 'prohibit_damage', 1)
            }
            ssDP(damaged, 'blockingPlayerWasAttacked', 25)
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
    playerToPickUp.runCommand('event entity @s arx:property_is_knockout_set_true')
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
    if (interactEvent.target?.typeId == "minecraft:player") {

        const target = interactEvent.target // Взятый игрок
        const self = interactEvent.player // Поднимающий игрок

        // Поднимаем игрока
        if (getDistanceBetween(target, self) < 1) {
            if (await isPlayerCompletelyLoaded(target)) {
                const mainhandItem = getItem(target, 'mainhand')

                if (!mainhandItem?.getTags().includes('is_weapon')) pickUpPlayer(self, target)
                else {
                    self.sendMessage(`Can't pick up a player if he is holding a weapon`)
                }
            }
            else {
                self.sendMessage(`${target.getDynamicProperty('name')} is not fully loaded yet...`)
            }
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

                // Мангал
                case "arx:thermal_cooking_crafting_table":
                    d.runCommand(executeOnBlockPosition + "particle minecraft:campfire_smoke_particle ~ ~0.5 ~")
                    break

                default:
                    // Блок - светящийся блок
                    if (event.block.type.id.startsWith("arx:dynamic_light_block")) {
                        // Получаем сущности рядом
                        const entities = event.block.dimension.getEntities({ location: event.block.location, maxDistance: 2 })
                        // Если никого нет, сразу ставим воздух
                        if (entities.length === 0) event.block.setType('minecraft:air')
                        // Если есть
                        else {
                            let allowBlockToStay = false
                            for (const entity of entities) {
                                const dynamicLightPower = entity.getDynamicProperty('dynamicLightPower')
                                const currentBlockLightPower = event.block.type.id.slice(24)
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
    // Custom commands
    initEvent.customCommandRegistry.registerCommand(
        {
            name: 'arx:test',
            description: 'Just a test func',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
        },
        origin => {
            const player = origin.initiator ?? origin.sourceEntity
            const item = getItem(player, 'mainhand')
            item.setLore('Abc')
            player.sendMessage('abc')
        }
    )
})

// Смерти сущностей
world.afterEvents.entityDie.subscribe((dieEvent) => {
    // Если умер игрок
    if (dieEvent.deadEntity.typeId === "minecraft:player") {
        const player = dieEvent.deadEntity

        // Сообщаем о том, что произошло с игроком, если это его первый нокаут
        if (player.getDynamicProperty('hasEverBeenKnocked') !== true) {
            ssDP(player, 'hasEverBeenKnocked', true)
            player.runCommand(`tellraw @s { "rawtext": [ { "text": "[§aГид§f] > §cВы в нокауте§f. Ничего страшного, это не смерть. Вы полежите около минуты и снова очнётесь. §aВаши вещи§f лежат рядом с вами в деревянном ящике (если они у вас вообще были)." } ] }`)
        }

        ssDP(player, 'blockingResistanceCD', 0)

        // Спавним гроб
        player.runCommand("summon arx:grave ^ ^ ^")

        // Выдаем блокировщики слота
        player.runCommand(`give @s arx:slot_blocker 100 0 {"item_lock": { "mode": "lock_in_slot" } }`)
        player.runCommand(`kill @e[type=item, name="§r§cВы в нокауте, ваш инвентарь заблокирован", r=4]`)

        // Чистим данные о маги-фонарях
        ssDP(player, 'allowMagilight', 0)
        ssDP(player, 'allowArchilight', 0)

        // Выставляем данные о ноке
        player.runCommand('event entity @s arx:property_is_knockout_set_true')

        // Очищаем прогресс навыков
        wipeSkillsProgress(player)

        if (player.getProperty('arx:is_ghost') == true) {
            iDP(player, 'ghostWithering', 3000)
        }

        // Выставляем вариант анимации нокаута
        player.setProperty('arx:is_knocked_anim_var', Math.floor(Math.random() * 2))

        // Увеличиваем счетчик ряда беспрерывных нокаутов (2 = смерть по рп, и 3 если есть кристалл второй жизни)
        player.runCommand('scoreboard players add @s knockout_row_sounter 1')

        // Сбрасываем камеру
        player.runCommand('camera @s clear')

        // Плюсуем счётчик нокаутов
        player.runCommand('scoreboard players add @s count_death 1')

        // Стрессуем
        iDP(player, 'stress', 4000)

        // Выставляем откат нокаута
        ssDP(player, 'respawnDelay', 40 - player.getDynamicProperty('skill:fortitude_level') * 2)

        // Если мы должны умереть по рп
        if (getScore(player, 'knockout_row_sounter') >= 2) {

            player.runCommand('effect @s clear')
            player.runCommand('playsound mob.rat_eliminator.spawn @s ~ ~ ~')
            player.runCommand('event entity @s arx:property_is_knockout_set_0')

            player.runCommand('inputpermission set @s movement enabled')
            player.runCommand('inputpermission set @s camera enabled')

            ssDP(player, 'FiolixNarcoticPower', 0)
            ssDP(player, 'freezing', 0)
            ssDP(player, 'respawnDelay', 0)

            setScore(player, "knockout_row_sounter", 0)
            ssDP(player, 'wetness', 0)

            if (player.getProperty('arx:is_ghost') === true) { // Если призрак

                console.warn(`Смерть призрака ${player.name}`)

                player.runCommand('title @s title §c= Вы окончательно погибли =')
                player.runCommand(`tellraw @s { "rawtext": [ { "text": "§cТак и закончилась эта история. Вы погибли навсегда." } ] }`)
                player.setProperty('arx:is_ghost', false)
                player.setProperty('arx:bust_size', 0)
                executeCommandDelayed(player, 'function knockout_system/data_wipe/_wipe_main')
                executeCommandDelayed(player, 'clear @s')
                executeCommandDelayed(player, 'function tp/1_lobby')

                // Сносим переменные DP
                player.clearDynamicProperties()
                registerPlayerVars(player)

                ssDP(player, 'verify', true)

            } else { // Если не призрак

                console.warn(`Смерть непризначного ${player.name}`)

                player.runCommand('title @s title §c= Вы обращены в призрака =')
                executeCommandDelayed(player, 'effect @s invisibility 60 0 true')
                executeCommandDelayed(player, 'spreadplayers ~ ~ 0 20 @s')
                executeCommandDelayed(player, 'clear @s arx:slot_blocker')
                ssDP(player, 'ghostUltimateResistance', 180)

                player.runCommand(`tellraw @s { "rawtext": [ { "text": "§c! §f§сВы убиты и обращены в §cПРИЗРАКА!§f.\n§c! §fВы §cСОВСЕМ НЕДОЛГО§f неуязвимы к солнцу и воде!\n§c! §fВы невидимы на протяжении минуты." } ] }`)
                player.setProperty('arx:is_ghost', true)

            }

        }
    }
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
    'minecraft:cow', 'minecraft:sheep', 'minecraft:chicken', 'minecraft:pig', 'minecraft:bat', 'minecraft:wolf', 'minecraft:polar_bear', 'minecraft:ocelot', 'minecraft:cat',
    'minecraft:parrot', 'minecraft:rabbit', 'minecraft:llama', 'minecraft:horse', 'minecraft:donkey', 'minecraft:mule', 'minecraft:turtle', 'minecraft:panda', 'minecraft:fox', 'minecraft:cave_spider',
    'minecraft:piglin', 'minecraft:hoglin', 'minecraft:goat', 'minecraft:axolotl', 'minecraft:frog', 'minecraft:camel', 'minecraft:sniffer', 'minecraft:armadillo',

    'minecraft:villager', 'minecraft:pillager',

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


            if (player.getProperty('arx:is_ghost') === false) {
                bleed(damaged, bloodIntencity, damager)
            }
            else {
                player.runCommand("particle arx:ghost_blood ~ ~1.8 ~")
            }
        }
        // Стресс
        {
            const stressMultiplier = checkForTrait(player, 'cowardly') ? 2 : 1

            const valueToAccure = hurtEvent.damage * 150 * stressMultiplier + 50

            if (valueToAccure > 0) iDP(player, 'stress', valueToAccure)
        }
        // Если мы на алтаре
        {
            // Проверяем допуск по типу урона
            if (damager?.typeId === 'minecraft:player' && damageCause === 'entityAttack') {
                if (world.getDimension(damaged.dimension.id).getBlock({ x: damaged.location.x, y: damaged.location.y - 1, z: damaged.location.z }).typeId === 'arx:divine_altar') {
                    // Проверяем допуск по тому, не призрак ли игрок
                    if (damaged.getProperty('arx:is_ghost') === false) {
                        if (damaged.getDynamicProperty('characterLifeSec') > 72000) {
                            // Проверяем допуск по тому, нокнут ли игрок
                            if (damaged.getDynamicProperty('respawnDelay') > 0) {
                                // Проверям допуск по наличию алтаря
                                setScore(player, 'knockout_row_sounter', 99)
                                player.runCommand('loot spawn ~ ~1 ~ loot "custom/gold_feather"')

                                player.runCommand('kill @s')
                                console.warn('Разрешен дроп пера')
                            } else {
                                damager.sendMessage('§cДля убийства на алтаре, убиваемый персонаж должен быть вырублен')
                            }
                        } else {
                            damager.sendMessage('§cЭтот персонаж слишком мало прожил, и пока перо получить с него невозможно')
                        }
                    } else {
                        damager.sendMessage('§cВы не можете убить на алтаре призрачное существо')
                    }
                }
            }

        }
        // Обработка черты "добрый"
        const nearbyPlayers = getPlayersInRadius(player, 10, false)
        for (const nearbyPlayer of nearbyPlayers) {
            if (checkForTrait(nearbyPlayer, 'kind')) {
                if (hurtEvent.damage > 0) iDP(nearbyPlayer, 'stress', 30 * hurtEvent.damage)
            }
        }

        player.runCommand('function javascript/on_get_damage')
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
            if (player.hasTag('on_ground')) playRandomAnimation(player, ['animation.attack.dagger.a', 'animation.attack.dagger.b'])
            else playRandomAnimation(player, ['animation.attack.dagger.c'])
        }
        else if (weapon.getTags().includes("is_default_sword")) {
            iDP(player, 'attackCD', 30)
            if (playSound) player.runCommand('playsound knife_use @a ~ ~ ~')
            if (player.hasTag('is_moving')) playRandomAnimation(player, ['animation.attack.default.fast_moving'])
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

// Режим игры
world.afterEvents.playerGameModeChange.subscribe((event) => {
    if (event.toGameMode !== 'Survival') world.getDimension('minecraft:overworld').runCommand(`tellraw @a[scores={verify=2}] { "rawtext": [ { "text": "§f[§dСистема§f] ${event.player.name} gamemode -> §a${event.toGameMode}" } ] }`)
})

// Entity removing
world.beforeEvents.entityRemove.subscribe(async (event) => {
    const entity = event.removedEntity
    const altitude = entity.location.y
    // If it is grave and it is NOT on 16px-height block
    if (entity.typeId == 'arx:grave' && !Number.isInteger(altitude)) {
        const loc = entity.location
        const d = entity.dimension
        system.runTimeout(() => {
            d.runCommand(`execute positioned ${loc.x} ${loc.y} ${loc.z} as @e[type=item, r=3] at @s run tp @s ${loc.x} ${loc.y} ${loc.z}`)
        }, 1)
    }
})

// Food catch
world.afterEvents.itemCompleteUse.subscribe((event) => {
    onConsume(event.source, event.itemStack)
})