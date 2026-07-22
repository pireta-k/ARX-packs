import { BlockVolume, ListBlockVolume } from '@minecraft/server';
import { Offset } from './offset';

export {
    Geo,
    Vector,
    LocationRange,
    Direction,
    LocalPlane,
    WorldPlane
}

class LocationRange {
    /** @param {import('@minecraft/server').Vector3} from @param {import('@minecraft/server').Vector3} to */
    constructor(from, to, isMinMaxed = false) {
        this.from = from;
        this.to = to;
        this.isMinMaxed = isMinMaxed;
    }

    getCenter() { return Vector.getArithmeticMean(this.from, this.to); }

    getSize() { return { x: Math.abs(this.from.x - this.to.x), y: Math.abs(this.from.y - this.to.y), z: Math.abs(this.from.z - this.to.z) }; }
    getHalfSize() { return Vector.multiply(this.getSize(), 0.5); }

    minMax() {
        const range = Geo.getBoxMinMax(this);
        this.from = range.from; this.to = range.to; this.isMinMaxed = true;
        return this;
    }
}

class Geo {
    /** @param {Number} rotation */
    static normalizeRotation(rotation, step = 90, max = 360) {
        if (!max) return Math.round(rotation / step) * step;
        return (max + ((Math.round(rotation / step) * step) % max)) % max;
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to @returns {Number} */
    static distance(from, to) {
        const dx = ((from.x || 0) - (to.x || 0)), dy = ((from.y || 0) - (to.y || 0)), dz = ((from.z || 0) - (to.z || 0));
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to @returns {Number} */
    static distanceSquared(from, to) {
        const dx = (from.x - to.x), dy = (from.y - to.y), dz = (from.z - to.z);
        return dx * dx + dy * dy + dz * dz;
    }

    /** @param {import("@minecraft/server").VectorXZ} from @param {import("@minecraft/server").VectorXZ} to @returns {Number} */
    static horizontalDistance(from, to) {
        return Geo.distance({ x: from.x, z: from.z }, { x: to.x, z: to.z })
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to @returns {Number} */
    static cubicDistance(from, to) {
        return Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y), Math.abs(from.z - to.z))
    }

    /** 
     * @param {import("@minecraft/server").Vector3} point
     * @param {LocationRange} line
     */
    static nearestPointOnLine(point, line) {
        const vectorFromToPoint = {
            x: point.x - line.from.x,
            y: point.y - line.from.y,
            z: point.z - line.from.z
        };

        const vectorLine = {
            x: line.to.x - line.from.x,
            y: line.to.y - line.from.y,
            z: line.to.z - line.from.z
        };

        const ceff = Math.min(1, Math.max(0, (
            (vectorFromToPoint.x * vectorLine.x + vectorFromToPoint.y * vectorLine.y + vectorFromToPoint.z * vectorLine.z) /
            (vectorLine.x ** 2 + vectorLine.y ** 2 + vectorLine.z ** 2)
        )));

        return Vector.super(line.from, vectorLine, ceff);
    }

    /** 
     * @param {LocationRange} box
     */
    static getBoxMinMax(box) {
        if (box.isMinMaxed) return box;
        return new LocationRange(
            { x: Math.min(box.from.x, box.to.x), y: Math.min(box.from.y, box.to.y), z: Math.min(box.from.z, box.to.z) },
            { x: Math.max(box.from.x, box.to.x), y: Math.max(box.from.y, box.to.y), z: Math.max(box.from.z, box.to.z) },
            true
        );
    }

    /** 
     * @param {import('@minecraft/server').Vector3} point
     * @param {LocationRange} box
     */
    static isPointInBox(point, box) {
        box = this.getBoxMinMax(box);
        return box.from.x <= point.x && box.to.x >= point.x && box.from.y <= point.y && box.to.y >= point.y && box.from.z <= point.z && box.to.z >= point.z;
    }

    /**
     * @param {LocationRange} box 
     * @param {import('@minecraft/server').Vector3} location
     * @param {import('@minecraft/server').Vector3} [boxOffset]
     */
    static getNearestPointInBox(box, location, boxOffset = undefined) {
        if (boxOffset != undefined) box = { from: Vector.sum(box.from, boxOffset), to: Vector.sum(box.to, boxOffset) };
        if (this.isPointInBox(location, box)) return location;
        box = this.getBoxMinMax(box);

        const center = box.getCenter();
        const size = box.getHalfSize();

        const distance = this.distance(center, location);
        const vector = this.getDirection3D(center, location);

        const vectorAbs = Vector.abs(vector);
        const vectorSign = Vector.sign(vector);

        return Vector.sum(center, { x: Math.min(size.x, vectorAbs.x * distance) * vectorSign.x, y: Math.min(size.y, vectorAbs.y * distance) * vectorSign.y, z: Math.min(size.z, vectorAbs.z * distance) * vectorSign.z });
    }

    /** 
     * @param {import("@minecraft/server").Vector3} point
     * @param {LocationRange} line
     */
    static distanceToLine(point, line) { return Geo.distance(point, this.nearestPointOnLine(point, line)); }

    /** @param {import("@minecraft/server").VectorXZ} point @param {import("@minecraft/server").VectorXZ[]} polygon @returns {Boolean} */
    static isPointInPolygon(point, polygon) {
        let inside = false;
        const px = point.x;
        const pz = point.z;
        const len = polygon.length;

        for (let i = 0, j = len - 1; i < len; j = i++) {
            const xi = polygon[i].x, zi = polygon[i].z;
            const xj = polygon[j].x, zj = polygon[j].z;

            if (
                (zi > pz) !== (zj > pz) &&
                px < ((xj - xi) * (pz - zi)) / (zj - zi + 1e-10) + xi
            ) inside = !inside;
        }

        return inside;
    }

    /** 
     * @param {import("@minecraft/server").VectorXZ} vector 
     * @param {Object} options
     * @param {Number} options.seed
     * @param {Number} options.frequency
     * @param {Number} options.amplitude
     */
    static noise(vector, options = {}) {
        let { x, z } = vector;
        options = { seed: options.seed || 0, frequency: options.frequency || 0.05, amplitude: options.amplitude || 1 }

        function lerp(a, b, t) { return a + t * (b - a); }
        function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
        function grad(ix, iz) {
            const s = Math.sin((ix * 374761 + iz * 668265 + options.seed * 1013)) * 43758.5453;
            return { x: Math.cos(s), z: Math.sin(s) };
        }

        x *= options.frequency;
        z *= options.frequency;

        const x0 = Math.floor(x);
        const z0 = Math.floor(z);
        const x1 = x0 + 1;
        const z1 = z0 + 1;

        const dx = x - x0;
        const dz = z - z0;

        const g00 = grad(x0, z0);
        const g10 = grad(x1, z0);
        const g01 = grad(x0, z1);
        const g11 = grad(x1, z1);

        const dot00 = g00.x * dx + g00.z * dz;
        const dot10 = g10.x * (dx - 1) + g10.z * dz;
        const dot01 = g01.x * dx + g01.z * (dz - 1);
        const dot11 = g11.x * (dx - 1) + g11.z * (dz - 1);

        const u = fade(dx);
        const v = fade(dz);

        const ix0 = lerp(dot00, dot10, u);
        const ix1 = lerp(dot01, dot11, u);
        const value = lerp(ix0, ix1, v);

        return value * options.amplitude;
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to @returns {import("@minecraft/server").Vector3} */
    static getDirection3D(from, to) {
        const dx = ((to.x || 0) - (from.x || 0)), dy = ((to.y || 0) - (from.y || 0)), dz = ((to.z || 0) - (from.z || 0));
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        return {
            x: dx / distance,
            y: dy / distance,
            z: dz / distance
        };
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to */
    static getDirection(from, to) {
        return new Direction(from, to)
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to @returns {import("@minecraft/server").Vector3[]} */
    static *lineGen(from, to, step = 1) {
        const distance = Geo.distance(from, to);
        const direction = Geo.getDirection3D(from, to);

        for (let i = 0; i <= distance; i += step) {
            yield {
                x: from.x + i * direction.x,
                y: from.y + i * direction.y,
                z: from.z + i * direction.z
            }
        }
    }

    /** @param {import("@minecraft/server").Vector3} from @param {import("@minecraft/server").Vector3} to */
    static line(from, to, step = 1) {
        return Array.from(Geo.lineGen(from, to, step));
    }

    /** @param {import("@minecraft/server").Vector3[]} points @param {Number} maxDistance @returns {import("@minecraft/server").Vector3[]} */
    static interpolatePoints(points, maxDistance) {
        if (points.length === 0) return [];

        const result = [];
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];

            result.push(start);

            const dist = this.distance(start, end);
            const steps = Math.floor(dist / maxDistance);

            for (let j = 1; j <= steps; j++) {
                const t = j / (steps + 1);
                const interpolated = {
                    x: start.x + (end.x - start.x) * t,
                    y: start.y + (end.y - start.y) * t,
                    z: start.z + (end.z - start.z) * t,
                };
                result.push(interpolated);
            }
        }

        result.push(points[points.length - 1]);
        return result;
    }

    /** @type {Map<String, import('@minecraft/server').Vector3>} */
    static #spheres = new Map();

    /** @param {import('@minecraft/server').Vector3} center @param {Number} radius @returns {import('@minecraft/server').ListBlockVolume} */
    static sphereVolume(center, radius) {
        const base = this.#spheres.get(radius.toFixed(2)) || this.#spheres.set(radius.toFixed(2), Array.from(this.sphereGen(Offset.none[0], radius))).get(radius.toFixed(2));

        const volume = new ListBlockVolume(base);
        volume.translate(center);
        return volume;
    }

    /** @param {import("@minecraft/server").Vector3} center @param {Number} radius @returns {import("@minecraft/server").Vector3[]} */
    static *sphereGen(center, radius) {
        for (let location of Geo.mcCube(center, radius)) {
            if (Math.hypot(
                (location.x - center.x),
                (location.y - center.y),
                (location.z - center.z)
            ) <= radius) yield location;
        }
    }

    /** @param {import("@minecraft/server").Vector3} center @param {Number} radius @param {(location: import("@minecraft/server").Vector3, index: Number, locations: import("@minecraft/server").Vector3[]) | undefined} callback @returns {import("@minecraft/server").Vector3[]} */
    static sphere(center, radius, callback = undefined) {
        const locations = Array.from(this.sphereVolume(center, radius).getBlockLocationIterator());
        if (callback == undefined) return locations;

        locations.forEach(callback);
        return locations;
    }

    /** @param {import("@minecraft/server").Vector3} fromOrCenter @param {import("@minecraft/server").Vector3 | Number} toOrRadius @returns {import("@minecraft/server").BlockLocationIterator} */
    static mcCube(fromOrCenter, toOrRadius) {
        const from = typeof toOrRadius == 'number' ? {
            x: fromOrCenter.x - toOrRadius,
            y: fromOrCenter.y - toOrRadius,
            z: fromOrCenter.z - toOrRadius
        } : fromOrCenter;

        const to = typeof toOrRadius == 'number' ? {
            x: fromOrCenter.x + toOrRadius,
            y: fromOrCenter.y + toOrRadius,
            z: fromOrCenter.z + toOrRadius
        } : toOrRadius;

        return new BlockVolume(from, to).getBlockLocationIterator()
    }

    /** @param {import("@minecraft/server").Vector3} fromOrCenter @param {import("@minecraft/server").Vector3 | Number} toOrRadius @returns {import("@minecraft/server").BlockLocationIterator} */
    static cubeGen(fromOrCenter, toOrRadius) {
        const from = typeof toOrRadius == 'number' ? {
            x: fromOrCenter.x - toOrRadius,
            y: fromOrCenter.y - toOrRadius,
            z: fromOrCenter.z - toOrRadius
        } : fromOrCenter;

        const to = typeof toOrRadius == 'number' ? {
            x: fromOrCenter.x + toOrRadius,
            y: fromOrCenter.y + toOrRadius,
            z: fromOrCenter.z + toOrRadius
        } : {
            x: (toOrRadius.x || 1) - 1,
            y: (toOrRadius.y || 1) - 1,
            z: (toOrRadius.z || 1) - 1
        };

        return this.mcCube(from, to);
    }

    /** @param {import("@minecraft/server").Vector3} fromOrCenter @param {import("@minecraft/server").Vector3 | Number} toOrRadius @param {(location: import("@minecraft/server").Vector3, index: Number, locations: import("@minecraft/server").Vector3[]) | undefined} callback @returns {import("@minecraft/server").Vector3[]} */
    static cube(fromOrCenter, toOrRadius, callback = undefined) {
        const locations = Array.from(Geo.cubeGen(fromOrCenter, toOrRadius));
        if (callback == undefined) return locations;

        locations.forEach(callback);
        return locations;
    }

    /** @param {import("@minecraft/server").Vector3} center @param {Number} radius @param {Number} height @param {(location: import("@minecraft/server").Vector3, index: Number, locations: import("@minecraft/server").Vector3[]) | undefined} callback @returns {import("@minecraft/server").Vector3[]} */
    static circle(center, radius, height = 1, callback = undefined) {
        const locations = []
        let index = -1

        for (let location of Geo.cubeGen({
            x: center.x - radius, y: center.y, z: center.z - radius
        }, {
            x: center.x + radius + 1, y: center.y + height, z: center.z + radius + 1
        })) {
            if (Geo.horizontalDistance(center, location) <= radius) {
                locations.push(location)

                if (callback) {
                    index++
                    callback(location, index, locations)
                }
            }
        }

        return locations;
    }
}

class Vector {
    /** @param {import('@minecraft/server').Vector3[]} vectors */
    static getArithmeticMean(...vectors) {
        return vectors.reduce((acc, cur) => { return { x: acc.x + cur.x / vectors.length, y: acc.y + cur.y / vectors.length, z: acc.z + cur.z / vectors.length, } }, { x: 0, y: 0, z: 0 });
    }

    /** @param {import('@minecraft/server').Vector3} vector1 @param {import('@minecraft/server').Vector3} vector2 */
    static super(vector1, vector2, vector2Multiplier = 1, vector1Multiplier = 1) {
        return this.sum(this.multiply(vector1, vector1Multiplier), this.multiply(vector2, vector2Multiplier));
    }

    /** @param {import('@minecraft/server').Vector3} vector1 @param {import('@minecraft/server').Vector3} vector2 */
    static subtract(vector1, vector2) {
        return {
            x: (vector1.x || 0) - (vector2.x || 0),
            y: (vector1.y || 0) - (vector2.y || 0),
            z: (vector1.z || 0) - (vector2.z || 0)
        };
    }

    /** @param {import('@minecraft/server').Vector3} vector1 @param {import('@minecraft/server').Vector3} vector2 */
    static sum(vector1, vector2) {
        return {
            x: (vector1.x || 0) + (vector2.x || 0),
            y: (vector1.y || 0) + (vector2.y || 0),
            z: (vector1.z || 0) + (vector2.z || 0)
        };
    }

    /** @param {import('@minecraft/server').Vector3} vector @param {Number} number */
    static numberSum(vector, number) {
        return {
            x: (vector.x || 0) + number,
            y: (vector.y || 0) + number,
            z: (vector.z || 0) + number
        }
    }

    /** @param {import('@minecraft/server').Vector3} vector @param {Number} multiplier */
    static multiply(vector, multiplier = 1) {
        return {
            x: (vector.x || 0) * multiplier,
            y: (vector.y || 0) * multiplier,
            z: (vector.z || 0) * multiplier
        }
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static abs(vector) {
        return {
            x: Math.abs(vector.x || 0),
            y: Math.abs(vector.y || 0),
            z: Math.abs(vector.z || 0)
        };
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static sign(vector) {
        return {
            x: Math.sign(vector.x || 0),
            y: Math.sign(vector.y || 0),
            z: Math.sign(vector.z || 0)
        };
    }

    /** @param {import('@minecraft/server').Vector3 | import('@minecraft/server').Vector2 | import('@minecraft/server').VectorXZ} vector */
    static round(vector, fractionDigits = 0) {
        /** @type {import('@minecraft/server').Vector3} */
        const newVector = {};
        for (const axis of ['x', 'y', 'z', 'distance']) if (vector[axis] != undefined) {
            if (fractionDigits < 1) newVector[axis] = Math.round(vector[axis]);
            else newVector[axis] = Number(vector[axis].toFixed(fractionDigits));
        }
        return newVector;
    }

    /** @param {import('@minecraft/server').Vector3 | import('@minecraft/server').Vector2 | import('@minecraft/server').VectorXZ} vector */
    static floor(vector) {
        return {
            x: Math.floor(vector.x) || 0,
            y: Math.floor(vector.y) || 0,
            z: Math.floor(vector.z) || 0
        };
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static clone(vector) {
        return { x: (vector.x || 0) + 0, y: (vector.y || 0) + 0, z: (vector.z || 0) + 0 };
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static toString(vector, fractionDigits = 2) {
        vector = this.round(vector, fractionDigits);
        return ['x', 'y', 'z', 'distance'].filter(axis => vector[axis] != undefined).map(axis => axis + ': ' + vector[axis]).join(', ');
    }

    /** @param {import('@minecraft/server').Vector3} from @param {import('@minecraft/server').Vector3} to */
    static getFromLocations(from, to) { return Geo.getDirection3D(from, to); }

    /** @param {import('@minecraft/server').Vector2} angles */
    static getFromAngles(angles) {
        angles = {
            x: angles.x / 180 * Math.PI,
            y: angles.y / 180 * Math.PI
        };

        return {
            x: -Math.sin(angles.y) * Math.cos(angles.x),
            y: -Math.sin(angles.x),
            z: Math.cos(angles.y) * Math.cos(angles.x)
        }
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static toAngles(vector) {
        vector = this.normalize(vector);
        return {
            x: -Math.asin(vector.y) * 180 / Math.PI,
            y: Math.atan2(-vector.x, vector.z) * 180 / Math.PI
        }
    }

    /** @param {import('@minecraft/server').Vector3} vector @param {import('@minecraft/server').Vector2} angles */
    static rotate(vector, angles = {}, withDistance = false) {
        const rotated = this.getFromAngles(this.sum(this.toAngles(vector), { x: angles.x || 0, y: angles.y || 0 }));

        if (withDistance) return this.multiply(rotated, Geo.distance(vector, {}));
        else return rotated;
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static get(vector) {
        const distance = Geo.distance({}, vector);
        return {
            x: (vector.x || 0) / (distance || 1),
            y: (vector.y || 0) / (distance || 1),
            z: (vector.z || 0) / (distance || 1),
            distance: distance
        };
    }

    /** @param {import('@minecraft/server').Vector3} vector */
    static normalize(vector) {
        const distance = Geo.distance({}, vector);
        return {
            x: (vector.x || 0) / (distance || 1),
            y: (vector.y || 0) / (distance || 1),
            z: (vector.z || 0) / (distance || 1)
        };
    }

    /**
     * Add to vector's Y value a number (1 by default)
     * @param {import('@minecraft/server').Vector3} vector 
     * @param {Number} [number] 
     */
    static upLift(vector, number = 1) {
        return { x: vector.x, y: vector.y + number, z: vector.z }
    }
}

class Direction {
    /** @param {import("@minecraft/server").Vector3} directionOrFrom @param {import("@minecraft/server").Vector3} to */
    constructor(directionOrFrom = {}, to = undefined, withDistance = false) {
        this.#direction = to ? Geo.getDirection3D(directionOrFrom, to) : Vector.normalize(directionOrFrom)
        if (withDistance) this.setDistance(Geo.distance(directionOrFrom, to))
    }
    #direction

    /** @type {import("@minecraft/server").Vector3} */
    get direction() { return this.#direction }

    get x() { return this.direction.x }
    get y() { return this.direction.y }
    get z() { return this.direction.z }

    get distance() { return Geo.distance(this.#direction, { x: 0, y: 0, z: 0 }) }
    set distance(dist) { this.#direction = Vector.multiply(this.#direction, (dist || Math.sqrt(3)) / this.distance) }

    /** @param {import("@minecraft/server").Vector3} offset */
    toLine(step = 1, offset = {}) { return Geo.line(offset, Vector.sum(offset, this.direction), step); }

    /**
     * @param {Number} dist 
     * @returns {Direction}
     */
    setDistance(dist) {
        this.distance = dist
        return this
    }

    /**
     * @param {import('@minecraft/server').Entity} entity 
     * @returns {Direction}
     */
    knockback(entity) {
        entity.applyKnockback(this.x / this.distance, this.z / this.distance, this.distance, this.y)
        return this
    }

    /**
     * @param {import('@minecraft/server').Entity} entity 
     * @returns {Direction}
     */
    impulse(entity) {
        entity.applyImpulse(this.#direction)
        return this
    }

    round() {
        this.#direction = {
            x: Math.round(this.#direction.x),
            y: Math.round(this.#direction.y),
            z: Math.round(this.#direction.z)
        }
    }

    getFaceDirection(convertThis = false) {
        let axis = ['x', 'y', 'z'].find(axis => ['x', 'y', 'z'].every(axis2 => Math.abs(this.#direction[axis2]) <= Math.abs(this.#direction[axis])))
        let value = this.#direction[axis] >= 0 ? 1 : -1

        if (convertThis) {
            this.#direction = { x: 0, z: 0, y: 0 }
            this.#direction[axis] = value
            return this
        }

        if (axis == 'x') {
            if (value == -1) return 'West';
            return 'East'
        } else if (axis == 'y') {
            if (value == -1) return 'Up';
            return 'Down'
        } else if (axis == 'z') {
            if (value == -1) return 'South';
            return 'North'
        }
    }

    /** @param {import("@minecraft/server").Vector3 | Direction} direction */
    sumWith(direction) {
        this.#direction = Vector.multiply(Vector.sum(direction, this), 0.5)
        return this
    }

    run(func, step = 1, offset = {}) {
        for (let i = 0; i < this.distance; i += step) {
            func(Vector.super(offset, this, i / this.distance))
        }
    }

    /** @param {import('@minecraft/server').Direction} direction */
    static fromFaceDirection(direction) {
        return new Direction({
            "down": { x: 0, y: -1, z: 0 },
            "east": { x: 1, y: 0, z: 0 },
            "north": { x: 0, y: 0, z: 1 },
            "south": { x: 0, y: 0, z: -1 },
            "up": { x: 0, y: 1, z: 0 },
            "west": { x: -1, y: 0, z: 0 }
        }[direction.toLowerCase()]);
    }
}

class LocalPlane {
    /**
     * @param {import('@minecraft/server').Vector3} direction
     */
    constructor(direction) {
        this.forward = Vector.normalize(direction);

        let upx = 0, upy = 1, upz = 0;
        let dot = Math.abs(this.forward.y);
        const verticalMod = dot > 0.999999 ? -1 : 1;

        if (dot > 0.999999) {
            upx = 0; upy = 0; upz = 1;
            dot = Math.abs(this.forward.z);

            if (dot > 0.999999) {
                upx = 1; upy = 0; upz = 0;
            }
        }

        let rx = upy * this.forward.z - upz * this.forward.y;
        let ry = upz * this.forward.x - upx * this.forward.z;
        let rz = upx * this.forward.y - upy * this.forward.x;

        const rLen = rx * rx + ry * ry + rz * rz;

        if (rLen < 1e-12) {
            this.right = { x: 1, y: 0, z: 0 };
        } else {
            const inv = verticalMod / Math.sqrt(rLen);
            this.right = { x: rx * inv, y: ry * inv, z: rz * inv };
        }

        this.up = {
            x: this.forward.y * this.right.z * verticalMod - this.forward.z * this.right.y * verticalMod,
            y: this.forward.z * this.right.x * verticalMod - this.forward.x * this.right.z * verticalMod,
            z: this.forward.x * this.right.y * verticalMod - this.forward.y * this.right.x * verticalMod
        };
    }

    /** @type {import('@minecraft/server').Vector3} */
    get direction() { return this.forward; }

    /** @param {import('@minecraft/server').Vector3} location */
    toWorldPlane(location, toPlaneOffset = LocalPlane.zero) {
        const lx = location.x;
        const ly = location.z;
        const lz = location.y;

        const fx = this.forward.x;
        const fy = this.forward.y;
        const fz = this.forward.z;

        const rx = this.right.x;
        const ry = this.right.y;
        const rz = this.right.z;

        const ux = this.up.x;
        const uy = this.up.y;
        const uz = this.up.z;

        return {
            x: toPlaneOffset.x + lx * rx + ly * ux + lz * fx,
            y: toPlaneOffset.y + lx * ry + ly * uy + lz * fy,
            z: toPlaneOffset.z + lx * rz + ly * uz + lz * fz
        };
    }

    static zero = { x: 0, y: 0, z: 0 };
}


class LocalPlane2 {
    /** @param {import('@minecraft/server').Vector3} direction */
    constructor(direction) {
        this.#direction = Vector.normalize(direction);
    }
    #direction

    /** @type {import('@minecraft/server').Vector3} */
    get direction() { return this.#direction; }

    /** @param {import('@minecraft/server').Vector3} location @param {import('@minecraft/server').Vector3} toPlaneOffset @returns {import('@minecraft/server').Vector3} */
    toWorldPlane(location, toPlaneOffset = LocalPlane.zero) {
        const lx = location.x;
        const ly = location.z;
        const lz = location.y;

        const fx = this.#direction.x;
        const fy = this.#direction.y;
        const fz = this.#direction.z;

        let upx = 0, upy = 1, upz = 0; // worldUp

        let dot = fy < 0 ? -fy : fy; // fast abs

        if (dot > 0.999999) {
            upx = 0; upy = 0; upz = 1;
            dot = fz < 0 ? -fz : fz;

            if (dot > 0.999999) {
                upx = 1; upy = 0; upz = 0;
            }
        }

        let rx = upy * fz - upz * fy;
        let ry = upz * fx - upx * fz;
        let rz = upx * fy - upy * fx;

        const rLen = rx * rx + ry * ry + rz * rz;

        if (rLen < 1e-12) {
            rx = 1; ry = 0; rz = 0;
        } else {
            const inv = 1 / Math.sqrt(rLen);
            rx *= inv; ry *= inv; rz *= inv;
        }

        const ux = fy * rz - fz * ry;
        const uy = fz * rx - fx * rz;
        const uz = fx * ry - fy * rx;

        return {
            x: toPlaneOffset.x + lx * rx + ly * ux + lz * fx,
            y: toPlaneOffset.y + lx * ry + ly * uy + lz * fy,
            z: toPlaneOffset.z + lx * rz + ly * uz + lz * fz
        };
    }

    static zero = { x: 0, y: 0, z: 0 };
}

const WorldPlane = new LocalPlane({ x: 0, y: 1, z: 0 });