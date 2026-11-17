let allCaches = new Set()

/**
 * @typedef {object} CacheOptions
 * @property {boolean} [saveUndefined=false] - save undefined to cache? False by default
 * @property {number} [limit=undefined] - a max number of items that cache can store. No limit by default
 */

/**
 * @typedef {object} CacheItem
 * @prop {*} item
 * @prop {number} used - number of times this cache item was returned using cache
 */

/** Arx cache system */
export class Cache {
    /** @param {CacheOptions} cacheOptions */
    constructor(cacheOptions = {}) {
        /** @type {Map<any, CacheItem>} */
        this.map = new Map()
        this.saveUndefined = !!cacheOptions.saveUndefined
        this.limit = cacheOptions.limit
        if (this.limit !== undefined && (this.limit < 1 || typeof this.limit !== 'number')) throw new Error('Cannot create a cache with invalid limit')
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
        if (this.map.has(key)) {
            const cacheItem = this.map.get(key)
            cacheItem.used++
            return cacheItem.item
        }
        // Run directly
        let result
        try {
            result = func(...args)
        }
        catch (error) {
            console.error(error, error.stack)
            return undefined
        }
        if (result !== undefined || this.saveUndefined) {
            this.map.set(key, { item: result, used: 0 })
            if (this.limit) this.checkLimit()
        }
        return result
    }

    /**
     * Get a value, using cache. Func myst be async
     * @param {any} key - unique something. Cache system gets cache by this key.
     * @param {() => Promise<any>} func - an async function to get a value if it's not in cache
     * @returns {any}
     */
    async getAsync(key, func, ...args) {
        // Get from cache
        if (this.map.has(key)) {
            const cacheItem = this.map.get(key)
            cacheItem.used++
            return cacheItem.item
        }
        // Run directly
        let result
        try {
            result = await func(...args)
        }
        catch (error) {
            console.error(error, error.stack)
            return undefined
        }
        if (result !== undefined || this.saveUndefined) {
            this.map.set(key, { item: result, used: 0 })
            if (this.limit) this.checkLimit()
        }
        return result
    }

    /**
     * Check if a cache reached it's limit. If reached, clear it a little 
     */
    checkLimit() {
        // Delete 10% of the least important cache
        const numberOfItemsToDelete = Math.ceil(this.limit / 10)
        const minItemUses = Math.min(...Array.from(this.map.values()).map(cacheItem => cacheItem.used))
        let i = 0
        for (const [key, value] of this.map) {
            if (this.map.size === this.limit) break // Keep last element
            if (value.used === minItemUses) {
                this.delete(key)
                i++
            }
            if (i >= numberOfItemsToDelete) break
        }
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