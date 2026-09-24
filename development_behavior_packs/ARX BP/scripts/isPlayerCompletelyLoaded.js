import { Player, system } from "@minecraft/server"

// Config
const LOAD_CHECK = {
    key: 'arx:loading_test',
    timeout: 500,
    interval: 50
};

/**
 * Waits to player to be loaded
 * @param {Player} player
 * @param {Object} [options]
 * @param {number} [options.timeout] - макс. время ожидания в мс
 * @param {number} [options.interval] - интервал опроса в мс
 * @returns {Promise<boolean>} - true когда игрок загружен, false если таймаут/ошибка
 */
export async function isPlayerCompletelyLoaded(player, options = {}) {
    const timeout = options.timeout ?? LOAD_CHECK.timeout;
    const interval = options.interval ?? LOAD_CHECK.interval;

    return new Promise((resolve) => {
        const oldValue = player.getProperty(LOAD_CHECK.key);
        const expectedValue = !oldValue;

        player.setProperty(LOAD_CHECK.key, expectedValue);

        const startTime = Date.now();

        const poll = () => {
            try {
                if (player.getProperty(LOAD_CHECK.key) === expectedValue) {
                    resolve(true);
                } else if (Date.now() - startTime >= timeout) {
                    resolve(false);
                } else {
                    system.runTimeout(poll, interval / 50); // runTimeout takes ticks. Converting MS into them
                }
            } catch {
                console.warn('Error!')
                resolve(false);
            }
        };
        poll();
    })
}