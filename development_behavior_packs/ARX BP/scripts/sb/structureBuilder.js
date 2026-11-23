import { world, BlockPermutation, Player, Dimension, Block, System, system, BlockTypes, BlockType } from "@minecraft/server"
import { gDP, sDP } from "../arxLib/dp"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import { validateTickingAreaLoading } from "./prospect"
import { sleep } from "../arxLib/time"
import { runJobAsync, runJobDynamic } from "../arxLib/runJob"
import { vector } from "../arxLib/3d"
import { obj2str, RLE, str2obj } from "../arxLib/converters"
import { ACSS } from "./acss"


/** A place to store ACSS. User's "save in RAM" option saves it here */
let acssStorage = {}
/** Path to SB icons folder */
const SB_UI_ICON_PATH = 'textures/ui/sb/'
/** Limit of recursion deletions */
const RECURSIVE_DELETE_LIMIT = 8000

// StructureBuilder namespace - sb

/** @typedef {'success' | 'fail'} SBAPIOperationResponse */
/** 
 * @typedef {object} SBAPIOperationDetailedResponse 
 * @prop {SBAPIOperationResponse} status
 * @prop {'invalidBlock' | 'wrongArguments' | 'unknown'} reason
 */
/**
 * @typedef {object} SBAPIFillOptions
 * @prop {string[] | undefined} [affectedBlockTypes=undefined] - blocks to replace
 */
/**
 * @typedef {object} SBAPISetPointOptions
 * @prop {boolean} [shutUp=false] - do not send a message
 */

