import { world, BlockPermutation, Player, Dimension, Block, System, system } from "@minecraft/server"
import { gDP, sDP } from "../arxLib/dp"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import { validateTickingAreaLoading } from "./prospect"
import { sleep } from "../arxLib/time"
import { runJobAsync, runJobDynamic } from "../arxLib/runJob"
import { vector } from "../arxLib/3d"
import { obj2str, RLE, str2obj } from "../arxLib/converters"


let ACSSStorage = {}
/** Path to SB icons folder */
const SB_UI_ICON_PATH = 'textures/ui/sb/'
/** Limit of recursion deletions */
const RECURSIVE_DELETE_LIMIT = 8000

// StructureBuilder namespace - sb

/** @typedef {'success' | 'fail'} SBAPIOperationResponse */
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
            }
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

    // Main blocks iterator
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
        form.button('Save ACSS', `${SB_UI_ICON_PATH}save_acss`)
        form.button('Load ACSS', `${SB_UI_ICON_PATH}load_acss`)
        form.button(getUndoButtonLabel(p))

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

                case 4: // Save ACSS
                    const saveAcssOptions = await showSaveACSSOptionsForm(p)
                    if (!saveAcssOptions) break

                    p.sendMessage(
                        saveAcssOptions.ultraCompact
                            ? `§bSaving §eultra compact§b... (${volume} blocks)`
                            : `§bSaving... (${volume} blocks)`
                    )
                    const acss = await saveACSS(d, point1, point2, { ...saveAcssOptions, player: p })
                    const ACSSSaveForm = new ActionFormData()
                        .title("Save ACSS")
                        .button('Save in log')
                        .button('Save in RAM')
                        .button('Save in DP')
                    ACSSSaveForm.show(p).then(async r2 => {
                        switch (r2.selection) {

                            case 0:
                                console.warn(acss)
                                p.sendMessage(`§bACSS sent to log, length: ${acss.length} symbols`)
                                break

                            case 1:
                                ACSSStorage[gDP(p, 'id')] = acss
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
                    break

                case 5: // Load ACSS
                    let rawACSS = ''

                    const ACSSLoadForm = new ActionFormData()
                        .title("Load ACSS")
                        .button('Load from RAM')
                        .button('Load from DP')
                    await ACSSLoadForm.show(p).then(async r2 => {
                        switch (r2.selection) {

                            case 0:
                                rawACSS = ACSSStorage[gDP(p, 'id')]
                                break

                            case 1:
                                const ACSSLoadFromDPForm = new ModalFormData()
                                    .title("Load ACSS from DP")
                                    .textField(`Enter DP name`, "any")
                                    .submitButton('Load')

                                await ACSSLoadFromDPForm.show(p).then(async r => {

                                    if (r.formValues) {
                                        const response = r.formValues[0].trim()
                                        rawACSS = gDP(p, response)
                                    }
                                })
                                break
                        }
                    })

                    if (!rawACSS) {
                        p.sendMessage('§cCannot get ACSS this way. Aborted.')
                        return null
                    }
                    p.sendMessage(`§bLoading ACSS...`)
                    await loadACSS(rawACSS, d, point1)
                    p.sendMessage('§bACSS loaded')
                    break

                case 6: // Undo (last delete / fill / replace / recursive delete this session)
                    await applySbUndo(p)
                    break
            }
        })
    }
}

