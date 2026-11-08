let allCaches = new Set()

/**
 * @typedef {object} CacheOptions
 * @property {boolean} [saveUndefined=false] - save undefined to cache? False by default
 */

export class Cache {
    /**
     * @param {CacheOptions} cacheOptions 
     */
    constructor(cacheOptions = {}) {
        this.map = new Map()
        this.saveUndefined = !!cacheOptions.saveUndefined 
        allCaches.add(this)
        
    }

    /**
     * Get a value, using cache. For async use getAsync()
     * @param {any} key - unique something. Cache system gets cache by this key.
     * @param {() => any} func - a function to get a value if it's not in cache
     * @param {...*} args - args to calculate a function with 
     * @returns {any}
     */
    get(key, func, ...args) {
        // Get from cache
        if (this.map.has(key)) return this.map.get(key)
        // Run directly
        let result
        try {
            result = func(...args)
        }
        catch (error) {
            console.error(error, error.stack)
            return undefined
        }
        if (result !== undefined || this.saveUndefined) this.map.set(key, result)
        return result
    }

    /**
     * Get a value, using cache. Func myst be async
     * @param {any} key - unique something. Cache system gets cache by this key.
     * @param {() => Promise<any>} func - an async function to get a value if it's not in cache
     * @returns {any}
     */
    async getAsync(key, func) {
        // Get from cache
        if (this.map.has(key)) return this.map.get(key)
        // Run directly
        let result
        try {
            result = await func()
        }
        catch (error) {
            console.error(error, error.stack)
            return undefined
        }
        if (result !== undefined || this.saveUndefined) this.map.set(key, result)
        return result
    }

    /**
     * Delete a key from cache
     * @param {any} key 
     */
    delete(key) {
        this.map.delete(key)
    }

    /** Reset cache */
    reset() {
        this.map.clear()
    }

    /** Remove this cache system instance */
    dispose() {
        allCaches.delete(this)
        this.map.clear()
    }

    /** Clear all Arx cache */
    static resetCaches() {
        for (const cache of allCaches) {
            cache.reset()
        }
        console.log('Cache has been reset')
    }
}