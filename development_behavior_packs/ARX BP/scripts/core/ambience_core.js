import { system, world } from "@minecraft/server";
import { gDP } from "../arxLib/DPOperations";

// Глобальное хранилище: ключ — "x,y,z", значение — { x, y, z, biome }
const biomeBlocks = new Map(); // лучше Map, чем обычный объект

/**
 * Извлекает название биома из тега игрока вида "BIOME_desert"
 * @param {Player} player
 * @returns {string | null} — например, "desert"
 */
function getBiomeFromPlayer(player) {
    for (const tag of player.getTags()) {
        if (tag.startsWith("BIOME_")) {
            return tag.substring(6); // "BIOME_desert" → "desert"
        }
    }
    return null;
}

/**
 * Получает все блоки вокруг игрока с координатами, кратными 10 по X/Z и кратными 5 по Y
 */
function getBlocksAtMultiplesOf10(player, radius = 30) {
    const dim = player.dimension;
    const loc = player.location;

    // Горизонтальные границы (X, Z)
    const startX = Math.floor((loc.x - radius) / 10) * 10;
    const endX = Math.floor((loc.x + radius) / 10) * 10;
    const startZ = Math.floor((loc.z - radius) / 10) * 10;
    const endZ = Math.floor((loc.z + radius) / 10) * 10;

    // Вертикальные границы (Y): ±10 от игрока, шаг 5, с учётом валидного диапазона [-64, 319]
    const startY = Math.max(-64, Math.floor((loc.y - 10) / 5) * 5);
    const endY = Math.min(319, Math.floor((loc.y + 10) / 5) * 5);

    const blocks = [];

    for (let x = startX; x <= endX; x += 10) {
        for (let z = startZ; z <= endZ; z += 10) {
            for (let y = startY; y <= endY; y += 5) {
                const block = dim.getBlock({ x, y, z });
                if (block) {
                    blocks.push(block);
                }
            }
        }
    }

    return blocks;
}

// Основной цикл
system.runInterval(() => {
    if (gDP(world, 'enableAmbienceCore') === false) return

    // Очищаем карту перед новым проходом? Нет — лучше накапливать, но можно и обновлять.
    // Вариант: оставляем всё, что есть, и обновляем/добавляем заново.
    // Но если игрок ушёл — блоки останутся. Поэтому лучше **пересобирать полностью** каждый раз.

    biomeBlocks.clear(); // ← пересоздаём список каждый тик (или каждые 40 тиков)

    for (const player of world.getPlayers()) {
        const biome = getBiomeFromPlayer(player);

        const nearbyBlocks = getBlocksAtMultiplesOf10(player, 12);
        const dimension = player.dimension

        for (const block of nearbyBlocks) {
            const key = `${block.x},${block.y},${block.z}`;
            // Сохраняем блок с биомом игрока
            biomeBlocks.set(key, {
                x: block.x,
                y: block.y,
                z: block.z,
                biome: biome,
                dimension: dimension
            });
        }
    }

    // === Теперь можно использовать biomeBlocks для частиц ===
    // Например, раз в несколько тиков спавнить частицы
    for (const blockData of biomeBlocks.values()) {

        if (blockData.y < 0) blockData.dimension.runCommand(`particle arx:mine_fog ${blockData.x} ${blockData.y} ${blockData.z}`)
        else if (blockData.biome === 'desert' && blockData.y > 60) blockData.dimension.runCommand(`particle arx:ambience_desert ${blockData.x} ${blockData.y} ${blockData.z}`)
        else if (blockData.biome === 'forest' && Math.random() < 0.3 && blockData.y > 60) blockData.dimension.runCommand(`particle arx:forest_ambient_leaf ${blockData.x} ${blockData.y} ${blockData.z}`)
        else if (blockData.biome === 'river' || blockData.biome === 'ocean' || blockData.biome === 'beach') blockData.dimension.runCommand(`particle arx:river_fog ${blockData.x} ${blockData.y} ${blockData.z}`)
    }

}, 40)