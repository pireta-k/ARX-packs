import { space } from "../arxLib/3d";
import { SB } from "./structureBuilder";
import { Vector3 } from '@minecraft/server'

/**
 * @typedef {object} ACSO - Arx Compressed Structure Object
 * @prop {number} v - ACSO/ACSS version
 * @prop {Vector3} s - Structure size
 * @prop {number} spb - Symbols per block in ARX encoding
 * @prop {ACSOBlocksPalette} p - Blocks palette
 * @prop {ACSOPermutationsPalette} r - Palette of permuatations
 * @prop {BlocksArray} b - Array of blocks
 * @prop {Vector3} a - Structure anchor
 */

/** @typedef {Record<string, string>} ACSOBlocksPalette */
/** @typedef {Record<string, string>} ACSOPermutationsPalette */
/** @typedef {string} BlocksArray */

/** @typedef {string} ACSS - Arx Compressed Structure String */

/**
 * @typedef {object} GetACSSOptions
 * @prop {boolean} saveEntities
 */

/** Arx Compressed Structure String */
export class ACSS {
    /** @type {number} */
    static version = 3
    /** @type {string} */
    static paletteAlphabet = 'abcdefghijklmnopqrstuvwxyz'
    /** @type {string} */
    static anchorBlock = 'arx:acss_anchor'
    /** @type {string} */
    static stringQuote = '#'

    static ignoredEntityTypes = [
        'minecraft:player',
        'minecraft:item'
    ]

    static api = {
        /**
         * Get an ACSS from a world
         * @param {import("@minecraft/server").Vector3} p1 
         * @param {import("@minecraft/server").Vector3} p2 
         * @param {GetACSSOptions} [options={}]
         */
        get: (p1, p2, options = {}) => {
            /** @type {ACSO} */
            let acso = {
                v: this.version,
                s: space.getSpaceSize(p1, p2),
            }
        },
        load: (location, acss) => {

        },

        private: {
            /**
             * Turn ACSO to ACSS
             * @param {ACSO} acso
             * @returns {ACSS}
             */
            acss2acso(acso) {
                return JSON.stringify(acso).replaceAll('"', ACSS.stringQuote)
            },
            /**
             * Turn ACSS to ACSO
             * @param {ACSS} acss
             * @returns {ACSO}
             */
            acso2acss(acss) {
                return JSON.parse(acss).replaceAll(ACSS.stringQuote, '"')
            },

            codec: {
                stripMinecraftNamespace(typeId) {
                    const mcNamespace = 'minecraft:'
                    return typeId.startsWith(mcNamespace) ? typeId.slice(mcNamespace.length) : typeId
                }
            }
        }
    }
}