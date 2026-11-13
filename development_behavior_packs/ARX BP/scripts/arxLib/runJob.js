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

/** @param {(data: { index: Number, stop: Boolean }) => Void} callback */
export function runJobDynamic(callback) {
    return new Promise(resolve => {
        const data = { index: 0, stop: false };

        system.runJob((function* gen() {
            while (!data.stop) {
                callback(data);
                
                data.index++
                yield;
            }

            resolve();
        })());
    });
}