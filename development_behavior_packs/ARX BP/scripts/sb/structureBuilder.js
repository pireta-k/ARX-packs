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
                        yield this.dimension.getBlock({ x: x, y: y, z: z })
                        // await sleep(1)
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
            this.delTick() // Remove old tickingArea, if there was a bug and it wasn't unloaded
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

        form.body(body)

        // Buttons
        if (hasAllPoints) {
            form.button('Delete blocks')
            form.button('Fill with block')
            form.button('Replace blocks')
            form.button('Save ACSS') // ACSS is Arx Compressed Structure String
            form.button('Load ACSS')
        }

        form.show(p).then(async r => {
            switch (r.selection) {
                case 0: // Delete blocks
                    p.sendMessage(`§bDeleting... (${volume} blocks)`)
                    for await (const b of new BlocksMegaArray(d, point1, point2)) {
                        try {
                            b.setType('minecraft:air')
                        }
                        catch {

                        }
                    }
                    p.sendMessage('§bCompleted')
                    break

                case 1: // Fill blocks
                    const formFill = new ModalFormData()
                        .title("Fill with block")
                        .textField(`Enter a block ID`, "namespace:id")
                        .submitButton('Fill')

                        .show(p).then(async r => {

                            if (r.formValues) {

                                p.sendMessage(`§bFilling... (${volume} blocks)`)
                                const blockId = r.formValues[0].trim()

                                for await (const b of new BlocksMegaArray(d, point1, point2)) {
                                    try {
                                        b.setType(blockId)
                                    }
                                    catch (error) {
                                        p.sendMessage(`§cError. Probably "${blockId}" isn't an id of an actual block`)
                                        break
                                    }
                                }
                                p.sendMessage('§bCompleted')
                            }
                        })
                    break

                case 2: // Replace blocks
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

                                for await (const b of new BlocksMegaArray(d, point1, point2)) {
                                    try {
                                        if (b.typeId === block2ReplaceId) {
                                            b.setType(block2SetId)
                                            replaced++
                                        }
                                    }
                                    catch (error) {
                                        p.sendMessage(`§cError. Probably "${blockId}" isn't an id of an actual block`)
                                        break
                                    }
                                }
                                p.sendMessage(`§bCompleted, (replaced ${replaced} blocks)`)
                            }
                        })
                    break

                case 3: // Save ACSS
                    p.sendMessage(`§bSaving... (${volume} blocks)`)
                    const acss = await saveACSS(d, point1, point2)
                    const ACSSSaveForm = new ActionFormData()
                        .title("Save ACSS")
                        .button('Save in log')
                        .button('Save in RAM')
                        .button('Save in DP')
                    ACSSSaveForm.show(p).then(async r2 => {
                        switch (r2.selection) {

                            case 0:
                                console.warn(acss)
                                p.sendMessage('§bACSS sent to log')
                                break

                            case 1:
                                ACSSStorage[gDP(p, 'id')] = acss
                                p.sendMessage('§bACSS saved in RAM')
                                break

                            case 2:
                                let DP2SaveACSS = undefined
                                const ACSSSave2DPForm = new ModalFormData()
                                    .title("Save ACSS to DP")
                                    .textField(`Enter DP name`, "any")
                                    .submitButton('Save')

                                await ACSSSave2DPForm.show(p).then(async r => {

                                    if (r.formValues) {
                                        DP2SaveACSS = r.formValues[0].trim()
                                    }
                                })
                                ssDP(p, DP2SaveACSS, acss)
                                p.sendMessage('§bACSS saved in DP')
                                break
                        }
                    })
                    break

                case 4: // Load ACSS
                    let acssJSON = ''

                    const ACSSLoadForm = new ActionFormData()
                        .title("Load ACSS")
                        .button('Load from RAM')
                        .button('Load from DP')
                    await ACSSLoadForm.show(p).then(async r2 => {
                        switch (r2.selection) {

                            case 0:
                                acssJSON = ACSSStorage[gDP(p, 'id')]
                                break

                            case 1:
                                const ACSSLoadFromDPForm = new ModalFormData()
                                    .title("Load ACSS from DP")
                                    .textField(`Enter DP name`, "any")
                                    .submitButton('Load')

                                await ACSSLoadFromDPForm.show(p).then(async r => {

                                    if (r.formValues) {
                                        const responce = r.formValues[0].trim()
                                        acssJSON = gDP(p, responce)
                                    }
                                })
                                break
                        }
                    })

                    if (!acssJSON) {
                        p.sendMessage('§cCannot get ACSS this way. Aborted.')
                        return null
                    }
                    p.sendMessage(`§bLoading ACSS...`)
                    await loadACSS(acssJSON, d, point1)
                    p.sendMessage('§bACSS loaded')
                    break
            }
        })
    }
}

