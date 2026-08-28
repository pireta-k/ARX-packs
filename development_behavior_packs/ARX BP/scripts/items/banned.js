/**
 * @typedef {Object} ItemIngredients
 */

/**
 * @type {Record<string, ItemIngredients>}
 */
export const bannedItems = {
    'minecraft:copper_boots': { 'minecraft:copper_ingot': 4 },
    'minecraft:copper_chestplate': { 'minecraft:copper_ingot': 8 },
    'minecraft:copper_helmet': { 'minecraft:copper_ingot': 5 },
    'minecraft:copper_leggings': { 'minecraft:copper': 7 },
    'minecraft:copper_sword': {
        'minecraft:copper_ingot': 2,
        'minecraft:stick': 1
    },

    'minecraft:diamond_boots': { 'minecraft:diamond': 4 },
    'minecraft:diamond_chestplate': { 'minecraft:diamond': 8 },
    'minecraft:diamond_helmet': { 'minecraft:diamond': 5 },
    'minecraft:diamond_leggings': { 'minecraft:diamond': 7 },
    'minecraft:diamond_sword': {
        'minecraft:diamond': 2,
        'minecraft:stick': 1
    },

    'minecraft:golden_boots': { 'minecraft:golden_ingot': 4 },
    'minecraft:golden_chestplate': { 'minecraft:golden_ingot': 8 },
    'minecraft:golden_helmet': { 'minecraft:golden_ingot': 5 },
    'minecraft:golden_leggings': { 'minecraft:golden': 7 },
    'minecraft:golden_sword': {
        'minecraft:golden_ingot': 2,
        'minecraft:stick': 1
    },

    'minecraft:iron_boots': { 'minecraft:iron_ingot': 4 },
    'minecraft:iron_chestplate': { 'minecraft:iron_ingot': 8 },
    'minecraft:iron_helmet': { 'minecraft:iron_ingot': 5 },
    'minecraft:iron_leggings': { 'minecraft:iron': 7 },
    'minecraft:iron_sword': {
        'minecraft:iron_ingot': 2,
        'minecraft:stick': 1
    },

    'minecraft:leather_boots': { 'minecraft:leather': 4 },
    'minecraft:leather_chestplate': { 'minecraft:leather': 8 },
    'minecraft:leather_helmet': { 'minecraft:leather': 5 },
    'minecraft:leather_leggings': { 'minecraft:leather': 7 },
    'minecraft:leather_sword': {
        'minecraft:leather': 2,
        'minecraft:stick': 1
    },

    'minecraft:shield': {
        'planks': 6,
        'iron_ingot': 1
    },
    'minecraft:stone_sword': {
        'minecraft:cobblestone': 2,
        'minecraft:stick': 1
    },
    'minecraft:wooden_sword': {
        'minecraft:planks': 2,
        'minecraft:stick': 1
    },
}