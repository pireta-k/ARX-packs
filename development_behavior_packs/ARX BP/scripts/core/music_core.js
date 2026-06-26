// ARX music core

// Imports
import { world } from "@minecraft/server"
import { sDP } from "../arxLib/DPOperations"
import { checkForItem } from "../items/checkForItem"

const musicOptions = { fade: 2, loop: true }

// All locations.
// Proprity - if conditions for more then 1 locations met, system would choose location with less priority
const musicLocations = {
    // Mines
    "upperMines": {
        priority: 10,
        condition: (player) => player.location.y < 55,
        music: 'Ossuary_6_Air'
    },
    "deepslateMines": {
        priority: 9,
        condition: (player) => player.location.y < 0,
        music: 'Ossuary_2_Turn'
    },
    "lushCaves": {
        priority: 5,
        condition: (player) => isInBiome(player, 'minecraft:lush_caves'),
        music: 'Easy_Lemon'
    },
    "deepDark": {
        priority: 4,
        condition: (player) => isInBiome(player, 'minecraft:deep_dark'),
        music: 'Shadowlands_5_Antechamber'
    },

    // Sky
    "sky": {
        priority: 5,
        condition: (player) => player.location.y > 120 && player.dimension.id === 'minecraft:overworld' && player.location.y - player.dimension.getBlockBelow(player.location).location.y > 14,
        music: 'Cattails'
    },

    // Overworld biomes
    "coldDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, ['frozen', 'cold'], 'any') && isDay(),
        music: 'The_Snow_Queen'
    },
    "coldNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, ['frozen', 'cold'], 'any') && !isDay(),
        music: 'Hidden_Past'
    },

    "birchDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'birch') && isDay(),
        music: 'Morning'
    },
    "birchNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'birch') && !isDay(),
        music: 'Silent_Night'
    },

    "beachDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'beach') && isDay(),
        music: 'Kalimba_Relaxation_Music'
    },
    "beachNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'beach') && !isDay(),
        music: 'Silver_Flame'
    },

    "desertDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'desert') && isDay(),
        music: 'Adding_the_Sun'
    },
    "desertNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'desert') && !isDay(),
        music: 'Comfortable_Mystery'
    },

    "taigaDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'taiga') && isDay(),
        music: 'Ossuary_5_Rest'
    },
    "taigaNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'taiga') && !isDay(),
        music: 'Ossuary_1_A_Beginning'
    },

    "jungleDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'jungle') && isDay(),
        music: 'Energizing'
    },
    "jungleNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'jungle') && !isDay(),
        music: 'Ancient_Rite'
    },

    "mangroveSwamp": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'mangrove_swamp'),
        music: 'An_Upsetting_Theme'
    },
    "swamp": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'swamp'),
        music: 'Myst_on_the_Moor'
    },

    "mesaDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'mesa') && isDay(),
        music: 'Ether_Vox'
    },
    "mesaNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'mesa') && !isDay(),
        music: 'Immersed'
    },

    "oceanDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, ['ocean', 'river'], 'any') && isDay(),
        music: 'Skye_Cuillin'
    },
    "oceanNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, ['ocean', 'river'], 'any') && !isDay(),
        music: 'Almost_New'
    },

    "plainsDay": {
        priority: 6,
        condition: (player) => isInBiomeWithTag(player, ['plains', 'meadow', 'flower_forest'], 'any') && isDay(),
        music: 'Evening'
    },
    "plainsNight": {
        priority: 6,
        condition: (player) => isInBiomeWithTag(player, ['plains', 'meadow', 'flower_forest'], 'any') && !isDay(),
        music: 'Canon_in_D_Major'
    },

    "roofedDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'roofed') && isDay(),
        music: 'Man_Down'
    },
    "roofedNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'roofed') && !isDay(),
        music: 'Moorland'
    },

    "savannaDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'savanna') && isDay(),
        music: 'Ascending_the_Vale'
    },
    "savannaNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'savanna') && !isDay(),
        music: 'With_the_Sea'
    },

    "cherryHillsDay": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'cherry_grove') && isDay(),
        music: 'Devonshire_Waltz_Allegretto'
    },
    "cherryHillsNight": {
        priority: 10,
        condition: (player) => isInBiomeWithTag(player, 'cherry_grove') && !isDay(),
        music: 'A_Very_Brady_Special'
    },

    "forestDay": { // Default forest. Priority is 11 cus other forests also can trigger player.hasTag("BIOME_forest")
        priority: 11,
        condition: (player) => isInBiomeWithTag(player, 'forest') && isDay(),
        music: 'Magic_Forest'
    },
    "forestNight": {
        priority: 11,
        condition: (player) => isInBiomeWithTag(player, 'forest') && !isDay(),
        music: 'Temple_of_the_Manes'
    },

    // Special locations
    "lobby": {
        priority: 2,
        condition: (player) => isEntityInCube(player, [-10020, 0, -10020], [-9980, 20, -9980]) && player.dimension.id === 'minecraft:overworld',
        music: 'Martian_Cowboy'
    },

    // Other dimensions
    "nether": {
        priority: 99,
        condition: (player) => player.dimension.id === 'minecraft:nether',
        music: 'Wretched_Destroyer'
    },

    // Special conditions
    "knocked": {
        priority: 0,
        condition: (player) => player.getDynamicProperty('respawnDelay') > 0,
        music: 'Clean_Soul'
    },
    // Special conditions
    "building": {
        priority: 1,
        condition: (player) => checkForItem(player, 'mainhand', 'arx:structurebuilder_hammer'),
        music: 'Bad_Piggies_Building_Contraptions'
    },
}

