import { space, vector } from "../arxLib/3d";
import { md5, Palettizer, RLE } from "../arxLib/converters";
import { gDP, sDP } from "../arxLib/dp";
import { BlocksMegaArray, SB } from "./structureBuilder";
import { Block, Dimension, world, BlockComponentTypes } from '@minecraft/server'
import { Cache } from "../arxLib/cache";

/**
 * @typedef {object} ACSO - Arx Compressed Structure Object
 * @prop {number} v - ACSO/ACSS version
 * @prop {string} s - Structure size
 * @prop {string} p - Blocks palette
 * @prop {string} r - Palette of permutations
 * @prop {ACSOPermutationValuesPalette} l - Palette of permutations values
 * @prop {string} u - Palette of unique blocks
 * @prop {BlocksArray} b - Array of blocks
 * @prop {string} a - Structure anchor data
 */

/** @typedef {import("../arxLib/converters").PalettizerPalette} ACSOBlocksPalette */
/** @typedef {import("../arxLib/converters").PalettizerPalette} ACSOPermutationsPalette */
/** @typedef {import("../arxLib/converters").PalettizerPalette} ACSOPermutationValuesPalette */
/** @typedef {import("../arxLib/converters").PalettizerPalette} ACSOUniqueBlocksPalette */
/** @typedef {string} BlocksArray */

/** @typedef {string} ACSString - Arx Compressed Structure String */

/**
 * @typedef {object} GetACSSOptions
 * @prop {boolean} saveEntities
 */

/**
 * @typedef {object} ACSSValidationResponse
 * @prop {boolean} isValid
 * @prop {'version' | 'objectStructure' | 'blocksArrayLength' | 'unknown'} [reason]
 */

/** Arx Compressed Structure String */
export class ACSS {
    static version = 3
    static paletteAlphabet = 'abcdefghijklmnopqrstuvwxyz'
    static anchorBlockTypeId = 'arx:acss_anchor'

    static ignoredEntityTypes = [
        'minecraft:player',
        'minecraft:item'
    ]

