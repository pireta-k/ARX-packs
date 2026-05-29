import { world, system } from "@minecraft/server"
import { checkForItem } from "../items/checkForItem"
import { gDP, ssDP } from "../arxLib/DPOperations"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import { obj2str, str2obj } from "../arxLib/converters"
import { validateTickingAreaLoading } from "./prospect"
import { sleep } from "../arxLib/time"

let ACSSStorage = {}

// StructureBuilder namespace - sb

// Catch player's intercations with blocks
world.afterEvents.playerSwingStart.subscribe((event) => {
    const p = event.player
    const b = p.getBlockFromViewDirection()?.block

    if (b && checkForItem(p, "mainhand", 'arx:structurebuilder_hammer')) {
        try {
            ssDP(p, `sb:point1`, b.location)
            p.sendMessage(`Saved §aPoint 1`)
        }
        catch { } // Block is too far away
    }
})

const defaultCoords = { x: 0, y: 0, z: 0 }

const SB_UI_ICON = 'textures/ui/sb/'

const RECURSIVE_DELETE_LIMIT = 8000
/** Max region volume for full-region undo snapshot (delete / fill) */
const UNDO_MAX_VOLUME = 120000

/** @type {Map<string, { dimensionId: string, blocks: { x: number, y: number, z: number, id: string, perms?: object }[] }>} */
const sbUndoByPlayer = new Map()
const FACE_NEIGHBOR_OFFSETS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
]

function blockLocKey(x, y, z) {
    return `${x}|${y}|${z}`
}

function getSbUndoPlayerKey(p) {
    return String(gDP(p, 'id') ?? p.id)
}

function captureBlockForUndo(b) {
    const loc = b.location
    const states = b.permutation.getAllStates()
    const perms = {}
    let hasPerms = false
    for (const k in states) {
        if (states[k] !== undefined) {
            perms[k] = states[k]
            hasPerms = true
        }
    }
    return {
        x: loc.x,
        y: loc.y,
        z: loc.z,
        id: b.typeId,
        perms: hasPerms ? perms : undefined,
    }
}

function setSbUndo(p, dimension, blocks) {
    if (!blocks.length) return
    sbUndoByPlayer.set(getSbUndoPlayerKey(p), {
        dimensionId: dimension.id,
        blocks,
    })
}

function restoreUndoBlock(d, entry) {
    const block = d.getBlock({ x: entry.x, y: entry.y, z: entry.z })
    block.setType(entry.id)
    if (entry.perms) {
        for (const perm in entry.perms) {
            block.setPermutation(block.permutation.withState(perm, entry.perms[perm]))
        }
    }
}

async function applySbUndo(p) {
    try {
    const snap = sbUndoByPlayer.get(getSbUndoPlayerKey(p))
    if (!snap) {
        p.sendMessage('§cNothing to undo')
        return false
    }

    const d = p.dimension
    if (d.id !== snap.dimensionId) {
        p.sendMessage('§cUndo is for another dimension — go back or run a new operation')
        return false
    }

    p.sendMessage(`§bUndo... (${snap.blocks.length} blocks)`)
    let restored = 0
    for (const entry of snap.blocks) {
        try {
            restoreUndoBlock(d, entry)
            restored++
        } catch { }
    }

    sbUndoByPlayer.delete(getSbUndoPlayerKey(p))
    p.sendMessage(`§bUndo done`)
    return true
    } catch (error) {
        console.error(`[StructureBuilder] applySbUndo: ${error}`)
        return false
    }
}

/**
 * Flood-delete blocks with the same typeId as the seed at start (6 face neighbors only).
 * @returns {{ deleted: number, limitHit: boolean, targetId: string | null, undoBlocks: object[] }}
 */
