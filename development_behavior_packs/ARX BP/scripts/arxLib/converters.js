// Here are functions to convert values

import { Cache } from "./cache";

const str2objCache = new Cache()
export function str2obj(str) {
    if (typeof str !== 'string') throw new Error('Cannot parse a non-string value')
    return str2objCache.get(str, JSON.parse, str)
}

export function obj2str(obj) {
    if (typeof obj !== 'object') throw new Error('Cannot stringify a value that in not an object')
    return JSON.stringify(obj)
}

/** Transforms vector from XYZ to XZ
 * @param {import("@minecraft/server").Vector3} vectorXYZ 
 * @returns {import("@minecraft/server").VectorXZ}
 */
export function vectorXYZ2XZ(vectorXYZ) {
    return { x: vectorXYZ.x, z: vectorXYZ.z }
}

const md5Cache = new Cache({ limit: 1000 })

/**
 * Make a md5 hash from a string. Uses cache
 * @param {String} str 
 * @returns {String}
 */
export function md5(str) {
    return md5Cache.get(str, encodeMD5, str)
}
function encodeMD5(str) {
    function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function md51(s) {
        let n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
        for (i = 64; i <= s.length; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
        s = s.substring(i - 64);
        let tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
        tail[14] = n * 8;
        md5cycle(state, tail);
        return state;
    }
    function md5blk(s) {
        let md5blks = [], i;
        for (i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        return md5blks;
    }
    let hex_chr = '0123456789abcdef'.split('');
    function rhex(n) {
        let s = '', j = 0;
        for (; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        return s;
    }
    function hex(x) { for (let i = 0; i < x.length; i++) x[i] = rhex(x[i]); return x.join(''); }
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function md5cycle(x, k) {
        let a = x[0], b = x[1], c = x[2], d = x[3];
        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);
        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);
        x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }
    return hex(md51(str));
}

/** RLE codec */
export class RLE {
    /**
     * Apply RLE encoding
     * It optimises long strings. Sample: 'aaaaaabc' -> '6abc'
     * @param {string} str - String to encode
     * @param {number} [symbolsPerItem=1] - How many symbols counts as 1 letter
     * @returns {string}
     */
    static encode(str, symbolsPerItem = 1) {
        const run = function () {
            if (/\d/.test(str)) throw new Error('Cannot encode a string with RLE because it contains numbers')
            if (typeof symbolsPerItem !== 'number' || symbolsPerItem < 1 || str.length % symbolsPerItem !== 0) throw new Error('Cannot encode a string with RLE because it\'s symbolsPerItem is inappropriate')

            let i = 0
            let result = ''

            // Get repeats
            while (i < str.length) {
                const symbol = str.slice(i, i + symbolsPerItem)
                let itemsInRow = 1
                i += symbolsPerItem

                while (i + symbolsPerItem <= str.length && str.slice(i, i + symbolsPerItem) === symbol) {
                    itemsInRow++
                    i += symbolsPerItem
                }

                result += (itemsInRow > 1 ? itemsInRow : '') + symbol
            }

            return result
        }
        return this.encodeCache.get(str + ':$:' + symbolsPerItem, run, str, symbolsPerItem)
    }
    static encodeCache = new Cache({ limit: 1000 })
    /**
     * Decode RLE
     * Sample: '2ad4c' -> 'aadcccc'
     * @param {string} str 
     * @param {number} symbolsPerItem 
     * @returns {string}
     */
    static decode(str, symbolsPerItem = 1) {
        const run = function () {
            if (typeof symbolsPerItem !== 'number' || symbolsPerItem < 1) throw new Error('Cannot encode a string with RLE because it\'s symbolsPerItem is inappropriate')

            let result = ''
            let i = 0

            while (i < str.length) {
                // Get number of repeats
                let numStr = ''
                while (i < str.length && /\d/.test(str[i])) {
                    numStr += str[i]
                    i++
                }
                const count = numStr ? parseInt(numStr, 10) : 1

                // Read symbol
                if (i + symbolsPerItem > str.length) throw new Error(`RLE: Truncated symbol at pos ${i} (need ${symbolsPerItem}, got ${str.length - i})`)
                const symbol = str.slice(i, i + symbolsPerItem)
                i += symbolsPerItem

                // Set
                result += symbol.repeat(count)
            }
            return result
        }
        return this.decodeCache.get(str + ':$:' + symbolsPerItem, run, str, symbolsPerItem)
    }
    static decodeCache = new Cache({ limit: 1000 })
}

/**
 * @typedef CreatePaletteFromArrayOptions
 * @prop {string} [paletteAlphabet]
 */
/** @typedef {string} PaletteKey */
/** @typedef {string | number | undefined} PaletteItem */
/**
 * @typedef {Record<PaletteKey, PaletteItem>} PalettizerPalette
 */

/** Class to operate palettes */
export class Palettizer {
    static defaultPaletteAlphabet = 'abcdefghijklmnopqrstuvwxyz'

    /**
     * Create a palette from an array of items
     * It assigns keys to unique items
     * @param {PaletteItem[]} itemsArray 
     * @param {CreatePaletteFromArrayOptions} options 
     */
    static createPaletteFromArray(itemsArray, options = {}) {
        if (!itemsArray || itemsArray.length === 0) return {}
        const paletteAlphabet = options.paletteAlphabet ?? this.defaultPaletteAlphabet
        const uniqueItems = new Set(itemsArray)
        const uniqueItemsArray = [...uniqueItems]

        const alphabetLength = paletteAlphabet.length
        if (alphabetLength < 2) throw new Error('Palette alphabet must be >= 2 symbols')
        const numOfUniqueItems = uniqueItems.size

        let symbolsPerItem = 1
        while (alphabetLength ** symbolsPerItem < numOfUniqueItems) symbolsPerItem++

        /**
         * Returns a palette key
         * @param {number} index 
         * @returns {PaletteKey}
         */
        function indexToKey(index) {
            let key = ''

            for (let i = 0; i < symbolsPerItem; i++) {
                key = paletteAlphabet[index % alphabetLength] + key
                index = Math.floor(index / alphabetLength)
            }

            return key
        }

        /** @type {PalettizerPalette} */
        let palette = {}

        for (let i = 0; i < numOfUniqueItems; i++) {
            const item = uniqueItemsArray[i]
            const key = indexToKey(i)
            palette[key] = item
        }

        const palettizer = new Palettizer(palette, symbolsPerItem)

        return { symbolsPerItem, palette, palettizer }
    }

    /**
     * Create a new Palettizer to operate a palette
     * @param {PalettizerPalette} palette 
     * @param {number} symbolsPerItem 
     */
    constructor(palette, symbolsPerItem) {
        this.palette = palette
        this.symbolsPerItem = symbolsPerItem
        this.paletteReversed = {}

        for (const key in palette) {
            this.paletteReversed[palette[key]] = key
        }
    }

    /**
     * Get a palette value using a key
     * @param {PaletteKey} key 
     * @returns 
     */
    get(key) {
        return this.palette[key]
    }

    /**
     * Get a palette key using a value
     * @param {string} value 
     */
    getKey(value) {
        return this.paletteReversed[value]
    }

    dispose() {
        this.palette = undefined
        this.paletteReversed = undefined
        this.symbolsPerItem = undefined
    }
}