import { system } from "@minecraft/server";
import { Color } from "../arxLib/color.js";

export {
    RuneType,
    SpellType,

    SpellCasting
}

/**
 * @typedef SpellAttributeTypeMap
 * @property {Number} mana
 * @property {Number} power
 * @property {Number} duration
 * @property {Number} radius
 */

/**
 * @typedef RuneTypeOptions
 * @property {Object} description
 * @property {String} description.id
 * @property {Object} components
 * @property {Object} components.attributes
 * @property {Record<keyof SpellAttributeTypeMap, Number>} components.attributes.values
 * @property {Record<keyof SpellAttributeTypeMap, Number>} components.attributes.modifiers
 * @property {Object} [components.attributes.efficiency]
 * @property {Number} [components.attributes.efficiency.threshold]
 * @property {Number} [components.attributes.efficiency.defaultCoefficient]
 * @property {Record<keyof SpellAttributeTypeMap, Number>} [components.attributes.efficiency.mapCoefficient]
 */

class RuneType {
    /** @type {Record<String, RuneType>} */
    static #map = {};

    /** @type {Set<String>} */
    static _independentRuneSet = new Set();

    /** @param {RuneTypeOptions} options */
    constructor(options) {
        this.description = {
            id: options.description?.id
        };
        
        this.components = {
            attributes: {
                values: options.components?.attributes?.values || {},
                modifiers: options.components?.attributes?.modifiers || {},
                efficiency: {
                    threshold: options.components?.attributes?.efficiency?.threshold || 10,
                    defaultCoefficient: options.components?.attributes?.efficiency?.defaultCoefficient || 0.5,
                    /** @type {Record<keyof SpellAttributeTypeMap, Number>} */ mapCoefficient: options.components?.attributes?.efficiency?.mapCoefficient || {}
                }
            }
        };
    }

    get id() { return this.description.id; }

    isIndependent() { return RuneType.isIndependent(this); } 

    /** @param {String | RuneType} type */
    static isIndependent(type) { return this._independentRuneSet.has(type.id || type); }

    /** @param {RuneTypeOptions} options */
    static register(options) {

    }

    /** @param {String} id @returns {RuneType | undefined} */
    static get(id) { return this.#map[id]; }
    static getAll() { return Object.values(this.#map); }
}

/**
 * @typedef SpellSupportRuneOptions
 * @property {String | RuneType} rune
 * @property {Boolean} [required]
 */

/**
 * @typedef SpellTypeOptions
 * @property {Object} description
 * @property {String} description.id
 * @property {Object} components
 * @property {Object} components.runes
 * @property {SpellSupportRuneOptions[]} components.runes.support
 * @property {Object} components.cast
 * @property {Boolean} [components.cast.useRayCast]
 * @property {(casting: SpellCasting) => Void} components.cast.handler
 * @property {Object} [components.visuals]
 * @property {Color} [components.visuals.color]
 */

class SpellType {
    /** @type {Record<String, SpellType>} */
    static #map = {};

    /** @type {Record<String, SpellType>} */
    static #runeIdToSpell = {}

    /** @param {SpellTypeOptions} options */
    constructor(options) {
        this.description = {
            id: options.description?.id || 'unknown'
        };

        this.components = {
            runes: {
                support: (options.components?.runes?.support || []).map(data => {
                    const type = data.rune instanceof RuneType ? data.rune : RuneType.get(data.rune);
                    if (!(type instanceof RuneType)) throw new Error('Invalid spell rune type (' + data.rune + '). Rune must be registered before spell.');

                    return {
                        rune: type,
                        required: data.required ?? false
                    };
                }).toSorted((a, b) => a.rune.id.localeCompare(b.rune.id))
            },
            cast: {
                useRayCast: options.components?.cast?.useRayCast ?? false,
                handler: options.components?.cast?.handler || (() => { throw new Error('Spell does NOT have a handler function (id: ' + this.description.id + ')'); })
            },
            visuals: {
                color: options.components.visuals?.color || Color.LightBlue
            }
        };

        this._data = {
            requiredRunes: this.components.runes.support.filter(r => r.required)
        };

        if (this._data.requiredRunes.length == 0) throw new Error('A spell must have at least one required rune. (spellId: ' + this.description.id + ')');
        for (const rune of this._data.requiredRunes) RuneType._independentRuneSet.add(rune.rune.id);
    }

    get id() { return this.description.id; }
    get runeId() { return this._data.requiredRunes.map(r => r.rune.id).join('|'); }

    /** @param {SpellTypeOptions} options */
    static register(options) {
        const type = new SpellType(options);
        this.#map[type.id] = type;
        this.#runeIdToSpell[type.runeId] = type;
    }

    /** @param {String[]} runes */
    static getByRunes(runes) {
        runes = runes.filter(r => RuneType.isIndependent(r));
        if (runes.length == 0) return;

        const record = this.#runeIdToSpell.get(runes.length);
        if (record == undefined) return;

        runes.sort((a, b) => a.localeCompare(b));
        const runeId = runes.join('|');

        return this.#runeIdToSpell[runeId];
    }

    /** @param {String} id @returns {SpellType | undefined} */
    static get(id) { return this.#map[id]; }
    static getAll() { return Object.values(this.#map); }
}



/**
 * @typedef SpellCastingOptions
 * @property {(String | RuneType)[]} runes
 * @property {import('@minecraft/server').Dimension} [dimension]
 * @property {import('@minecraft/server').Vector3} [location]
 * @property {import('@minecraft/server').Entity} [caster]
 */


class SpellCasting {
    /** @param {SpellCastingOptions} options */
    constructor(options) {
        this.dimension = options.caster?.dimension || options.dimension;
        this.location = options.location || options.caster?.getHeadLocation();
        this.caster = options.caster;

        this.runes = options.runes;
        this.spell = SpellType.getByRunes(this.runes);
    }
}