import { acquireTrait, checkForTrait } from "../traits/traitsOperations"
import { ssDP, iDP, gDP } from "../DPOperations"
import { sl, fl } from '../lang/fetchLocalization'

// All registered food
// Key - food id, value - deliciousness
export const foodRegistry = {
    meat: {
        "arx:rats_potato": 65,
        "arx:bloody_steak": 60,
        "arx:borsch": 60,
        "arx:cake_contemplator": 65,
        "arx:camel_shashlik": 35,
        "arx:caretaker": -30,
        "arx:chicken_in_vodka": 50,
        "arx:cutlet": 32,
        "arx:chicken_crisps": 42,
        "arx:dumplings": 35,
        "arx:fried_eggs": 20,
        "arx:fried_frog_legs_in_elvish": 75,
        "arx:simple_bouillon": 22,
        "arx:horse_shashlik": 64,
        "arx:juicy_goat_ribs": 46,
        "arx:khryuchevo": 55,
        "arx:king_steak": 87,
        "arx:llama_in_wine": 60,
        "arx:meat_bug_bug": 30,
        "arx:pirate_steak": 48,
        "arx:rat_monster_with_potatoes_and_mayonnaise": 68,
        "arx:rat_potato_casserole": 65,
        "arx:reconstruction_meat_cake": 58,
        "arx:salo": 18,
        "arx:sausage": 38,
        "arx:small_rat_cutlet": 10,
        "arx:snow_bars_steak": 60,
        "arx:steamed_dolphin": 35,
        "arx:stew": 55,
        "arx:forcemeat": 10,

        "arx:fried_camel_meat": 24,
        "arx:fried_cave_rat_meat": 20,
        "arx:fried_dolphin_meat": 20,
        "arx:fried_fiercewolf_meat": 20,
        "arx:fried_venison": 20,
        "arx:fried_frog_legs": 20,
        "arx:fried_goat_meat": 20,
        "arx:fried_horse_meat": 20,
        "arx:fried_kapibara_meat": 20,
        "arx:fried_llama_meat": 20,
        "arx:fried_meat_beetle_meat": 20,
        "arx:fried_rat_monster_meat": 22,
        "arx:fried_sea_turtle_meat": 20,
        "arx:fried_small_rat_meat": 20,
        "arx:fried_snow_bars_meat": 20,

        "arx:camel_meat": -14,
        "arx:cave_rat_meat": -10,
        "arx:dolphin_meat": -10,
        "arx:fiercewolf_meat": -10,
        "arx:venison": 10,
        "arx:frog_legs": 10,
        "arx:goat_meat": -10,
        "arx:horse_meat": -10,
        "arx:kapibara_meat": -10,
        "arx:llama_meat": -10,
        "arx:meat_beetle_meat": -10,
        "arx:rabbit_meat": -10,
        "arx:rat_monster_meat": -12,
        "arx:sea_turtle_meat": -10,
        "arx:small_rat_meat": -10,
        "arx:snow_bars_meat": -10,

        // Vanilla
        "minecraft:cooked_chicken": 20,
        "minecraft:cooked_beef": 22,
        "minecraft:cooked_porkchop": 20,
        "minecraft:cooked_mutton": 20,
        "minecraft:cooked_rabbit": 20,

        "minecraft:chicken": 5,
        "minecraft:beef": 5,
        "minecraft:porkchop": 5,
        "minecraft:mutton": 5,
        "minecraft:rabbit": 5,

        "minecraft:rotten_flesh": -100,
        "minecraft:spider_eye": -30,
        "minecraft:rabbit_stew": 45,
    },
    fish: {
        "arx:devil_soup": 95,
        "arx:electrodinner": 85,
        "arx:fish_crisps": 20,
        "arx:fish_cutlet": 24,
        "arx:fish_pie": 45,
        "arx:fish_soup": 30,
        "arx:fried_fugu": 41,
        "arx:fulfilled_wish": 80,
        "arx:shark_soup": 95,
        "arx:sun_snack": 92,
        "arx:wave_of_taste": 87,

        "arx:le_fishe_au_chocolat": 42,

        // Fried arx fish
        "arx:baby_shark_fried": 34,
        "arx:cramp_fish_fried": 35,
        "arx:devil_fish_fried": 36,
        "arx:gold_tail_fish_fried": 34,
        "arx:piranha_fried": 30,
        "arx:sun_fish_fried": 34,
        "arx:wave_fish_fried": 34,

        // Raw arx fish
        "arx:baby_shark": 12,
        "arx:cramp_fish": 12,
        "arx:devil_fish": 13,
        "arx:gold_tail_fish": 12,
        "arx:piranha": 15,
        "arx:sun_fish": 12,
        "arx:wave_fish": 13,

        // Vanilla
        "minecraft:salmon": 10,
        "minecraft:cod": -5,
        "minecraft:pufferfish": -10,
        "minecraft:tropical_fish": 10,

        "minecraft:cooked_salmon": 20,
        "minecraft:cooked_cod": 14,
    },
    bread: {
        "arx:apple_pie": 60,
        "arx:bandit_pie": 55,
        "arx:beefbread": 30,
        "arx:cactus_sandwich": 26,
        "arx:eggbread": 35,
        "arx:fiercebread": 50,
        "arx:gnil_pie": -30,
        "arx:iron_pie": 30,
        "arx:king_bun": 80,
        "arx:lasagna": 85,
        "arx:loaf": 40,
        "arx:meat_pie": 65,
        "arx:pie": 30,
        "arx:piratebread": 40,
        "arx:spicy_beefbread": 65,

        "arx:caramel_buns": 60,
        "arx:sugar_donut": 52,
        "arx:sweet_bun": 50,
        "arx:sweet_pie": 62,

        // Vanilla
        "minecraft:cookie": 35,
        "minecraft:bread": 30,
        "minecraft:pumpkin_pie": 65,

    },
    dairy: {
        "arx:cheese": 60,
        "arx:curd": 20,
        "arx:kefir": 35,
        "arx:sour_cream": 44,

        "arx:blue_cheese": 85,
        "arx:green_cheese": 78,
        "arx:red_cheese": 90,
        "arx:butter": -10,
        "arx:posset": 60,
        "arx:milk_tart": 65,
        "arx:cream": 25,
        "arx:ayran": 45,
        "arx:yogurt": 35,
    },
    herbal: {
        "arx:baked_apple": 15,
        "arx:cactus_soup": 15,
        "arx:crisps": 35,
        "arx:elven_salad": 44,
        "arx:fiolix": 20,
        "arx:fire_berry": 8,
        "arx:grass_soup": 3,
        "arx:green_salad": 35,
        "arx:juicy_grass": 2,
        "arx:kaspora_salad": 36,
        "arx:mayonnaise": 20,
        "arx:mushroom_soup": 35,
        "arx:royal_salad": 65,
        "arx:spicy_mushroom_soup": 42,
        "arx:spicy_sauce": 18,
        "arx:tea_cup_of_evergreen_dream": 85,
        "arx:tea_cup_of_fioletic": 30,
        "arx:tea_cup_of_fok": 45,
        "arx:tea_cup_of_kavra": 37,
        "arx:wooden_crust": -75,

        "arx:black_tea": 25,
        "arx:black_teamed": 50,
        "arx:celestial_tea": 37,
        "arx:green_tea": 22,
        "arx:green_teasugaralt": 39,
        "arx:milk_ylyn": 34,
        "arx:pyer_tea": 30,
        "arx:meat_tea": 32,
        "arx:snow_tea": 45,
        "arx:sun_tea": 52,
        "arx:white_tea": 30,
        "arx:yellow_tea": 26,

        "arx:caramel": 23,
        "arx:chocolate_bar": 27,

        "arx:grape": 25,

        // Vanilla
        "minecraft:honey_bottle": 25,

        "minecraft:apple": 18,
        "minecraft:golden_apple": 30,
        "minecraft:enchanted_golden_apple": 100,

        "minecraft:potato": 20,
        "minecraft:poisonous_potato": -40,
        "minecraft:baked_potato": 35,
        "minecraft:carrot": 18,
        "minecraft:golden_carrot": 30,
        "minecraft:beetroot": 14,
        "minecraft:beetroot_soup": 46,
        "minecraft:melon_slice": 25,

        "minecraft:sweet_berries": 20,
        "minecraft:glow_berries": 24,

        "minecraft:suspicious_stew": -30,
        "minecraft:dried_kelp": 8,

        "minecraft:chorus_fruit": 8,
        "minecraft:chorus_fruit_popped": 20,
    }
}

