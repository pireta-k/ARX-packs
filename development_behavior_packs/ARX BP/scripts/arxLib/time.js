// A library that helps user with operations with time

import { system } from "@minecraft/server";

/** Sleep for specified number of ticks.
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