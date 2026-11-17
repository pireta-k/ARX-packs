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
    vectorKeys: ['x', 'y', 'z', 'w'],

    /** 
     * @param {VectorAny} vectorA 
     * @param {VectorAny} vectorB
     * @returns {VectorAny}
     */
    sum(vectorA, vectorB) {
        let result = {}
        for (const key of this.vectorKeys) {
            if (Object.hasOwn(vectorA, key) || Object.hasOwn(vectorB, key)) {
                result[key] = (vectorA[key] ?? 0) + (vectorB[key] ?? 0)
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
    }
}