async function saveACSS(d, p1, p2) {
    // ACSS obj
    let acss = {
        head: {},
        palette: {},
        b3d: ''
    }
    // Basic headers
    acss.head = {
        v: 1, // Version
        s: [ // Size
            Math.abs(p1.x - p2.x) + 1,
            Math.abs(p1.y - p2.y) + 1,
            Math.abs(p1.z - p2.z) + 1,
        ]
    }

    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    let uniqueBlockDatas = [] // Unique blocks array
    let blocks3DArray = ''

    // Get unique arrays of blocks 
    for await (const b of new BlocksMegaArray(d, p1, p2)) {

        const bd = blockData(b)
        if (!uniqueBlockDatas.includes(bd)) {
            uniqueBlockDatas.push(bd)
        }

    }

    // Create palette
    const differentBlocks = uniqueBlockDatas.length
    const symPerBlock = Math.ceil(Math.log(differentBlocks + 1) / Math.log(alphabet.length)) || 1
    acss.head.spb = symPerBlock // Remember

    let palette = {} // Blocks palette KEY = BLOCKDATA
    let paletteReverse = {} // Same as palette, but key - value are switched
    for (let i = 0; i < differentBlocks; i++) {
        const key = indexToSymbol(i, alphabet, symPerBlock)
        palette[key] = uniqueBlockDatas[i]
        paletteReverse[uniqueBlockDatas[i]] = key
    }
    acss.palette = palette

    // make 3D array
    {
        for await (const b of new BlocksMegaArray(d, p1, p2)) {
            blocks3DArray += paletteReverse[blockData(b)]
        }
        // Apply RLE
        blocks3DArray = RLE(blocks3DArray, 'compress', symPerBlock)
    }

    // Write to body
    acss.b3d = blocks3DArray

    const resultJSON = obj2str(acss)
    return resultJSON
}

export async function loadACSS(acssJSON, d, p1) {

    // === ACSS validation ===
    // Validate ACSS JSON
    let acss = undefined
    try {
        acss = str2obj(acssJSON)
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
    if (!version || typeof version !== "number") {
        console.warn('§cACSS error: No version data in provided ACSS')
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

    // Validate b3d
    const blocks3D = acss.b3d
    if (!blocks3D || typeof blocks3D !== 'string') {
        console.warn('§cACSS error: Incorrect blocks3D in provided ACSS')
        return null
    }

    // Get the 2nd point (max at every axis)
    const p2 = {
        x: p1.x + size[0] - 1,
        y: p1.y + size[1] - 1,
        z: p1.z + size[2] - 1
    }

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

    // Set blocks
    let blockIndex = 0
    for await (const b of new BlocksMegaArray(d, p1, p2)) {
        const offset = blockIndex * symPerBlock
        // Get block key in palette
        const blockKey = fullb3d.slice(offset, offset + symPerBlock)
        // Get block data
        const blockDataRaw = acss.palette[blockKey]
        const bd = blockData(blockDataRaw, 'decompress')
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
}

// Compress block id. Mode: compress / decompress
function blockData(b, mode = 'compress') {
    let result
    if (mode === 'compress') { // Compress (Get string from block object)
        // No block given
        if (!b.isValid) {
            console.error('blockData(): compress mode requires a valid block. Function aborted')
            return 'ERROR'
        }
        // ID
        if (b.typeId.startsWith('minecraft:')) {
            result = b.typeId.slice(10)
        } else {
            result = b.typeId
        }
        // Permutations
        let perms = b.permutation.getAllStates() // Get
        if (Object.keys(perms).length !== 0) {  // If block has any permutations

            // Write in result
            result = result + '<' + JSON.stringify(perms).replace(/"/g, "'")
        }
    }
    else { // Decompress (Get object from string)
        result = {}
        // 0 - id, 1 - permutations
        const data = b.split('<')
        result.id = data[0]

        if (data.length > 1) { // We have permutations
            result.perms = JSON.parse(data[1].replace(/'/g, '"'))
        }
    }

    return result
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