/** @returns {Promise<{ saveChestLoot: boolean, saveEntities: boolean, saveAnchors: boolean, ultraCompact: boolean } | null>} */
async function showSaveACSSOptionsForm(p) {
    const response = await new ModalFormData()
        .title('ACSS options')
        .toggle('Chest loot tables', {
            defaultValue: true,
            tooltip: 'Paper in slot 0: loot path in the name, e.g. acss/chests/test',
        })
        .toggle('Entities', {
            defaultValue: true,
            tooltip: 'Players and dropped items are ignored. Only entity type id is saved.',
        })
        .toggle('Anchors', {
            defaultValue: true,
            tooltip: 'Save arx:acss_anchor as force_anchor (void on load). Off: saved as the block itself.',
        })
        .toggle('Ultra compact', {
            defaultValue: false,
            tooltip: 'Very slow. Tries all 6 axis orders and keeps the smallest ACSS string (best RLE).',
        })
        .submitButton('Continue')
        .show(p)

    if (response.canceled || !response.formValues) return null

    return {
        saveChestLoot: !!response.formValues[0],
        saveEntities: !!response.formValues[1],
        saveAnchors: !!response.formValues[2],
        ultraCompact: !!response.formValues[3],
    }
}

/** @param {{ saveChestLoot?: boolean, saveEntities?: boolean, saveAnchors?: boolean, ultraCompact?: boolean, player?: import("@minecraft/server").Player }} [options] */
async function saveACSS(d, p1, p2, options = {}) {
    try {
        const saveChestLoot = options.saveChestLoot !== false
        const saveEntities = options.saveEntities !== false
        const saveAnchors = options.saveAnchors !== false
        const ultraCompact = !!options.ultraCompact
        const player = options.player
        const acss = {
            head: {},
            palette: {},
            b3d: '',
        }

        acss.head = {
            v: ACSS_VERSION,
            s: [
                Math.abs(p1.x - p2.x) + 1,
                Math.abs(p1.y - p2.y) + 1,
                Math.abs(p1.z - p2.z) + 1,
            ],
        }

        const anchor = getStructureAnchor(p1, p2)
        const corner = {
            x: anchor.x + acss.head.s[0] - 1,
            y: anchor.y + acss.head.s[1] - 1,
            z: anchor.z + acss.head.s[2] - 1,
        }

        const volume = acss.head.s[0] * acss.head.s[1] * acss.head.s[2]
        const pkSet = new Set()
        const pvSet = new Set()
        const uniqueBlocks = []
        const uniqueBlockIndex = new Map()
        const blockMap = new Map()
        const lootChests = saveChestLoot ? [] : null
        let forceAnchor = null
        let blockPos = 0

        for await (const b of new BlocksMegaArray(d, p1, p2)) {
            const relativePos = {
                x: b.location.x - anchor.x,
                y: b.location.y - anchor.y,
                z: b.location.z - anchor.z,
            }
            const relKey = `${relativePos.x},${relativePos.y},${relativePos.z}`

            if (saveAnchors && b.typeId === ACSS_FORCE_ANCHOR_BLOCK) {
                if (!forceAnchor) {
                    forceAnchor = relativePos
                } else {
                    console.warn(`saveACSS: multiple ${ACSS_FORCE_ANCHOR_BLOCK} blocks found, using the first one`)
                    try {
                        player?.sendMessage(`§eWarning: multiple acss_anchor blocks found, using the first one`)
                    } catch { }
                }
                const idx = collectBlockByData('structure_void', undefined, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex)
                blockMap.set(relKey, idx)
                blockPos++
                continue
            }

            const idx = collectBlockFromWorld(b, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex)
            blockMap.set(relKey, idx)
            blockPos++

            if (lootChests && isLootContainerBlock(b.typeId)) {
                const loot = readLootPathFromContainerBlock(b)
                if (loot) {
                    lootChests.push({
                        x: relativePos.x,
                        y: relativePos.y,
                        z: relativePos.z,
                        loot,
                    })
                }
            }
        }

        if (blockPos !== volume) {
            console.warn(`saveACSS: expected ${volume} blocks, scanned ${blockPos}`)
        }

        const pkPal = buildSymbolPalette(pkSet)
        const pvPal = buildSymbolPalette(pvSet)
        const symPerBlock = symbolsPerBlock(uniqueBlocks.length)
        acss.head.spb = symPerBlock

        for (let i = 0; i < uniqueBlocks.length; i++) {
            const { id, perms } = uniqueBlocks[i]
            const sym = indexToSymbol(i, PALETTE_ALPHABET, symPerBlock)
            acss.palette[sym] = encodeBlockEntry(id, perms, pkPal.reverse, pvPal.reverse)
        }

        if (Object.keys(pkPal.palette).length) acss.pk = pkPal.palette
        if (Object.keys(pvPal.palette).length) acss.pv = pvPal.palette

        const { axisOrder, b3d } = pickBestAcssAxisOrder(blockMap, acss.head.s, symPerBlock, ultraCompact)
        acss.b3d = b3d
        if (axisOrder !== BMA_DEFAULT_AXIS_ORDER) acss.head.a = axisOrder

        if (lootChests?.length) acss.lootChests = lootChests
        if (saveAnchors && forceAnchor) acss.force_anchor = forceAnchor

        if (saveEntities) {
            const entityList = collectStructureEntities(d, anchor, corner)
            const entities = encodeStructureEntities(entityList)
            if (entities) {
                acss.entities = entities
                acss.head.spe = entities.spe
                delete entities.spe
            }
        }

        return acss2str(acss)
    } catch (error) {
        console.error(`[StructureBuilder] saveACSS: ${error}`)
        return null
    }
}