/** StructureBuilder */
export class SB {
    static api = {
        point: {
            /**
            * Set SB point
            * @param {Player} p 
            * @param {Number} pointNum 
            * @param {import("@minecraft/server").Vector3} loc 
            * @param {SBAPISetPointOptions} options
            */
            set: (p, pointNum, loc, options = {}) => {

                // Unknown point number
                if (!this.allowedPoints.includes(pointNum)) return
                // Edit location
                const locAdapted = {
                    x: Math.trunc(loc.x),
                    y: Math.trunc(loc.y),
                    z: Math.trunc(loc.z)
                }
                // Set DP
                sDP(p, this.api.private.getPointDp(pointNum), locAdapted)

                if (!options?.shutUp) {
                    const color = pointNum === 1 ? '§a' : '§c'
                    p.sendMessage(`Saved ${color}Point ${pointNum}`)
                }
            },

            /**
             * Get saved SP point 
             * @param {Player} p 
             * @param {Number} pointNum 
             * @returns {import("@minecraft/server").Vector3}
             */
            get: (p, pointNum) => {
                return gDP(p, this.api.private.getPointDp(pointNum)) ?? this.defaultPointCoords
            }
        },

        /**
         * Fill an area with blocks
         * @param {Dimension} dimension
         * @param {import("@minecraft/server").Vector3} pos1
         * @param {import("@minecraft/server").Vector3} pos2
         * @param {string} blockTypeToFillWith
         * @param {SBAPIFillOptions} [options={}]
         * @returns {Promise<SBAPIOperationResponse>}
         */
        fill: async (dimension, pos1, pos2, blockTypeToFillWith, options = {}) => {
            if (options?.affectedBlockTypes && !Array.isArray(options?.affectedBlockTypes)) throw new Error('Invalid argument in SB API fill(): options.affectedBlockTypes expected type: Array')
            if (!this.api.private.doBlockTypeExists(blockTypeToFillWith)) return 'fail'

            const affectedBlockTypes = options?.affectedBlockTypes

            const bma = new BlocksMegaArray(dimension, pos1, pos2, { runViaRunJob: true })

            try {
                if (!affectedBlockTypes) { // Replace all
                    for await (const b of bma) {
                        b.setType(blockTypeToFillWith)
                    }
                }
                else { // Replace selective
                    for await (const b of bma) {
                        if (affectedBlockTypes.includes(b.typeId)) b.setType(blockTypeToFillWith)
                    }
                }
                return 'success'
            }

            catch (error) {
                console.error(error, error.stack)
                return 'fail'
            }
        },

        /**
         * Recursive delete (flood fill from Point 1, same block id)
         * @param {Dimension} dimension 
         * @param {import("@minecraft/server").Vector3} pos1
         * @returns {Promise<SBAPIOperationResponse>}
         */
        async recursiveDelete(dimension, pos1) {
            const initialBlock = dimension?.getBlock(pos1)
            if (!initialBlock) return 'fail'
            if (!dimension.isChunkLoaded(pos1)) return 'fail'
            const desiredId = initialBlock.typeId
            if (desiredId === 'minecraft:air') return 'fail'
            const neighbourOffsets = [
                { x: 0, y: 1, z: 0 },
                { x: 0, y: -1, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: -1, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 },
                { x: 0, y: 0, z: -1 },
            ]
            const megaArrayBorders = {
                min: {
                    x: Infinity, y: Infinity, z: Infinity
                },
                max: {
                    x: -Infinity, y: -Infinity, z: -Infinity
                }
            }

            /** @type {string[]} */
            const processedBlocks = []
            /** @type {string[]} set of coord JSON strings for blocks to process */
            const blocksToProcess = [obj2str(initialBlock.location)]
            /** @type {Set<string>} set of coord JSON strings for blocks to replace. Add initial block */
            const blocksToReplace = new Set(blocksToProcess)

            // Process blocks
            await runJobDynamic((data) => {
                if (blocksToProcess.length === 0 || RECURSIVE_DELETE_LIMIT < data.index) {
                    data.stop = true
                    return
                }

                const currentPos = str2obj(blocksToProcess.shift())
                if (!dimension.isChunkLoaded(currentPos)) return

                // Edit borders
                megaArrayBorders.max.x = Math.max(megaArrayBorders.max.x, currentPos.x)
                megaArrayBorders.max.y = Math.max(megaArrayBorders.max.y, currentPos.y)
                megaArrayBorders.max.z = Math.max(megaArrayBorders.max.z, currentPos.z)
                megaArrayBorders.min.x = Math.min(megaArrayBorders.min.x, currentPos.x)
                megaArrayBorders.min.y = Math.min(megaArrayBorders.min.y, currentPos.y)
                megaArrayBorders.min.z = Math.min(megaArrayBorders.min.z, currentPos.z)

                for (const offset of neighbourOffsets) {
                    // Get neighbour block
                    const neighbourPos = vector.sum(offset, currentPos)
                    if (!dimension.isChunkLoaded(neighbourPos)) return
                    const neighbourBlock = dimension.getBlock(neighbourPos)

                    // Check it and add it
                    const neighbourPosStr = obj2str(neighbourPos)
                    if (!processedBlocks.includes(neighbourPosStr) && neighbourBlock.typeId === desiredId) {
                        blocksToProcess.push(neighbourPosStr)
                        blocksToReplace.add(neighbourPosStr)
                        processedBlocks.push(neighbourPosStr)
                    }
                }
            })

            // Delete
            const bma = new BlocksMegaArray(dimension, megaArrayBorders.min, megaArrayBorders.max)
            for await (const bmaBlock of bma) {
                const bmaBlockPosStr = obj2str(bmaBlock.location)
                if (blocksToReplace.has(bmaBlockPosStr)) {
                    blocksToReplace.delete(bmaBlockPosStr)
                    bmaBlock.setType('minecraft:air')
                }
            }

            return 'success'
        },

        private: {
            /**
             * @param {Number} pointNum 
             * @returns {string}
             */
            getPointDp: (pointNum) => {
                if (this.allowedPoints.includes(pointNum)) return 'sb:point' + pointNum
                throw new Error('Cannot get a DP of an unknown point')
            },

            /**
             * Checks if a proveided string is any block's typeId. Supports Arx blocks
             * @param {string | BlockType} type 
             */
            doBlockTypeExists(type) {
                if (typeof type === 'string') return !!BlockTypes.get(type)
                else return true

            },
        }
    }

    /** @type {Number[]} */
    static allowedPoints = [1, 2]
    /** @type {import("@minecraft/server").Vector3} */
    static defaultPointCoords = { x: 0, y: 0, z: 0 }
}

/**
 * @typedef BlocksMegaArrayOptions
 * @prop {boolean} [runViaRunJob=false] - if true, works slowly and gently. If false, works ~20% faster but can cause lags
 */

