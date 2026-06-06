import { system } from "@minecraft/server"

/** 
 * Runs a job in the server thread. 
 * @template T
 * @param {Iterable<T>} array
 * @param {(value: T, index: Number)} callback
 * @returns {Promise<Void>} 
 */
export function runJob(array, callback) {
    return new Promise(resolve => {
        system.runJob((function* gen() {
            let index = 0;
            for (const value of array) {
                callback(value, index)
                
                index++
                yield;
            }

            resolve();
        })())
    })
}