/**
 * @param {{x:number,y:number,z:number}} position — world position of the placement anchor
 * @param {object} [applyDenyBlocks] — if omitted, deny/allow planes are not placed
 * @param {number} [applyDenyBlocks.marginBelow=0] — extra blocks down from directly under the footprint (0 = y min−1)
 * @param {number} [applyDenyBlocks.marginXZ=0] — expand XZ rectangle on each side
 * @param {boolean} [applyDenyBlocks.allowAbove=false] — same-size allow plane flush above structure (y max+1)
 * @param {ACSSPlacement} [placement='corner'] — 'corner' (default): position = min corner; 'center': position = structure center; or custom {x,y,z} offset from min corner.
 * If ACSS has force_anchor, position is treated as that anchor and this param is ignored.
 */
export async function loadACSS(rawACSS, d, position, applyDenyBlocks, placement = 'corner') {

    // === ACSS validation ===
    // Validate ACSS JSON
    let acss = undefined
    try {
        acss = str2acss(rawACSS)
    }
    catch (error) {
        console.warn(`§cACSS fatal error: ${error}.\nACSS loading aborted`)
        return null
    }
    // ACSS basic check
    if (!acss) {
        console.warn('§cACSS error: No ACSS')
        return null
    }
    // Validate headers
    const version = acss.head?.v
    if (version !== ACSS_VERSION) {
        console.warn(`§cACSS error: unsupported version ${version}, expected ${ACSS_VERSION}`)
        return null
    }
    const size = acss.head?.s
    if (!size || typeof size !== 'object' || size.length !== 3 || size.some(n => n <= 0)) {
        console.warn('§cACSS error: Incorrect 3Darray size in provided ACSS')
        return null
    }
    const symPerBlock = acss.head?.spb
    if (!symPerBlock || typeof symPerBlock !== 'number' || symPerBlock < 1) {
        console.warn('§cACSS error: Incorrect SymbolsPerBlock in provided ACSS')
        return null
    }

    // Validate palette
    const palette = acss.palette
    if (!palette || typeof palette !== 'object') {
        console.warn('§cACSS error: Incorrect palette in provided ACSS')
        return null
    }

    const pk = acss.pk ?? {}
    const pv = acss.pv ?? {}
    if (typeof pk !== 'object' || typeof pv !== 'object') {
        console.warn('§cACSS error: invalid pk or pv palettes')
        return null
    }

    // Validate b3d
    const blocks3D = acss.b3d
    if (!blocks3D || typeof blocks3D !== 'string') {
        console.warn('§cACSS error: Incorrect blocks3D in provided ACSS')
        return null
    }

    const forceAnchor = parseForceAnchor(acss.force_anchor, size)
    const effectivePlacement = forceAnchor ?? placement
    const { p1, p2 } = resolveACSSPlacement(position, size, effectivePlacement)
    const axisOrder = resolveAcssAxisOrder(acss.head)

    // Validate world borders fitting
    const worldBorders = d.heightRange
    if (worldBorders.min > p1.y || worldBorders.max < p2.y) {
        console.warn('§cACSS error: Trying to place a ACSS beyond the world borders')
        return null
    }

    // Unwind b3d RLE
    const fullb3d = RLE.decode(blocks3D, symPerBlock)

    // Validate volume 
    const defactoVolume = fullb3d.length / symPerBlock // Volume in blocks
    const expectedVolume = size[0] * size[1] * size[2]

    if (defactoVolume !== expectedVolume) {
        console.warn(`§cACSS error: expected b3d volume (${expectedVolume}) doesn't match with its defacto volume (${defactoVolume})`)
        return null
    }

    try {
        let blockIndex = 0
        for await (const b of new BlocksMegaArray(d, p1, p2, { forceAxisOrder: axisOrder })) {
            const offset = blockIndex * symPerBlock
            const blockKey = fullb3d.slice(offset, offset + symPerBlock)
            const blockDataRaw = acss.palette[blockKey]
            const bd = decodeBlockEntry(blockDataRaw, pk, pv)
            applyBlockFromACSS(b, bd)
            blockIndex++
        }

        const anchor = getStructureAnchor(p1, p2)

        if (applyDenyBlocks != null) {
            await applyStructureDenyAllowPlanes(d, p1, p2, applyDenyBlocks)
        }

        await applyStructureChestLoot(d, anchor, p2, acss.lootChests)
        spawnStructureEntities(d, anchor, acss.entities)
    } catch (error) {
        console.error(`[StructureBuilder] loadACSS: ${error}`)
        return null
    }
}