function recursiveDeleteSameBlocks(d, start, limit = RECURSIVE_DELETE_LIMIT) {
    const seed = {
        x: Math.floor(start.x),
        y: Math.floor(start.y),
        z: Math.floor(start.z),
    }

    let seedBlock
    try {
        seedBlock = d.getBlock(seed)
    } catch {
        return { deleted: 0, limitHit: false, targetId: null, undoBlocks: [] }
    }

    const targetId = seedBlock.typeId
    if (targetId === 'minecraft:air') {
        return { deleted: 0, limitHit: false, targetId, undoBlocks: [] }
    }

    const visited = new Set()
    const queue = [seed]
    const undoBlocks = []
    let deleted = 0
    let limitHit = false

    while (queue.length > 0 && deleted < limit) {
        const loc = queue.shift()
        const key = blockLocKey(loc.x, loc.y, loc.z)
        if (visited.has(key)) continue
        visited.add(key)

        let block
        try {
            block = d.getBlock(loc)
        } catch {
            continue
        }

        if (block.typeId !== targetId) continue

        try {
            undoBlocks.push(captureBlockForUndo(block))
            block.setType('minecraft:air')
            deleted++
        } catch {
            continue
        }

        if (deleted >= limit) {
            limitHit = true
            break
        }

        for (const o of FACE_NEIGHBOR_OFFSETS) {
            const nx = loc.x + o.x
            const ny = loc.y + o.y
            const nz = loc.z + o.z
            const nKey = blockLocKey(nx, ny, nz)
            if (!visited.has(nKey)) {
                queue.push({ x: nx, y: ny, z: nz })
            }
        }
    }

    return { deleted, limitHit, targetId, undoBlocks }
}

class BlocksMegaArray {
    constructor(dimension, pos1, pos2) {
        if (!dimension || typeof pos1 !== "object" || typeof pos2 !== "object") {
            console.warn('Trying to create BlocksMegaArray with irrelevant positions')
        }

        this.dimension = dimension

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

    // Itearator. Iterates by megachunks
    // Megachunk is a 3D mass of blocks with x size = 32, y size = world hight, z size = 32
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

            // Iterate and yield blocks
            for (let y = activeArea.max.y; y >= activeArea.min.y; y--) {
                for (let x = activeArea.min.x; x <= activeArea.max.x; x++) {
                    for (let z = activeArea.min.z; z <= activeArea.max.z; z++) {
                        yield this.dimension.getBlock({ x, y, z })
                    }
                }
            }
            await chunk.delTick()
        }
    }

    // MegaChunk class
    static MegaChunk = class {
        constructor(posX, posZ, parent) {
            this.parent = parent
            this.relPos = { x: posX, z: posZ } // Relative to Mega Array position
            this.absPos = { x: this.parent.anchor.x + this.relPos.x, z: this.parent.anchor.z + this.relPos.z } // Absolute
            this.height = { min: this.parent.anchor.y, max: this.parent.top.y }
        }

        // Start ticking
        async startTick() {
            await this.delTick()
            await validateTickingAreaLoading(this.parent.dimension, { x: this.absPos.x, z: this.absPos.z }, { x: this.absPos.x + 31, z: this.absPos.z + 31 }, 'sb')
        }

        // Delete ticking
        async delTick() {
            this.parent.dimension.runCommand(`tickingarea remove sb`)
            await sleep(1)
        }
    }
}

