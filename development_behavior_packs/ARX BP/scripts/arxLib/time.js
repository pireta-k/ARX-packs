// A library that helps user with operations with time

import { system, world } from "@minecraft/server";

/** Sleep for a specified number of ticks.
 * ASYNC function.
 * @param {Number} ticks
 */
export async function sleep(ticks) {
    await system.waitTicks(ticks)
}

/** Get current time in real world
 * @param {Number} offset
 * @returns {Time}
 */
export function getTime(offset = 0) {
    const currentTime = new Date()
    currentTime.setHours(currentTime.getHours() + offset)
    return currentTime
}

class Stopwatch {
    /** @type {Map<String, { value: Number, multiplier: Number }>} */
    static #records = new Map();

    /** @type {Record<String, Number>} */
    static #timings = {};

    /** @param {String} id */
    static start(id) {
        this.#timings[id] = Date.now();
    }

    /** @param {String} id */
    static stop(id, maxRecords = 100) {
        const time = Date.now() - (this.#timings[id] || Date.now());
        delete this.#timings[id];

        const record = this.#records.get(id) || this.#records.set(id, { value: 0, multiplier: 0 }).get(id);
        record.value = (record.value*record.multiplier + time) / (record.multiplier + 1);
        record.multiplier = Math.min(record.multiplier + 1, maxRecords);
    }

    /** @param {String} id */
    static get(id) {
        const record = this.#records.get(id) || this.#records.set(id, { value: 0, multiplier: 0 }).get(id);
        return record.value;
    }

    static getIds() { return this.#records.keys(); }
}

// Функция для определения дня/ночи
export function isDay() {
    return world.getTimeOfDay() < 12550 || world.getTimeOfDay() > 23500
}