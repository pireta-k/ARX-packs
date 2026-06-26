import { system } from "@minecraft/server";

export {
    SpellType
}

class SpellRuneType {
    static register() {

    }

    static get() {

    }
}

/**
 * @typedef SpellAttributeTypeMap
 * @property {Number} mana
 * @property {Number} power
 * @property {Number} duration
 * @property {Number} radius
 */

/**
 * @typedef SpellSupportRuneOptions
 * @property {String | SpellRuneType} rune
 * @property {Number} [maxCount]
 * @property {Object} [efficiencyCoefficient]
 * @property {Number} [efficiencyCoefficient.default]
 * @property {Record<keyof SpellAttributeTypeMap, Number>} [efficiencyCoefficient.map] 
 */

/**
 * @typedef SpellTypeOptions
 * @property {Object} description
 * @property {String} description.id
 * @property {Object} components
 * @property {Object} components.attributes
 * @property {Record<keyof SpellAttributeTypeMap, Number>}components.attributes.values
 * @property {Object} components.runes
 * @property {SpellSupportRuneOptions[]} components.runes.support
 * @property {Object} components.cast
 * @property {Boolean} [components.cast.useRayCast]
 * @property {(casting: SpellCasting) => Void} components.cast.handler
 * 
*/

class SpellType {
    /** @type {Record<String, SpellType>} */
    static #map = {};

    /** @param {SpellTypeOptions} options */
    constructor(options) {
        this.description = {
            id: options.description?.id || 'unknown'
        };

        this.components = {
            attributes: {
                values: options.components?.attributes?.values || {}
            },
            runes: {
                support: (options.components?.runes?.support || []).map(data => {
                    const type = data.rune instanceof SpellRuneType ? data.rune : SpellRuneType.get(data.rune);
                    if (!(type instanceof SpellRuneType)) throw new Error('Invalid spell rune type (' + data.rune + '). Rune must be registered before spell.');

                    return {
                        rune: type,
                        maxCount: Math.max(1, data.maxCount || 0),
                        efficiencyCoefficient: {
                            default: data.efficiencyCoefficient?.default || 0.5,
                            /** @type {Record<keyof SpellAttributeTypeMap, Number>} */ map: data.efficiencyCoefficient?.map || {}
                        }
                    };
                })
            },
            cast: {
                useRayCast: options.components?.cast?.useRayCast ?? false,
                handler: options.components?.cast?.handler || (() => { throw new Error('Spell does NOT have a handler function (id: ' + this.description.id + ')'); })
            }
        };
    }

    get id() { return this.description.id; }

    /** @param {SpellTypeOptions} options */
    static register(options) {
        const type = new SpellType(options);
        this.#map[type.id] = type;
    }
}