/**
 * The core part of SB. Allows to iterate blocks array
 */
export class BlocksMegaArray {
    static instancesCreated = 0

    /**
     * @param {Dimension} dimension
     * @param {import("@minecraft/server").Vector3} pos1
     * @param {import("@minecraft/server").Vector3} pos2
     * @param {BlocksMegaArrayOptions} [options]
     */
    constructor(dimension, pos1, pos2, options = {}) {
        if (!dimension || typeof pos1 !== "object" || typeof pos2 !== "object") {
            console.warn('Trying to create BlocksMegaArray with irrelevant positions')
        }

        this.id = Date.now() + '_' + BlocksMegaArray.instancesCreated++
        /** @type {string} */
        this.tickingAreaName = 'sb:' + this.id
        this.dimension = dimension
        this.runViaRunJob = options.runViaRunJob || false

        // Anchor is a Vector3 vertex of MegaArray with smallest values
        this.anchor = {
            x: Math.min(pos1.x, pos2.x),
            y: Math.min(pos1.y, pos2.y),
            z: Math.min(pos1.z, pos2.z)
        }
        // Opposite to anchor
        this.top = {
            x: Math.max(pos1.x, pos2.x),
            y: Math.max(pos1.y, pos2.y),
            z: Math.max(pos1.z, pos2.z)
        }
        // Size of all array
        this.size = {
            x: Math.abs(pos1.x - pos2.x) + 1,
            y: Math.abs(pos1.y - pos2.y) + 1,
            z: Math.abs(pos1.z - pos2.z) + 1
        }
    }

    /** 
     * Itearator. Iterates by megachunks
     * Megachunk is a 3D mass of blocks with x size = 32, y size = world hight, z size = 32
     * @yields {BlocksMegaArray.MegaChunk} 
     */
    *iterMegaChunks() {
        const CHUNK_SIZE = 32
        for (let cx = 0; cx < this.size.x; cx += CHUNK_SIZE) {
            for (let cz = 0; cz < this.size.z; cz += CHUNK_SIZE) {
                yield new BlocksMegaArray.MegaChunk(cx, cz, this)
            }
        }
    }

    /**
     * Main blocks iterator
     * @returns {AsyncGenerator<Block>}
     */
    async *[Symbol.asyncIterator]() {
        for (const chunk of this.iterMegaChunks()) {
            // The active area we need to process further
            const activeArea = {
                // Minimal vertex of the area
                min: { x: Math.max(chunk.absPos.x, this.anchor.x), y: chunk.height.min, z: Math.max(chunk.absPos.z, this.anchor.z) },
                // Top vertex of the area
                max: { x: Math.min(chunk.absPos.x + 31, this.top.x), y: chunk.height.max, z: Math.min(chunk.absPos.z + 31, this.top.z) }
            }

            await chunk.startTick()

            // Iterate and yield blocks (axis order: y desc → x asc → z asc)
            if (this.runViaRunJob) yield* await runJobAsync(this.#iterateBlocksInArea(activeArea.min, activeArea.max))
            else yield* this.#iterateBlocksInArea(activeArea.min, activeArea.max)

            await chunk.delTick()
        }
    }

    /**
     * @param {import("@minecraft/server").Vector3} min 
     * @param {import("@minecraft/server").Vector3} max 
     */
    *#iterateBlocksInArea(min, max) {
        for (let y = max.y; y >= min.y; y--) {
            for (let x = min.x; x <= max.x; x++) {
                for (let z = min.z; z <= max.z; z++) {
                    yield this.dimension.getBlock({ x: x, y: y, z: z })
                }
            }
        }
    }

