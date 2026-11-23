/**
 * @typedef {object} Vector4
 * @prop {number} x
 * @prop {number} y
 * @prop {number} z
 * @prop {number} w
 */

/**
 * @typedef {object} VectorXZ
 * @prop {number} x
 * @prop {number} z
 */

/**
 * @typedef {VectorXZ | import("@minecraft/server").Vector2 | import("@minecraft/server").Vector3 | Vector4} VectorAny
 */

export const vector = {
    vectorAxes: ['x', 'y', 'z', 'w'],

    /** 
     * @param {VectorAny} vectorA 
     * @param {VectorAny} vectorB
     * @returns {VectorAny}
     */
    sum(vectorA, vectorB) {
        let result = {}
        for (const axis of this.vectorAxes) {
            if (Object.hasOwn(vectorA, axis) || Object.hasOwn(vectorB, axis)) {
                result[axis] = (vectorA[axis] ?? 0) + (vectorB[axis] ?? 0)
            }
        }
        return result
    },

    /**
     * Add to vector3's Y value a number (1 by default)
     * @param {import("@minecraft/server").Vector3} vector 
     * @param {Number} [number] 
     */
    upLift(vector, number = 1) {
        return { x: vector.x, y: vector.y + number, z: vector.z }
    },

    /**
     * Turn a vector to a short string
     * @param {import("@minecraft/server").Vector2 | import("@minecraft/server").Vector3 | Vector4} vector 
     * @returns {string}
     */
    vector2str(vector) {
        const values = []
        for (const axis of this.vectorAxes) if (axis in vector) values.push(vector[axis])
        return values.join('|')
    },

    /**
     * Turn a string to a vector
     * @param {string} str 
     * @returns {import("@minecraft/server").Vector2 | import("@minecraft/server").Vector3 | Vector4}
     */
    str2vector(str) {
        if (!str) return {}
        const result = {}
        const items = str.split('|').map(item => +item)
        for (let i = 0; i < items.length; i++) result[this.vectorAxes[i]] = items[i]
        return result
    },

    /**
     * Return a null vector
     * @param {number} [numOfDimensions]
     * @returns {VectorAny}
     */
    null(numOfDimensions) {
        if (typeof numOfDimensions !== 'number' || numOfDimensions > this.vectorAxes.length || numOfDimensions < 1) return undefined
        let result = {}
        for (const axis of this.vectorAxes) result[axis] = 0
        return result
    },

    /**
     * @template {Vector4 | import("@minecraft/server").Vector3 | import("@minecraft/server").Vector2 | VectorXZ} T
     * @param {T} vector 
     * @returns {T}
     */
    invert(vector) {
        for (const axis in vector) {
            vector[axis] = -vector[axis]
        }

        return vector
    }
}

export const space = {
    /**
     * Is the location in box?
     * @param {import("@minecraft/server").Vector3} boxCornerA 
     * @param {import("@minecraft/server").Vector3} boxCornerB 
     * @param {import("@minecraft/server").Vector3} location 
     * @returns {boolean}
     */
    isLocationInBox(boxCornerA, boxCornerB, location) {
        for (const axis of ['x', 'y', 'z']) {
            const min = Math.min(boxCornerA[axis], boxCornerB[axis])
            const max = Math.max(boxCornerA[axis], boxCornerB[axis])
            if (location[axis] < min || location[axis] > max) return false
        }
        return true
    },

    /**
     * Get min and max bounds of a space
     * @param {VectorAny} spaceCornerA 
     * @param {VectorAny} spaceCornerB 
     * @returns {{min: VectorAny, max: VectorAny}}
     */
    getSpaceBounds(spaceCornerA, spaceCornerB) {
        const min = {}
        const max = {}

        for (const axis of vector.vectorAxes) {
            const hasA = Object.hasOwn(spaceCornerA, axis)
            const hasB = Object.hasOwn(spaceCornerB, axis)
            if (hasA !== hasB) return undefined // Vectors are different
            if (hasA === true) {
                min[axis] = Math.min(spaceCornerA[axis], spaceCornerB[axis])
                max[axis] = Math.max(spaceCornerA[axis], spaceCornerB[axis])
            }
        }

        return { min, max }
    },

    /**
     * Get size values of a space on every axis.
     * @param {VectorAny} spaceCornerA 
     * @param {VectorAny} spaceCornerB 
     * @returns {VectorAny}
     */
    getSpaceSize(spaceCornerA, spaceCornerB) {
        const result = {}
        for (const axis of vector.vectorAxes) {
            const hasA = Object.hasOwn(spaceCornerA, axis)
            const hasB = Object.hasOwn(spaceCornerB, axis)
            if (hasA !== hasB) return undefined // Vectors are different
            if (hasA == true) {
                result[axis] = Math.abs(spaceCornerA[axis] - spaceCornerB[axis]) + 1
            }
        }
        return result
    },

    /**
     * Get space's volume (in blocks)
     * @param {VectorAny} vector 
     */
    getVolume(vector) {
        let result = 1
        for (const axis in vector) result *= vector[axis]
        return Math.abs(result)
    }
}