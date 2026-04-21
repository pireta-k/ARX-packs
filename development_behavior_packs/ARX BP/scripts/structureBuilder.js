import { world, system } from "@minecraft/server"
import { checkForItem } from "./checkForItem"
import { gDP, ssDP } from "./DPOperations"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import { obj2str } from "./converters"

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

const delay = (ticks) => new Promise(resolve => system.runTimeout(resolve, ticks))

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
                max: { x: Math.min(chunk.absPos.x + 32, this.top.x), y: chunk.height.max, z: Math.min(chunk.absPos.z + 32, this.top.z) }
            }

            await chunk.startTick()

            // Iterate and yield blocks
            for (let x = activeArea.min.x; x <= activeArea.max.x; x++) {
                for (let y = activeArea.min.y; y <= activeArea.max.y; y++) {
                    for (let z = activeArea.min.z; z <= activeArea.max.z; z++) {
                        yield this.dimension.getBlock({ x: x, y: y, z: z })
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
            const command = `tickingarea add ${this.absPos.x} ${this.height.min} ${this.absPos.z} ${this.absPos.x + 31} ${this.height.max} ${this.absPos.z + 31} sb true`
            const result = this.parent.dimension.runCommand(command)
            // console.warn('Tickingarea: ', result.successCount)
            await delay(1)
        }

        // Delete ticking
        async delTick() {
            this.parent.dimension.runCommand(`tickingarea remove sb`)
            await delay(1)
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
            form.button('Save ACSS') // ACSS Arx Compressed Structure String
            form.button('Load ACSS')
        }

        form.show(p).then(async r => {
            switch (r.selection) {
                case 0:
                    for await (const b of new BlocksMegaArray(d, point1, point2)) {
                        try {
                            b.setType('minecraft:air')
                        }
                        catch {

                        }
                    }
                    break

                case 1:
                    const form3 = new ModalFormData()
                        .title("Fill with block")
                        .textField(`Enter a block ID`, "bedrock")
                        .submitButton('Fill')

                        .show(p).then(async r => {

                            if (r.formValues) {

                                const blockId = r.formValues[0].trim()

                                for await (const b of new BlocksMegaArray(d, point1, point2)) {
                                    try {
                                        b.setType(blockId)
                                    }
                                    catch {

                                    }
                                }
                            }
                        })

                case 2:
                    await saveACSS(d, point1, point2)
                    p.sendMessage('§bACSS sent to log')
                    break

            }
        })
    }
}

async function saveACSS(d, p1, p2) {
    // ACSS obj
    let acss = {
        head: {},
        body: []
    }
    // Basic headers
    acss.head = {
        v: 1, // Version
        s: [ // Size
            Math.abs(p1.x - p2.x + 1),
            Math.abs(p1.y - p2.y + 1),
            Math.abs(p1.z - p2.z + 1),
        ]
    }

    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    const alphabetLength = alphabet.length
    let allBlocks = [] // List of all blocks as it is
    let uniqueBlocks = [] // How many times we met every block?

    // Get all blocks and count them
    for await (const b of new BlocksMegaArray(d, p1, p2)) {
        allBlocks.push(b.typeId)

        if (!uniqueBlocks.includes(b.typeId)) {
            uniqueBlocks.push(b.typeId)
        }
    }

    // Create palette
    const differentBlocks = uniqueBlocks.length
    const symPerBlock = Math.ceil(differentBlocks / alphabetLength)
    acss.head.spb = symPerBlock // Remember

    let palette = {} // Blocks palette
    for (let i = 0; i < differentBlocks; i++) {
        palette[uniqueBlocks[i]] = indexToSymbol(i, alphabet)
    }

    // Create result string
    let blockStr = ''

    console.warn(obj2str(palette))
}

function indexToSymbol(index, alphabet) {
    let sym = ''
    const base = alphabet.length
    
    do {
        sym = alphabet[index % base] + sym
        index = Math.floor(index / base) - 1  // -1 для корректного перехода: z→aa
    } while (index >= 0)
    
    return sym
}

function getCoordinatesString(coords) {
    if (coords) {
        return Object.values(coords).join(', ')
    }
    else return 'Not set'
}