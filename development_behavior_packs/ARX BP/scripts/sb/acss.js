import { SB } from "./structureBuilder";

/**
 * @typedef {object} ACSO - Arx Compressed Structure Object
 */

/**
 * @typedef {string} ACSS - Arx Compressed Structure String
 */

/** Arx Compressed Structure String */
export class ACSS {
    /** @type {number} */
    static version = 2
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
         */
        get: (p1, p2) => {

        },
        load: (anchor, acss) => {

        },

        private: {
            /**
             * Turn ACSO to ACSS
             * @param {ACSO} acso
             * @returns {ACSS}
             */
            acss2str(acso) {
                return JSON.stringify(acso).replaceAll('"', ACSS.stringQuote)
            },
            /**
             * Turn ACSS to ACSO
             * @param {ACSS} acss
             * @returns {ACSO}
             */
            str2acss(acss) {
                return JSON.parse(acss).replaceAll(ACSS.stringQuote, '"')
            }
        }
    }
}