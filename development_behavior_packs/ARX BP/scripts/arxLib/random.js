import { Direction, Vector } from "./math";
import { Offset } from "./offset";

export {
    random,
    RandomGenerator
}

class RandomGenerator {
    /** @param {String | Number} [seed] */
    constructor(seed) {
        this.#calls = 0;
        this.#seed = this.setSeed(seed);
    }
    #calls
    #seed

    /** @returns {Number | undefined} */
    getSeed() { return this.#seed; }

    /** @param {String | Number | undefined} seed */
    setSeed(seed) {
        if (seed == undefined) { this.#seed = undefined; return; }
        if (typeof seed != 'number') seed = this.#stringToNumberSeed(String(seed));
        this.#seed = seed;
        return seed;
    }

    /** @param {String} string */
    #stringToNumberSeed(string) {
        return string.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0) | 0, 0);
    }

    #seedRandom() {
        const buf = new DataView(new ArrayBuffer(8));
        buf.setFloat32(0, this.#calls);

        let h = (this.#seed || 0) >>> 0;

        h ^= buf.getUint32(0);
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h ^= buf.getUint32(4);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        h ^= h >>> 16;

        return (h >>> 0) / 4294967296;
    }

    random_0_to_1() {
        if (this.#seed != undefined) { this.#calls++; return this.#seedRandom(); }
        else return Math.random();
    }

    /** @param {Number} a @param {Number} b @returns {Number} */
    int(a, b) {
        let min = Math.min(a, b)
        let max = Math.max(a, b)
        return Math.floor(this.random_0_to_1() * (max - min + 1)) + min;
    }

    /** @param {Number} a @param {Number} b @returns {Number} */
    float(a, b) {
        let min = Math.min(a, b);
        let max = Math.max(a, b);
        return (this.random_0_to_1() * (max - min)) + min;
    }

    /** @returns {1 | -1} */
    sign() {
        return this.random_0_to_1() > 0.5 ? -1 : 1;
    }

    /** @param {Number} chance @returns {Boolean} */
    chance(chance) {
        return chance > this.random_0_to_1()*100;
    }

    /** @param {Number} amount @returns {Number[]} */
    proportion(amount, minValue = 0) {
        const remaining = Math.max(0, 1 - (amount*minValue));

        let sum = 0;
        const array = Array.from({ length: amount }, (() => {
            const number = this.random_0_to_1();
            sum += number; return number;
        }));

        return array.map(n => minValue + (n/sum)*remaining);
    }

    /** @param {Number[]} range @returns {Number} */
    range(range, float = false) {
        return float ? this.float(range[0], range[1]) : this.int(range[0], range[1]);
    }

    /** @param {import("@minecraft/server").Vector3 | Number} radius @param {import("@minecraft/server").Vector3} offset @returns {import("@minecraft/server").Vector3} */
    location(radius, offset = {}) {
        if (typeof radius == 'number') radius = {
            x: radius,
            z: radius,
            y: radius
        }
        return {
            x: this.float(-radius.x, radius.x) + (offset.x || 0),
            y: this.float(-radius.y, radius.y) + (offset.y || 0),
            z: this.float(-radius.z, radius.z) + (offset.z || 0)
        }
    }

    /** @param {import("@minecraft/server").Vector3} axisModifiers */
    direction(axisModifiers = {}) {
        return new Direction(Offset.none[0], this.location({ x: axisModifiers.x ?? 1, y: axisModifiers.y ?? 1, z: axisModifiers.z ?? 1 }))
    }

    /** @param {{ x?: ([Number, Number] | Number), y?: ([Number, Number] | Number), z?: ([Number, Number] | Number) }} axisModifiers @param {[Number, Number] | Number} distance */
    vector(axisModifiers = {}, distance = 1) {
        distance = Array.isArray(distance) ? this.float(distance[0], distance[1]) : distance;
        const ranges = {
            x: Array.isArray(axisModifiers.x) ? axisModifiers.x : [-(axisModifiers.x ?? 1), (axisModifiers.x ?? 1)],
            y: Array.isArray(axisModifiers.y) ? axisModifiers.y : [-(axisModifiers.y ?? 1), (axisModifiers.y ?? 1)],
            z: Array.isArray(axisModifiers.z) ? axisModifiers.z : [-(axisModifiers.z ?? 1), (axisModifiers.z ?? 1)]
        };

        const vector = Vector.normalize({
            x: this.float(ranges.x[0], ranges.x[1]),
            y: this.float(ranges.y[0], ranges.y[1]),
            z: this.float(ranges.z[0], ranges.z[1])
        });

        return {
            x: vector.x * distance,
            y: vector.y * distance,
            z: vector.z * distance
        };
    }

    /**
     * @template T
     * @param {T[]} array 
     * @returns {T}
     */
    element(array) {
        return array[this.int(0, array.length-1)];
    }
    
    /** @template T @param {[T, Number][]} array @returns {T} */
    elementW(array) {
        let sum = 0;
        array = array.map(data => {
            sum += data[1];
            return {
                element: data[0],
                range: [sum - data[1], sum]
            }
        })

        const value = this.float(0, sum);
        if (value >= sum) return array[array.length - 1]?.element;
        return array.find((data) => data.range[0] <= value && data.range[1] > value)?.element
    }

    /** @template T @param {T[]} array @returns {T[]} */
    select(array, amount = 1, allowRepetition = false) {
        if (allowRepetition) return Array.from({ length: amount }, (() => array[this.int(0, array.length-1)]));
        else {
            const unusedIndexes = Array.from(array.keys());
            return Array.from({ length: Math.min(array.length, amount) }, () => {
                const index = this.int(0, unusedIndexes.length-1);

                const elementIndex = unusedIndexes[index];
                unusedIndexes[index] = unusedIndexes[unusedIndexes.length-1];
                unusedIndexes.length -= 1;

                return array[elementIndex];
            });
        }
    }
}

const random = new RandomGenerator();