// All possible tastes
const tasteTypes = Object.keys(foodRegistry)

// Get food type
function getFoodType(foodId) {
    for (const key of Object.keys(foodRegistry)) {
        if (foodId in foodRegistry[key]) return key
    }
    return undefined
}

// Check, is the given food in the registry
export function isFoodInRegistry(foodId) {
    if (!foodId) return false

    return Object.values(foodRegistry).some(category => foodId in category)
}

// Triggers when a player eats a food
export function onFoodConsume(player, itemStack) {

    const foodId = itemStack.typeId
    const foodType = getFoodType(foodId)

    // If there is no data about given food in registry
    if (!isFoodInRegistry(foodId)) return undefined

    // Get player's taste to given food
    const playerTaste = player.getDynamicProperty(`playerTaste_${foodType}`) ?? 0

    // Get food's deleciousness
    const foodTaste = foodRegistry[foodType][foodId]

    // Happiness bonus
    let happinessBonus = (playerTaste * 1.3) + foodTaste

    // Normalize value
    happinessBonus *= 15

    // Decrease from trait
    if (checkForTrait(player, 'fastidious')) happinessBonus -= 200

    // Если мы ещё не проголодались
    if (player.getDynamicProperty('foodCD') > 1 && happinessBonus > 0) {
        happinessBonus = 0
        sl(player, 'food.cannot_gain_happines')
    }

    // Send message
    notifyAboutFoodTastiness(player, happinessBonus)

    // Выдаем счастье
    iDP(player, 'stress', -happinessBonus)

    // Set CD for happiness gain
    ssDP(player, 'foodCD', 3 * 60)
}

function notifyAboutFoodTastiness(player, happinessBonus) {
    let messageStart
    let messageColor
    if (happinessBonus < -500) {
        messageStart = fl(player, 'food.not_tasty')
        messageColor = "§c"
    }
    else if (happinessBonus > 500) {
        messageStart = fl(player, 'food.tasty')
        messageColor = "§a"
    }
    else {
        messageStart = fl(player, 'food.normal_taste')
        messageColor = "§e"
    }
    const mathSign = happinessBonus >= 0 ? '+' : ''

    player.sendMessage(`${messageColor}${messageStart}§f ${fl(player, 'food.happiness_bonus')} ${messageColor}${mathSign}${(happinessBonus / 1000).toFixed(1)}§f.`)
}