/** Deny under structure; optional allow flush on top (separate BlocksMegaArray pass). */
async function applyStructureDenyAllowPlanes(d, p1, p2, cfg) {
    try {
        const marginBelow = Number(cfg.marginBelow ?? 0)
        const marginXZ = Number(cfg.marginXZ ?? 0)
        const allowAbove = !!cfg.allowAbove

        const bounds = getStructureBounds(p1, p2)
        const planeMinX = bounds.minX - marginXZ
        const planeMaxX = bounds.maxX + marginXZ
        const planeMinZ = bounds.minZ - marginXZ
        const planeMaxZ = bounds.maxZ + marginXZ
        const denyY = bounds.minY - 1 - marginBelow
        const allowY = bounds.maxY + 1
        const { min: worldMin, max: worldMax } = d.heightRange

        if (denyY >= worldMin && denyY <= worldMax) {
            await placeStructureBlockPlane(d, planeMinX, denyY, planeMinZ, planeMaxX, planeMaxZ, 'minecraft:deny')
        }

        if (allowAbove && allowY >= worldMin && allowY <= worldMax) {
            await placeStructureBlockPlane(d, planeMinX, allowY, planeMinZ, planeMaxX, planeMaxZ, 'minecraft:allow')
        }
    } catch (error) {
        console.error(`[StructureBuilder] applyStructureDenyAllowPlanes: ${error}`)
    }
}

async function placeStructureBlockPlane(d, minX, y, minZ, maxX, maxZ, blockId) {
    const p1 = { x: minX, y, z: minZ }
    const p2 = { x: maxX, y, z: maxZ }
    for await (const b of new BlocksMegaArray(d, p1, p2)) {
        b.setType(blockId)
    }
}

function indexToSymbol(index, alphabet, fixedLen) {
    let sym = ''
    const base = alphabet.length

    for (let i = 0; i < fixedLen; i++) {
        sym = alphabet[index % base] + sym;
        index = Math.floor(index / base);
    }

    return sym
}

function getCoordinatesString(coords) {
    if (coords) {
        return Object.values(coords).join(', ')
    }
    else return 'Not set'
}