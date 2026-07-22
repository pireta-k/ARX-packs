import { EntityComponentTypes, EquipmentSlot } from "@minecraft/server"

// Анимируем бездействие
export function animate_killing_time(player) {
    const item = player.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand)

    let allowAnimation = true

    if (item?.getTags().includes('is_weapon') ||
        item?.getTags().includes('is_umbrella') ||
        killingTimeBanItems.includes(item?.typeId) ||
        player.getProperty('arx:is_knocked') ||
        player.hasTag('is_emoting_via_arx_command') ||
        player.isRiding ||
        player.hasRiders) allowAnimation = false

    if (allowAnimation) {
        const animVar = Math.floor(Math.random() * 3)

        player.runCommand(`playanimation @s animation.killing_time.${killingTimeAnims[animVar]} a 0.1 "query.is_moving || q.property('arx:is_knocked') == true"`)
    }
}

// Разные анимации бездействия
const killingTimeAnims = ['a', 'b', 'c']

// Конкретные предметы, в руке с которыми нельзя анимировать бездействие
const killingTimeBanItems = [
    "minecraft:torch", "minecraft:redstone_torch", "minecraft:soul_torch", "minecraft:copper_torch", "minecraft:fishing_rod",
    'minecraft:wooden_pickaxe', 'minecraft:stone_pickaxe', 'minecraft:golden_pickaxe', 'minecraft:iron_pickaxe', 'minecraft:diamond_pickaxe', 'minecraft:netherite_pickaxe',
    'minecraft:wooden_axe', 'minecraft:stone_axe', 'minecraft:golden_axe', 'minecraft:iron_axe', 'minecraft:diamond_axe', 'minecraft:netherite_axe',
    'minecraft:wooden_hoe', 'minecraft:stone_hoe', 'minecraft:golden_hoe', 'minecraft:iron_hoe', 'minecraft:diamond_hoe', 'minecraft:netherite_hoe',
    'minecraft:wooden_shovel', 'minecraft:stone_shovel', 'minecraft:golden_shovel', 'minecraft:iron_shovel', 'minecraft:diamond_shovel', 'minecraft:netherite_shovel',
    'minecraft:bow', 'minecraft:crossbow', 'minecraft:trident',

    'arx:mod_sword'
]

// Задержка между анимациями бездействия, сек.
export const killingTimeAnimDelay = 20