// Use hammer (Right-click)
export async function onUseSBHammer(p) {
    const sneaking = p.inputInfo.getButtonState("Sneak") === 'Pressed'
    if (!sneaking) { // Save point
        const b = p.getBlockFromViewDirection()?.block
        try {
            ssDP(p, `sb:point2`, b.location)
            p.sendMessage(`Saved §cPoint 2`)
        }
        catch { } // Block is too far away
    }
    else {

        const point1 = gDP(p, 'sb:point1') ?? defaultCoords
        const point2 = gDP(p, 'sb:point2') ?? defaultCoords
        const hasAllPoints = point1 && point2
        const d = p.dimension

        // Form for player
        const form = new ActionFormData()

        form.title('StructureBuilder options')
        let body = '§aPoint 1§f: ' + getCoordinatesString(point1) + '\n' + '§cPoint 2§f: ' + getCoordinatesString(point2)

        const dx = Math.abs(point1.x - point2.x) + 1
        const dy = Math.abs(point1.y - point2.y) + 1
        const dz = Math.abs(point1.z - point2.z) + 1

        const minX = Math.min(point1.x, point2.x)
        const minY = Math.min(point1.y, point2.y)
        const minZ = Math.min(point1.z, point2.z)

        const volume = dx * dy * dz

        body += "\n§bVolume§f: " + volume + ' blocks'
        if (sbUndoByPlayer.has(getSbUndoPlayerKey(p))) {
            body += '\n§dUndo: ready (last operation)'
        }

        form.body(body)

        // Buttons
        if (hasAllPoints) {
            form.button('Delete blocks', `${SB_UI_ICON}delete_blocks`)
            form.button('Recursive delete blocks', `${SB_UI_ICON}delete_blocks_recursive`)
            form.button('Fill with block', `${SB_UI_ICON}fill`)
            form.button('Replace blocks', `${SB_UI_ICON}replace`)
            form.button('Save ACSS', `${SB_UI_ICON}save_acss`)
            form.button('Load ACSS', `${SB_UI_ICON}load_acss`)
            form.button('Undo')
        }

        form.show(p).then(async r => {
            switch (r.selection) {
                case 0: // Delete blocks
                    {
                        const canUndo = volume <= UNDO_MAX_VOLUME
                        const undoBlocks = canUndo ? [] : null
                        p.sendMessage(`§bDeleting... (${volume} blocks)`)
                        for await (const b of new BlocksMegaArray(d, point1, point2)) {
                            try {
                                if (undoBlocks) undoBlocks.push(captureBlockForUndo(b))
                                b.setType('minecraft:air')
                            }
                            catch { }
                        }
                        if (undoBlocks?.length) setSbUndo(p, d, undoBlocks)
                        else if (!canUndo) p.sendMessage(`§eUndo not saved (volume > ${UNDO_MAX_VOLUME})`)
                        p.sendMessage('§bCompleted')
                    }
                    break

                case 1: // Recursive delete (flood fill from Point 1, same block id)
                    {
                        const { deleted, limitHit, targetId, undoBlocks } = recursiveDeleteSameBlocks(d, point1)
                        if (!targetId || targetId === 'minecraft:air') {
                            p.sendMessage('§cPoint 1 is air or unreachable — nothing deleted')
                            break
                        }
                        if (undoBlocks.length) setSbUndo(p, d, undoBlocks)
                        let msg = `§bRecursive delete: ${deleted} × ${targetId}`
                        if (limitHit) msg += ` §e(limit ${RECURSIVE_DELETE_LIMIT})`
                        p.sendMessage(msg)
                    }
                    break

                case 2: // Fill blocks
                    const formFill = new ModalFormData()
                        .title("Fill with block")
                        .textField(`Enter a block ID`, "namespace:id")
                        .submitButton('Fill')

                        .show(p).then(async r => {

                            if (r.formValues) {

                                p.sendMessage(`§bFilling... (${volume} blocks)`)
                                const blockId = r.formValues[0].trim()
                                const canUndo = volume <= UNDO_MAX_VOLUME
                                const undoBlocks = canUndo ? [] : null
                                let fillOk = true

                                for await (const b of new BlocksMegaArray(d, point1, point2)) {
                                    try {
                                        if (undoBlocks) undoBlocks.push(captureBlockForUndo(b))
                                        b.setType(blockId)
                                    }
                                    catch (error) {
                                        p.sendMessage(`§cError. Probably "${blockId}" isn't an id of an actual block`)
                                        fillOk = false
                                        break
                                    }
                                }
                                if (fillOk && undoBlocks?.length) setSbUndo(p, d, undoBlocks)
                                else if (fillOk && !canUndo) p.sendMessage(`§eUndo not saved (volume > ${UNDO_MAX_VOLUME})`)
                                if (fillOk) p.sendMessage('§bCompleted')
                            }
                        })
                    break

                case 3: // Replace blocks
                    const formReplace = new ModalFormData()
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
                                if (replaceOk) p.sendMessage(`§bCompleted, (replaced ${replaced} blocks)`)
                            }
                        })
                    break

                case 4: // Save ACSS
                    const saveAcssOptions = await showSaveACSSOptionsForm(p)
                    if (!saveAcssOptions) break

                    p.sendMessage(`§bSaving... (${volume} blocks)`)
                    const acss = await saveACSS(d, point1, point2, saveAcssOptions)
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

                                ssDP(p, dpName, acss)
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
                                        const responce = r.formValues[0].trim()
                                        rawACSS = gDP(p, responce)
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

const ACSS_VERSION = 2
const PALETTE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
const ACSS_FORCE_ANCHOR_BLOCK = 'arx:acss_anchor'

// Chest slot 0: renamed paper → loot table path (matches /loot insert … loot "path")
// Example nameTag: chests/test

const LOOT_CONTAINER_BLOCKS = new Set([
    'minecraft:chest',
    'minecraft:trapped_chest',
    'minecraft:barrel',
])

const IGNORED_ENTITY_TYPES = new Set([
    'minecraft:player',
    'minecraft:item',
])

function stripMinecraftNamespace(typeId) {
    return typeId.startsWith('minecraft:') ? typeId.slice(10) : typeId
}

function getStructureBounds(p1, p2) {
    return {
        minX: Math.min(p1.x, p2.x),
        maxX: Math.max(p1.x, p2.x),
        minY: Math.min(p1.y, p2.y),
        maxY: Math.max(p1.y, p2.y),
        minZ: Math.min(p1.z, p2.z),
        maxZ: Math.max(p1.z, p2.z),
    }
}

function getStructureAnchor(p1, p2) {
    const b = getStructureBounds(p1, p2)
    return { x: b.minX, y: b.minY, z: b.minZ }
}

/** @typedef {'corner'|'center'|{x:number,y:number,z:number}} ACSSPlacement */

export const ACSS_PLACEMENT = {
    CORNER: 'corner',
    CENTER: 'center',
}

/**
 * Maps world position + placement anchor to structure bounds (p1 = min corner, p2 = max corner).
 * ACSS block indices are always relative to p1 (min corner).
 * @param {{x:number,y:number,z:number}} position — world coords of the placement anchor
 * @param {number[]} size — [sx, sy, sz] from ACSS head
 * @param {ACSSPlacement} [placement='corner']
 */
export function resolveACSSPlacement(position, size, placement = 'corner') {
    let anchorOffset

    if (placement === 'center') {
        anchorOffset = {
            x: Math.floor((size[0] - 1) / 2),
            y: Math.floor((size[1] - 1) / 2),
            z: Math.floor((size[2] - 1) / 2),
        }
    } else if (placement === 'corner') {
        anchorOffset = { x: 0, y: 0, z: 0 }
    } else if (typeof placement === 'object' && placement !== null) {
        anchorOffset = {
            x: Math.floor(placement.x ?? 0),
            y: Math.floor(placement.y ?? 0),
            z: Math.floor(placement.z ?? 0),
        }
    } else {
        console.warn(`resolveACSSPlacement: unknown placement "${placement}", using corner`)
        anchorOffset = { x: 0, y: 0, z: 0 }
    }

    const p1 = {
        x: Math.floor(position.x) - anchorOffset.x,
        y: Math.floor(position.y) - anchorOffset.y,
        z: Math.floor(position.z) - anchorOffset.z,
    }
    const p2 = {
        x: p1.x + size[0] - 1,
        y: p1.y + size[1] - 1,
        z: p1.z + size[2] - 1,
    }

    return { p1, p2, anchorOffset }
}

function parseForceAnchor(forceAnchor, size) {
    if (!forceAnchor || typeof forceAnchor !== 'object') return null

    const x = Math.floor(forceAnchor.x)
    const y = Math.floor(forceAnchor.y)
    const z = Math.floor(forceAnchor.z)
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null

    if (x < 0 || y < 0 || z < 0 || x >= size[0] || y >= size[1] || z >= size[2]) {
        console.warn(`ACSS: force_anchor is outside structure bounds (${x}, ${y}, ${z})`)
        return null
    }

    return { x, y, z }
}

function isInsideStructureBounds(loc, bounds) {
    return (
        loc.x >= bounds.minX && loc.x <= bounds.maxX &&
        loc.y >= bounds.minY && loc.y <= bounds.maxY &&
        loc.z >= bounds.minZ && loc.z <= bounds.maxZ
    )
}

function stripEntityTypeId(typeId) {
    if (IGNORED_ENTITY_TYPES.has(typeId)) return null
    return stripMinecraftNamespace(typeId)
}

function resolveEntityTypeId(id) {
    if (id.includes(':')) return id
    return `minecraft:${id}`
}

function collectStructureEntities(d, anchor, p2) {
    const bounds = getStructureBounds(anchor, p2)
    const list = []

    for (const entity of d.getEntities()) {
        if (!entity?.isValid) continue
        if (!isInsideStructureBounds(entity.location, bounds)) continue

        const id = stripEntityTypeId(entity.typeId)
        if (!id) continue

        list.push({
            x: Math.floor(entity.location.x) - anchor.x,
            y: Math.floor(entity.location.y) - anchor.y,
            z: Math.floor(entity.location.z) - anchor.z,
            id,
        })
    }

    return list
}

function encodeStructureEntities(entityList) {
    if (!entityList.length) return undefined

    const uniqueIds = [...new Set(entityList.map((e) => e.id))].sort()
    const epPal = buildSymbolPalette(uniqueIds)
    const emap = entityList.map((e) => {
        const sym = epPal.reverse.get(e.id)
        return `${e.x},${e.y},${e.z},${sym}`
    }).join('|')

    return {
        ep: epPal.palette,
        emap,
        spe: epPal.spb,
    }
}

function spawnStructureEntities(d, anchor, entitiesData) {
    if (!entitiesData?.emap || !entitiesData.ep) return

    for (const entry of entitiesData.emap.split('|')) {
        if (!entry) continue
        const parts = entry.split(',')
        if (parts.length < 4) continue

        const sym = parts.pop()
        const z = Number(parts.pop())
        const y = Number(parts.pop())
        const x = Number(parts.pop())
        const typeId = resolveEntityTypeId(entitiesData.ep[sym])
        if (!typeId) continue

        d.spawnEntity(typeId, {
            x: anchor.x + x + 0.5,
            y: anchor.y + y,
            z: anchor.z + z + 0.5,
        })
    }
}

function permValueKey(v) {
    return JSON.stringify(v)
}

/** Drops undefined state values (Bedrock getAllStates() may include them) */
function normalizePerms(perms) {
    if (!perms) return undefined
    const out = {}
    for (const k in perms) {
        if (perms[k] !== undefined) out[k] = perms[k]
    }
    return Object.keys(out).length ? out : undefined
}

function symbolsPerBlock(count) {
    return Math.ceil(Math.log(Math.max(count, 1) + 1) / Math.log(PALETTE_ALPHABET.length)) || 1
}

/** @param {Iterable} uniqueValues */
function buildSymbolPalette(uniqueValues) {
    const sorted = [...uniqueValues].filter((v) => v !== undefined)
    if (sorted.length && typeof sorted[0] === 'string') {
        sorted.sort()
    } else {
        sorted.sort((a, b) => permValueKey(a).localeCompare(permValueKey(b)))
    }

    const spb = symbolsPerBlock(sorted.length)
    const palette = {}
    const reverse = new Map()

    sorted.forEach((val, i) => {
        const sym = indexToSymbol(i, PALETTE_ALPHABET, spb)
        palette[sym] = val
        const revKey = typeof val === 'string' ? val : permValueKey(val)
        reverse.set(revKey, sym)
    })

    return { palette, reverse, spb }
}

function blockCanonKey(id, perms) {
    if (!perms || Object.keys(perms).length === 0) return id
    const sorted = {}
    for (const k of Object.keys(perms).sort()) sorted[k] = perms[k]
    return `${id}<${JSON.stringify(sorted)}>`
}

function encodeBlockEntry(id, perms, pkReverse, pvReverse) {
    const idShort = stripMinecraftNamespace(id)
    if (!perms || Object.keys(perms).length === 0) return idShort

    const pairs = []
    for (const key of Object.keys(perms).sort()) {
        const val = perms[key]
        if (val === undefined) continue
        const sk = pkReverse.get(key)
        const sv = pvReverse.get(permValueKey(val))
        if (!sk || !sv) continue
        pairs.push(`'${sk}':'${sv}'`)
    }
    if (!pairs.length) return idShort
    return `${idShort}<{${pairs.join(',')}}`
}

function decodeBlockEntry(raw, pk, pv) {
    const lt = raw.indexOf('<')
    if (lt === -1) {
        return { id: raw, perms: undefined }
    }

    const id = raw.slice(0, lt)
    let permPart = raw.slice(lt + 1)
    if (permPart.endsWith('>')) permPart = permPart.slice(0, -1)

    if (!permPart.startsWith('{')) {
        console.warn(`ACSS: malformed block entry "${raw}"`)
        return { id, perms: undefined }
    }

    const symPerms = JSON.parse(permPart.replace(/'/g, '"'))
    const perms = {}

    for (const sk in symPerms) {
        if (!(sk in pk) || !(symPerms[sk] in pv)) continue
        perms[pk[sk]] = pv[symPerms[sk]]
    }

    return { id, perms: Object.keys(perms).length ? perms : undefined }
}

function isLootContainerBlock(typeId) {
    return LOOT_CONTAINER_BLOCKS.has(typeId)
}

function sanitizeLootTablePath(path) {
    const cleaned = path.trim().replace(/^loot\s+/i, '').replace(/"/g, '')
    if (!cleaned || !/^[a-z0-9_./-]+$/i.test(cleaned)) return null
    return cleaned
}

function parseLootPathFromPaperItem(item) {
    if (!item || item.typeId !== 'minecraft:paper') return null
    const tag = item.nameTag?.trim()
    if (!tag) return null
    return sanitizeLootTablePath(tag)
}

function readLootPathFromContainerBlock(block) {
    const container = block.getComponent('minecraft:inventory')?.container
    if (!container) return null
    return parseLootPathFromPaperItem(container.getItem(0))
}

function clearContainerSlot0(d, loc) {
    try {
        const block = d.getBlock(loc)
        const container = block?.getComponent('minecraft:inventory')?.container
        if (container) container.setItem(0, undefined)
    } catch { }
}

function fillChestFromLootTable(d, loc, lootPath) {
    const x = Math.floor(loc.x)
    const y = Math.floor(loc.y)
    const z = Math.floor(loc.z)
    try {
        d.runCommand(`loot insert ${x} ${y} ${z} loot "${lootPath}"`)
        clearContainerSlot0(d, { x, y, z })
    } catch { }
}

async function applyStructureChestLoot(d, anchor, p2, lootChests) {
    try {
        await sleep(1)
        const processed = new Set()

        if (lootChests?.length) {
            for (const entry of lootChests) {
                const loc = { x: anchor.x + entry.x, y: anchor.y + entry.y, z: anchor.z + entry.z }
                const key = `${loc.x},${loc.y},${loc.z}`
                if (processed.has(key)) continue
                fillChestFromLootTable(d, loc, entry.loot)
                processed.add(key)
            }
        }

        for await (const b of new BlocksMegaArray(d, anchor, p2)) {
            if (!isLootContainerBlock(b.typeId)) continue
            const key = `${b.location.x},${b.location.y},${b.location.z}`
            if (processed.has(key)) continue
            const loot = readLootPathFromContainerBlock(b)
            if (!loot) continue
            fillChestFromLootTable(d, b.location, loot)
            processed.add(key)
        }
    } catch (error) {
        console.error(`[StructureBuilder] applyStructureChestLoot: ${error}`)
    }
}

/** @returns {number} palette index for this block */
function collectBlockFromWorld(b, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex) {
    const id = stripMinecraftNamespace(b.typeId)
    const perms = normalizePerms(b.permutation.getAllStates())
    return collectBlockByData(id, perms, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex)
}

/** @returns {number} palette index for provided block data */
function collectBlockByData(id, perms, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex) {
    const hasPerms = perms && Object.keys(perms).length > 0

    if (hasPerms) {
        for (const k in perms) {
            pkSet.add(k)
            pvSet.add(perms[k])
        }
    }

    const key = blockCanonKey(id, hasPerms ? perms : undefined)
    let idx = uniqueBlockIndex.get(key)
    if (idx === undefined) {
        idx = uniqueBlocks.length
        uniqueBlockIndex.set(key, idx)
        uniqueBlocks.push({ id, perms: hasPerms ? perms : undefined })
    }
    return idx
}

/** @returns {Promise<{ saveChestLoot: boolean, saveEntities: boolean } | null>} */
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
        .submitButton('Continue')
        .show(p)

    if (response.canceled || !response.formValues) return null

    return {
        saveChestLoot: !!response.formValues[0],
        saveEntities: !!response.formValues[1],
    }
}

/** @param {{ saveChestLoot?: boolean, saveEntities?: boolean }} [options] */
async function saveACSS(d, p1, p2, options = {}) {
    try {
    const saveChestLoot = options.saveChestLoot !== false
    const saveEntities = options.saveEntities !== false
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
    const blockIndices = new Uint32Array(volume)
    const lootChests = saveChestLoot ? [] : null
    let forceAnchor = null
    let blockPos = 0

    for await (const b of new BlocksMegaArray(d, p1, p2)) {
        const relativePos = {
            x: b.location.x - anchor.x,
            y: b.location.y - anchor.y,
            z: b.location.z - anchor.z,
        }

        if (b.typeId === ACSS_FORCE_ANCHOR_BLOCK) {
            if (!forceAnchor) {
                forceAnchor = relativePos
            } else {
                console.warn(`saveACSS: multiple ${ACSS_FORCE_ANCHOR_BLOCK} blocks found, using the first one`)
            }
            blockIndices[blockPos++] = collectBlockByData('structure_void', undefined, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex)
            continue
        }

        blockIndices[blockPos++] = collectBlockFromWorld(b, pkSet, pvSet, uniqueBlocks, uniqueBlockIndex)

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

    let blocks3DArray = ''
    for (let i = 0; i < blockPos; i++) {
        blocks3DArray += indexToSymbol(blockIndices[i], PALETTE_ALPHABET, symPerBlock)
    }
    acss.b3d = RLE(blocks3DArray, 'compress', symPerBlock)

    if (lootChests?.length) acss.lootChests = lootChests
    if (forceAnchor) acss.force_anchor = forceAnchor

    if (saveEntities) {
        const entityList = collectStructureEntities(d, anchor, corner)
        const entities = encodeStructureEntities(entityList)
        if (entities) {
            acss.entities = entities
            acss.head.spe = entities.spe
            delete entities.spe
        }
    }

    return obj2str(acss)
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
        acss = str2obj(rawACSS)
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

    // Validate world borders fitting
    const worldBorders = d.heightRange
    if (worldBorders.min > p1.y || worldBorders.max < p2.y) {
        console.warn('§cACSS error: Trying to place a ACSS beyond the world borders')
        return null
    }

    // Unwind b3d RLE
    const fullb3d = RLE(blocks3D, 'decompress', symPerBlock)

    // Validate volume 
    const defactoVolume = fullb3d.length / symPerBlock // Volume in blocks
    const expectedVolume = size[0] * size[1] * size[2]

    if (defactoVolume !== expectedVolume) {
        console.warn(`§cACSS error: expected b3d volume (${expectedVolume}) doesn't match with its defacto volume (${defactoVolume})`)
        return null
    }

    try {
        let blockIndex = 0
        for await (const b of new BlocksMegaArray(d, p1, p2)) {
            const offset = blockIndex * symPerBlock
            const blockKey = fullb3d.slice(offset, offset + symPerBlock)
            const blockDataRaw = acss.palette[blockKey]
            const bd = decodeBlockEntry(blockDataRaw, pk, pv)
            if (bd.id !== 'structure_void') {
                b.setType(bd.id)
                if (bd.perms) {
                    for (const perm in bd.perms) {
                        const newPermutation = b.permutation.withState(perm, bd.perms[perm])
                        b.setPermutation(newPermutation)
                    }
                }
            }
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

/**
 * RLE для палитры с фиксированной длиной символа
 * @param {string} str - Входная строка
 * @param {'compress'|'decompress'} mode - Режим
 * @param {number} spb - Длина одного символа палитры (из head.spb)
 * @returns {string} - Результат
 */
function RLE(str, mode = 'compress', spb = 1) {
    if (mode === 'decompress') {
        let result = ''
        let i = 0

        while (i < str.length) {
            // 1. Читаем число (повторы)
            let numStr = ''
            while (i < str.length && /\d/.test(str[i])) {
                numStr += str[i]
                i++
            }
            const count = numStr ? parseInt(numStr, 10) : 1

            // 2. Читаем символ ФИКСИРОВАННОЙ длины
            if (i + spb > str.length) {
                console.warn(`RLE: Truncated symbol at pos ${i} (need ${spb}, got ${str.length - i})`)
                break // или throw new Error(...)
            }
            const symbol = str.slice(i, i + spb)
            i += spb

            // 3. Повторяем
            result += symbol.repeat(count)
        }
        return result
    }

    else { // compress
        if (!str || str.length % spb !== 0) {
            console.warn(`RLE: Input length ${str?.length} not divisible by spb=${spb}`)
            return str
        }

        let result = ''
        let i = 0

        while (i < str.length) {
            const symbol = str.slice(i, i + spb)
            let count = 1
            i += spb

            while (i + spb <= str.length && str.slice(i, i + spb) === symbol) {
                count++
                i += spb
            }

            result += (count > 1 ? count : '') + symbol
        }
        return result
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