export function musicCoreTick() {
    for (const player of world.getPlayers()) {

        // Where the player was last processed time?
        let musicLocationLastPass = player.getDynamicProperty('musicLocation')

        // Check every location of musicLocations
        let validLocs = []
        for (const loc in musicLocations) {
            if (musicLocations[loc].condition(player)) validLocs.push(loc)
        }

        // Now, process the array. System needs to define only one music location
        let musicLocation
        if (validLocs.length === 0) musicLocation = 'unknown'
        else if (validLocs.length === 1) musicLocation = validLocs[0]
        else {
            // Finding the location with lowest priority
            musicLocation = validLocs.reduce((bestKey, currentKey) => {
                const best = musicLocations[bestKey]
                const current = musicLocations[currentKey]
                return current.priority < best.priority ? currentKey : bestKey
            })
        }

        // Remember player's music location
        sDP(player, 'musicLocation', musicLocation)

        // Now, check, is the music alrealy playing?
        if (musicLocation === musicLocationLastPass) continue

        // Music location changed. Play new music
        // console.warn(`Music ${musicLocationLastPass} -> ${musicLocation}`) // Uncomment to track music location changing
        if (musicLocation === 'unknown') player.playMusic('Morgana_Rides', musicOptions)
        else player.playMusic(musicLocations[musicLocation].music, musicOptions)
    }
}

// Is the player in specified biome?
function isInBiome(player, biome) {
    const d = player.dimension
    if (d.isChunkLoaded(player.location)) return d.getBiome(player.location).id === biome
    else return false
}

// Get tags of a player's biome. tag — строка или массив тегов; mode — 'any' (хотя бы один) или 'all' (все)
function isInBiomeWithTag(player, tag, mode = 'any') {
    const d = player.dimension
    if (!d.isChunkLoaded(player.location)) return false

    const biomeTags = d.getBiome(player.location).getTags()
    const required = Array.isArray(tag) ? tag : [tag]

    if (mode === 'all') return required.every(t => biomeTags.includes(t))
    return required.some(t => biomeTags.includes(t))
}



// Функция для определения дня/ночи
function isDay() {
    return world.getTimeOfDay() < 12550 || world.getTimeOfDay() > 23500
}



// Находится ли игрок в указанном кубе (координаты передаются как массивы [x, y, z])
export function isEntityInCube(entity, cornerA, cornerB) {
    // Проверяем, что entity существует и является объектом
    if (!entity || typeof entity !== 'object') {
        return false;
    }

    try {
        const entityPos = entity.location;

        // Находим минимальные и максимальные координаты куба
        const minx = Math.min(cornerA[0], cornerB[0]);
        const maxx = Math.max(cornerA[0], cornerB[0]);
        const miny = Math.min(cornerA[1], cornerB[1]);
        const maxy = Math.max(cornerA[1], cornerB[1]);
        const minz = Math.min(cornerA[2], cornerB[2]);
        const maxz = Math.max(cornerA[2], cornerB[2]);

        // Проверяем, находится ли сущность внутри куба
        return (
            entityPos.x >= minx && entityPos.x <= maxx &&
            entityPos.y >= miny && entityPos.y <= maxy &&
            entityPos.z >= minz && entityPos.z <= maxz
        );
    } catch (err) {
        // Игнорируем ошибку типа "InvalidActorError" — сущность недействительна
        if (err.message.includes("Failed to get property 'location'") ||
            err.message.includes("Entity being invalid")) {
            return false; // или true, если хочешь считать, что "не в кубе"
        }
        throw err; // Пробрасываем другие ошибки
    }
}

// Возвращает массив сущностей, находящихся внутри указанного куба
export function getEntitiesInCube(cornerA, cornerB, dimensionName = "overworld") {
    // Находим минимальные и максимальные координаты куба
    const minX = Math.min(cornerA[0], cornerB[0]);
    const maxX = Math.max(cornerA[0], cornerB[0]);
    const minY = Math.min(cornerA[1], cornerB[1]);
    const maxY = Math.max(cornerA[1], cornerB[1]);
    const minZ = Math.min(cornerA[2], cornerB[2]);
    const maxZ = Math.max(cornerA[2], cornerB[2]);

    // Получаем измерение
    const dimension = world.getDimension(dimensionName);

    // Получаем все сущности в измерении
    // Для оптимизации можно добавить фильтр по типу, если заранее известен нужный тип.
    const allEntities = dimension.getEntities();

    // Фильтруем сущности, оставляя только те, что внутри куба
    const entitiesInCube = allEntities.filter(entity => {
        const pos = entity?.location;
        if (pos) {
            return (
                pos.x >= minX && pos.x <= maxX &&
                pos.y >= minY && pos.y <= maxY &&
                pos.z >= minZ && pos.z <= maxZ
            );
        }
    });

    return entitiesInCube;
}