    static api = {
        /**
         * Get an ACSS from a world
         * @param {Dimension} dimension
         * @param {import("@minecraft/server").Vector3} p1 
         * @param {import("@minecraft/server").Vector3} p2 
         * @param {GetACSSOptions} [options={}]
         * @returns {Promise<ACSString>}
         */
        get: async (dimension, p1, p2, options = {}) => {
            /** @type {ACSO} */
            const acso = {
                v: this.version,
                s: vector.vector2str(space.getSpaceSize(p1, p2)),
            }

            const bma = new BlocksMegaArray(dimension, p1, p2, { runViaRunJob: true })
            const box = space.getSpaceBounds(p1, p2)
            const uniqueBlockTypes = new Set()
            const uniquePermutations = new Set()
            const uniquePermutationValues = new Set()
            const anchor = {
                absLocation: undefined,
                replaceWith: undefined,
                foundSecondAnchor: false,
                exists: false,
            }

            // Pre-process anchors
            for await (const b of bma) {
                // Check anchor
                if (b.typeId === this.anchorBlockTypeId) {
                    if (acso.a) {
                        if (!anchor.foundSecondAnchor) console.warn('Found 2 or more anchors; please delete one of them')
                        anchor.foundSecondAnchor = true
                        continue
                    }
                    const blockTypeIdToReplaceAnchorWith = gDP(b, 'replaceWith', 'minecraft:structure_void')
                    const relativeAnchorLocation = {}
                    for (const axis in b.location) relativeAnchorLocation[axis] = b.location[axis] - box.min[axis]
                    acso.a = vector.vector2str(relativeAnchorLocation)

                    // Remember anchor data
                    b.setType(blockTypeIdToReplaceAnchorWith)
                    anchor.absLocation = b.location
                    anchor.replaceWith = blockTypeIdToReplaceAnchorWith
                    anchor.exists = true
                }
            }

            // Create blocks and premutations palette
            for await (const b of bma) {

                uniqueBlockTypes.add(b.typeId)
                const allPermutations = b.permutation.getAllStates()
                const permNames = Object.keys(allPermutations)
                if (permNames.length > 0) {
                    permNames.forEach(perm => uniquePermutations.add(perm))
                    Object.values(allPermutations).forEach(permValue => uniquePermutationValues.add(permValue))
                }
            }

            /** @type {Record<string, {symbolsPerItem: number, palette: import("../arxLib/converters").PalettizerPalette, palettizer: Palettizer}>} */
            const palettesData = {
                blockTypes: Palettizer.createPaletteFromArray(Array.from(uniqueBlockTypes)),
                uniquePermutations: Palettizer.createPaletteFromArray(Array.from(uniquePermutations)),
                uniquePermutationValues: Palettizer.createPaletteFromArray(Array.from(uniquePermutationValues))
            }

            /** 
             * This string represents a unique block with it's permutations and their values. 
             * If it has permutations:
             * BlockTypeIdKey + PermNameKey0 + PermValueKey0 + ... (it can be longer if a block has more permutations)
             * Else: 
             * BlockTypeIdKey
             * @typedef {string} UniqueBlockString
             */

            /**
             * Get block's UniqueBlockString
             * @param {Block} b 
             * @returns {UniqueBlockString}
             */
            const getUniqueBlockString = (b) => {
                /** @type {UniqueBlockString} */
                let uniqueBlockStr = palettesData.blockTypes.palettizer.getKey(b.typeId)
                const allPermutations = b.permutation.getAllStates()
                for (const permName in allPermutations) {
                    const permPaletteKey = palettesData.uniquePermutations.palettizer.getKey(permName)
                    const permValueKey = palettesData.uniquePermutationValues.palettizer.getKey(allPermutations[permName])
                    uniqueBlockStr += permPaletteKey + permValueKey
                }
                return uniqueBlockStr
            }

            // Get all unique blocks variations
            /** @type {Set<UniqueBlockString>} */
            const uniqueBlocks = new Set()
            for await (const b of bma) {
                uniqueBlocks.add(getUniqueBlockString(b))
            }
            palettesData['uniqueBlocks'] = Palettizer.createPaletteFromArray(Array.from(uniqueBlocks))

            /** Despite 'array' in this var's name, it's not an array. It's a huge string of blocks */
            // Get an array of blocks
            let blocksArray = ''
            for await (const b of bma) {
                const uniqueStr = getUniqueBlockString(b)
                const blockPaletteKey = palettesData.uniqueBlocks.palettizer.getKey(uniqueStr)
                blocksArray += blockPaletteKey
            }
            blocksArray = RLE.encode(blocksArray, palettesData.uniqueBlocks.symbolsPerItem)

            // Write to asco
            acso.p = Object.values(palettesData.blockTypes.palette).map(typeId => this.api.private.codec.namespaces.encode(typeId)).join('|')
            if (uniquePermutations.size > 0) {
                acso.r = Object.values(palettesData.uniquePermutations.palette).map(permName => this.api.private.codec.namespaces.encode(permName)).join('|')
                acso.l = Object.values(palettesData.uniquePermutationValues.palette)
            }
            acso.u = Object.values(palettesData.uniqueBlocks.palette).join('|')
            acso.b = blocksArray

            // Clear RAM
            for (const data of Object.values(palettesData)) data.palettizer?.dispose()

            // Return anchor
            if (anchor.exists) {
                for await (const b of new BlocksMegaArray(dimension, anchor.absLocation, anchor.absLocation, { runViaRunJob: true })) {
                    b.setType(this.anchorBlockTypeId)
                    sDP(b, 'replaceWith', anchor.replaceWith)
                }
            }

            return this.api.private.acso2acss(acso)
        },

        /**
         * Place an ACSS in a world
         * @param {Dimension} dimension 
         * @param {import("@minecraft/server").Vector3} location 
         * @param {ACSString} acss 
         */
        place: async (dimension, location, acss) => {
            const validationResult = this.api.validate(acss)
            if (!validationResult.isValid) throw new Error('Cannot place an invalid ACSS. Reason: ' + validationResult.reason)

            const acso = this.api.private.acss2acso(acss)
            const acsoSize = vector.str2vector(acso.s)

            const placemenetOffset = acso.a ? vector.invert(vector.str2vector(acso.a)) : vector.null(3)

            /** @type {import('../arxLib/jsDocInterfaces').MinMaxInterface<import("@minecraft/server").Vector3>} */
            const minMax = {}
            {
                const min = vector.sum(location, placemenetOffset)
                minMax.min = min
                minMax.max = vector.sum(min, vector.sum(acsoSize, { x: -1, y: -1, z: -1 }))
            }

            const bma = new BlocksMegaArray(dimension, minMax.min, minMax.max, { runViaRunJob: true })

            // Restore palettes
            const palettesData = {
                blockTypes: Palettizer.createPaletteFromArray(acso.p.split('|')),
                uniquePermutations: acso.r ? Palettizer.createPaletteFromArray(acso.r.split('|')) : undefined,
                uniquePermutationValues: acso.l ? Palettizer.createPaletteFromArray(acso.l) : undefined,
                uniqueBlocks: Palettizer.createPaletteFromArray(acso.u.split('|'))
            }

            const blocksArray = RLE.decode(acso.b, palettesData.uniqueBlocks.symbolsPerItem)

            /**
             * Parce block's string to block id and permutations
             * Also, restores shorten namespaces
             * @param {string} str 
             * @returns {{ typeId: string, permutations: Record<string, number | boolean | string> | undefined }}
             */
            const parceBlockString = (str) => {
                let result = {
                    typeId: undefined,
                    permutations: {}
                }

                const blockTypeKeyLength = palettesData.blockTypes.symbolsPerItem
                const blockTypeShorten = palettesData.blockTypes.palettizer.get(str.slice(0, blockTypeKeyLength))
                result.typeId = this.api.private.codec.namespaces.decode(blockTypeShorten)

                // Permutations
                if (blockTypeKeyLength < str.length) {

                    const permutationKeyLength = palettesData.uniquePermutations.symbolsPerItem
                    const permutationValueKeyLength = palettesData.uniquePermutationValues.symbolsPerItem
                    const permKeyValueLength = permutationKeyLength + permutationValueKeyLength
                    const permutationsEncoded = str.slice(blockTypeKeyLength)

                    // Parce permutations
                    for (let i = 0; i * permKeyValueLength < permutationsEncoded.length; i++) {
                        const done = i * permKeyValueLength
                        const area = permutationsEncoded.slice(done, done + permKeyValueLength)
                        const permKey = area.slice(0, permutationKeyLength)
                        const permValueKey = area.slice(permutationKeyLength)

                        const permName = this.api.private.codec.namespaces.decode(palettesData.uniquePermutations.palettizer.get(permKey))
                        const permValue = palettesData.uniquePermutationValues.palettizer.get(permValueKey)

                        result.permutations[permName] = permValue
                    }
                }

                return result

            }

            const step = palettesData.uniqueBlocks.symbolsPerItem
            let done = 0
            // Place
            for await (const block of bma) {
                const uniqueBlockSymbol = blocksArray.slice(done, done + step)

                // Get a symbol(s) for this unique block
                const blockSymbols = palettesData.uniqueBlocks.palettizer.get(uniqueBlockSymbol)
                if (!blockSymbols) {
                    console.error('An error occured while placing an acss: Recieved empty block data from palette')
                    break
                }
                const data = parceBlockString(blockSymbols)

                block.setType(data.typeId)

                for (const permutationName in data.permutations) {
                    block.setPermutation(block.permutation.withState(permutationName, data.permutations[permutationName]))
                }

                done += step
            }

        },

        /**
         * Check if the acss is valid
         * @param {ACSString} acss 
         * @returns {ACSSValidationResponse}
         */
        validate: (acss) => {
            /** @returns {ACSSValidationResponse} */
            const run = () => {
                const acso = this.api.private.acss2acso(acss)

                try {
                    if (acso?.v !== 3) return { isValid: false, reason: 'version' }
                    if (typeof acso?.s !== 'string' || typeof vector.str2vector(acso.s) !== 'object') return { isValid: false, reason: 'objectStructure' }
                    if (typeof acso?.p !== 'string') return { isValid: false, reason: 'objectStructure' }
                    if (typeof acso?.u !== 'string') return { isValid: false, reason: 'objectStructure' }
                    if (typeof acso?.b !== 'string') return { isValid: false, reason: 'objectStructure' }
                    const volume = space.getVolume(vector.str2vector(acso?.s))
                    const symbolsPerUniqueBlock = Palettizer.createPaletteFromArray(acso?.u?.split('|')).symbolsPerItem
                    // console.warn(`ACSO no-RLE length: ${RLE.decode(acso?.b, symbolsPerUniqueBlock).length}, expectedLength: ${volume * symbolsPerUniqueBlock}`)
                    if (RLE.decode(acso?.b, symbolsPerUniqueBlock).length !== volume * symbolsPerUniqueBlock) return { isValid: false, reason: 'blocksArrayLength' }
                }
                catch (err) {
                    console.warn('An error ocured while validating acss')
                    return { isValid: false, reason: 'unknown' }
                }

                return { isValid: true }
            }
            return this.api.private.validationCache.get(md5(acss), run)
        },

        private: {
            /**
             * Turn ACSO to ACSS
             * @param {ACSO} acso
             * @returns {ACSString}
             */
            acso2acss(acso) {
                return JSON.stringify(acso)
            },
            /**
             * Turn ACSS to ACSO
             * @param {ACSString} acss
             * @returns {ACSO}
             */
            acss2acso(acss) {
                return JSON.parse(acss)
            },

            validationCache: new Cache({ limit: 50 }),

            codec: {
                namespaces: {
                    minecraftNameSpace: 'minecraft:',
                    arxNameSpance: 'arx:',

                    /**
                     * Remove namespaces
                     * @param {string} str 
                     * @returns {string}
                     */
                    encode(str) {
                        if (str.startsWith(this.minecraftNameSpace)) str = '@' + str.slice(this.minecraftNameSpace.length)
                        else if (str.startsWith(this.arxNameSpance)) str = '#' + str.slice(this.arxNameSpance.length)
                        return str
                    },

                    /**
                     * Restore namespaces
                     * @param {string} str 
                     * @returns {string}
                     */
                    decode(str) {
                        if (str.startsWith('@')) return this.minecraftNameSpace + str.slice(1)
                        else if (str.startsWith('#')) return this.arxNameSpance + str.slice(1)
                        return str
                    }
                }
            }
        }
    }
}