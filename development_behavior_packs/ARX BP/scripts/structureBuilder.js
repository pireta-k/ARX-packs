import { world, system } from "@minecraft/server"
import { checkForItem } from "./checkForItem"
import { gDP, ssDP } from "./DPOperations"
import { ActionFormData } from "@minecraft/server-ui"

// StructureBuilder namespace - sb

// Catch player's intercations with blocks
world.afterEvents.playerSwingStart.subscribe((event) => {
    const p = event.player
    const b = p.getBlockFromViewDirection()?.block

    if (b && checkForItem(p, "mainhand", 'arx:structurebuilder_hammer')) {
        try {
            const sneaking = p.inputInfo.getButtonState("Sneak") === 'Pressed'
            const pointToSet = sneaking ? 2 : 1
            const responceColor = sneaking ? '§c' : '§a'

            ssDP(p, 'sb:lastPointSet', pointToSet)
            ssDP(p, `sb:point${pointToSet}`, b.location)
            p.sendMessage(`Saved ${responceColor}Point ${pointToSet}`)
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
    *[Symbol.iterator]() {
        for (const chunk of this.iterMegaChunks()) {
            // The active area we need to process further
            const activeArea = {
                // Minimal vertex of the area
                min: { x: Math.max(chunk.absPos.x, this.anchor.x), y: chunk.height.min, z: Math.max(chunk.absPos.z, this.anchor.z) },
                // Top vertex of the area
                max: { x: Math.min(chunk.absPos.x + 32, this.top.x), y: chunk.height.max, z: Math.min(chunk.absPos.z + 32, this.top.z) }
            }

            chunk.startTick()

            // Iterate and yield blocks
            for (let x = activeArea.min.x; x <= activeArea.max.x; x++) {
                for (let y = activeArea.min.y; y <= activeArea.max.y; y++) {
                    for (let z = activeArea.min.z; z <= activeArea.max.z; z++) {
                        yield this.dimension.getBlock({ x: x, y: y, z: z })
                    }
                }
            }
            chunk.delTick()
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
        startTick() {
            this.delTick() // Remove old tickingArea, if there was a bug and it wasn't unloaded
            const command = `tickingarea add ${this.absPos.x} ${this.height.min} ${this.absPos.z} ${this.absPos.x + 31} ${this.height.max} ${this.absPos.z + 31} sb true`
            const result = this.parent.dimension.runCommand(command)
            console.warn(command, result.successCount)
        }

        // Delete ticking
        delTick() {
            this.parent.dimension.runCommand(`tickingarea remove sb`)
        }
    }
}

// Use hammer (Right-click)
export function onUseSBHammer(p) {
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
    }

    form.show(p).then(r => {
        switch (r.selection) {
            case 0:
                for (const b of new BlocksMegaArray(d, point1, point2)) {
                    try {
                        b.setType('minecraft:air')
                    }
                    catch {

                    }
                }
                break

            case 1:

        }
    })
}

function getCoordinatesString(coords) {
    if (coords) {
        return Object.values(coords).join(', ')
    }
    else return 'Not set'
}