    // MegaChunk class
    static MegaChunk = class {
        /**
         * @param {number} posX 
         * @param {number} posZ 
         * @param {BlocksMegaArray} parent 
         */
        constructor(posX, posZ, parent) {
            this.parent = parent
            this.relPos = { x: posX, z: posZ } // Relative to Mega Array position
            this.absPos = { x: this.parent.anchor.x + this.relPos.x, z: this.parent.anchor.z + this.relPos.z } // Absolute
            this.height = { min: this.parent.anchor.y, max: this.parent.top.y }
        }

        // Start ticking
        async startTick() {
            await this.delTick()
            await validateTickingAreaLoading(this.parent.dimension, this.absPos, { x: this.absPos.x + 31, z: this.absPos.z + 31 }, this.parent.tickingAreaName, true)
        }

        // Stop ticking
        async delTick() {
            const exists = world.tickingAreaManager.getAllTickingAreas().some(ta => ta.identifier === this.parent.tickingAreaName)
            if (exists) world.tickingAreaManager.removeTickingArea(this.parent.tickingAreaName)
        }

        // Can the chunk be loaded without custom tickingarea?
        isLoaded() {
            const corner0Loaded = this.parent.dimension.isChunkLoaded({ x: this.absPos.x, y: this.parent.anchor.y, z: this.absPos.z })
            const corner1Loaded = this.parent.dimension.isChunkLoaded({ x: this.absPos.x + 32, y: this.parent.anchor.y, z: this.absPos.z })
            const corner2Loaded = this.parent.dimension.isChunkLoaded({ x: this.absPos.x, y: this.parent.top.y, z: this.absPos.z + 32 })
            const corner3Loaded = this.parent.dimension.isChunkLoaded({ x: this.absPos.x + 32, y: this.parent.top.y, z: this.absPos.z + 32 })
            return corner0Loaded && corner1Loaded && corner2Loaded && corner3Loaded
        }
    }
}

// Use hammer (Right-click)
/**
 * @param {Player} p 
 */
