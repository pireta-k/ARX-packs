import { VectorXZ, Vector2, Vector3 } from '@minecraft/server'

/**
 * @typedef {object} Vector4
 * @prop {number} x
 * @prop {number} y
 * @prop {number} z
 * @prop {number} w
 */

/**
 * @typedef {VectorXZ | Vector2 | Vector3 | Vector4} VectorAny
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
     * @param {Vector3} vector 
     * @param {Number} [number] 
     */
    upLift(vector, number = 1) {
        return { x: vector.x, y: vector.y + number, z: vector.z }
    }
}

export const space = {
    /**
     * Is the location in box?
     * @param {Vector3} boxCornerA 
     * @param {Vector3} boxCornerB 
     * @param {Vector3} location 
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
        result = {}
        for (const axis of vector.vectorAxes) {
            const hasA = Object.hasOwn(spaceCornerA, axis)
            const hasB = Object.hasOwn(spaceCornerB, axis)
            if (hasA !== hasB) return undefined // Vectors are different
            if (hasA == true) {
                result[axis] = Math.abs(spaceCornerA[axis] - spaceCornerB[axis]) + 1
            }
        }
        return result
    }
}