export async function onUseSBHammer(p) {
    const sneaking = p.inputInfo.getButtonState("Sneak") === 'Pressed'
    if (!sneaking) { // Save point
        const b = p.getBlockFromViewDirection()?.block
        try {
            SB.api.point.set(p, 2, b.location)
        }
        catch {
            console.log('Block detection error')
        } // Block is too far away
    }
    else {

        const point1 = SB.api.point.get(p, 1)
        const point2 = SB.api.point.get(p, 2)
        const d = p.dimension

        // Form for player
        const form = new ActionFormData()

        form.title('StructureBuilder options')
        let body = '§aPoint 1§f: ' + getCoordinatesString(point1) + '\n' + '§cPoint 2§f: ' + getCoordinatesString(point2)

        const dx = Math.abs(point1.x - point2.x) + 1
        const dy = Math.abs(point1.y - point2.y) + 1
        const dz = Math.abs(point1.z - point2.z) + 1

        const volume = dx * dy * dz

        body += "\n§bVolume§f: " + volume + ' blocks'

        form.body(body)

        // Buttons
        form.button('Delete blocks', `${SB_UI_ICON_PATH}delete_blocks`)
        form.button('Recursive delete blocks', `${SB_UI_ICON_PATH}delete_blocks_recursive`)
        form.button('Fill with block', `${SB_UI_ICON_PATH}fill`)
        form.button('Replace blocks', `${SB_UI_ICON_PATH}replace`)
        form.button('Get ACSS', `${SB_UI_ICON_PATH}save_acss`)
        form.button('Place ACSS', `${SB_UI_ICON_PATH}load_acss`)

        form.show(p).then(async r => {
            switch (r.selection) {
                case 0: // Delete blocks
                    {
                        p.sendMessage(`§bDeleting... (${volume} blocks)`)
                        const response = await SB.api.fill(p.dimension, point1, point2, 'minecraft:air')
                        if (response === 'success') p.sendMessage('§bCompleted')
                        else p.sendMessage('§bAn error occured. Try again')
                    }
                    break

                case 1: // Recursive delete (flood fill from Point 1, same block id)
                    {
                        const response = await SB.api.recursiveDelete(p.dimension, point1)
                        if (response === 'success') p.sendMessage('§bRecursive delete success')
                        else p.sendMessage('§cRecursive delete fail')
                    }
                    break

                case 2: // Fill blocks
                    new ModalFormData()
                        .title("Fill with block")
                        .textField(`Enter a block ID`, "namespace:id")
                        .submitButton('Fill')

                        .show(p).then(async r => {

                            if (r.formValues) {

                                p.sendMessage(`§bFilling... (${volume} blocks)`)
                                const blockId = r.formValues[0].trim()
                                const response = await SB.api.fill(p.dimension, point1, point2, blockId)
                                if (response === 'success') p.sendMessage('§bCompleted')
                                else p.sendMessage(`§cError. Probably "${blockId}" isn't an id of an actual block`)
                            }
                        })
                    break

                case 3: // Replace blocks
                    new ModalFormData()
                        .title("Replace blocks")
                        .textField(`Block to replace ID`, "namespace:id")
                        .textField(`New block ID`, "namespace:id")
                        .submitButton('Replace')

                        .show(p).then(async r => {

                            if (r.formValues) {

                                p.sendMessage(`§bReplacing... (${volume} blocks)`)
                                const block2ReplaceId = r.formValues[0].trim()
                                const block2SetId = r.formValues[1].trim()
                                let replaced = 0
                                const undoBlocks = []
                                let replaceOk = true

                                for await (const b of new BlocksMegaArray(d, point1, point2)) {
                                    try {
                                        if (b.typeId === block2ReplaceId) {
                                            undoBlocks.push(captureBlockForUndo(b))
                                            b.setType(block2SetId)
                                            replaced++
                                        }
                                    }
                                    catch (error) {
                                        p.sendMessage(`§cError. Probably "${block2ReplaceId}" or "${block2SetId}" isn't a valid block id`)
                                        replaceOk = false
                                        break
                                    }
                                }
                                if (replaceOk && undoBlocks.length) setSbUndo(p, d, undoBlocks)
                                else if (replaceOk) markSbUndoOperation(p)
                                if (replaceOk) p.sendMessage(`§bCompleted, (replaced ${replaced} blocks)`)
                            }
                        })
                    break

                case 4: // Get ACSS
                    {
                        p.sendMessage(`§bSaving... (${volume} blocks)`)
                        const acss = await ACSS.api.get(d, point1, point2)
                        new ActionFormData()
                            .title("Save ACSS")
                            .button('Save in log')
                            .button('Save in RAM')
                            .button('Save in DP')
                            .show(p).then(async r2 => {
                                switch (r2.selection) {

                                    case 0:
                                        console.warn(acss)
                                        p.sendMessage(`§bACSS sent to log, length: ${acss.length} symbols`)
                                        break

                                    case 1:
                                        acssStorage[p.id] = acss
                                        p.sendMessage(`§bACSS saved in RAM, length: ${acss.length} symbols`)
                                        break

                                    case 2: {
                                        const dpForm = await new ModalFormData()
                                            .title("Save ACSS to DP")
                                            .textField(`Enter DP name`, "any")
                                            .submitButton('Save')
                                            .show(p)

                                        if (dpForm.canceled || !dpForm.formValues) break

                                        const dpName = dpForm.formValues[0]?.trim()
                                        if (!dpName) {
                                            p.sendMessage('§cDP name is empty - ACSS not saved')
                                            break
                                        }

                                        sDP(p, dpName, acss)
                                        p.sendMessage(`§bACSS saved in DP (${dpName}), length: ${acss.length} symbols`)
                                        break
                                    }
                                }
                            })
                    }

                    break

                case 5: // Place ACSS
                    {
                        let acss

                        await new ActionFormData()
                            .title("Place ACSS")
                            .button('Load from RAM')
                            .button('Load from DP')
                            .show(p).then(async acssResponse => {

                                switch (acssResponse.selection) {

                                    case 0:
                                        acss = acssStorage[p.id]
                                        break

                                    case 1:
                                        const ACSSLoadFromDPForm = new ModalFormData()
                                            .title("Load ACSS from DP")
                                            .textField(`Enter DP name`, "any")
                                            .submitButton('Load')

                                        await ACSSLoadFromDPForm.show(p).then(r => {
                                            if (r.formValues) {
                                                const response = r.formValues[0].trim()
                                                acss = gDP(p, response)
                                            }
                                        })
                                        break
                                }
                            })

                        if (!acss) {
                            p.sendMessage('§cCannot get ACSS this way. Aborted.')
                            break
                        }
                        p.sendMessage(`§bLoading ACSS...`)
                        await ACSS.api.place(d, point1, acss)
                        p.sendMessage('§bACSS loaded')
                    }

                    break
            }
        })
    }
}

function getCoordinatesString(coords) {
    if (coords) {
        return Object.values(coords).join(', ')
    }
    else return 'Not set'
}