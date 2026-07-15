import { system } from "@minecraft/server"

const defaultTimeout = 1000 // Ticks

class NPCSequence {
    constructor(sequence) {
        if (typeof sequence !== 'object') {
            console.error('Trying to initialize sequnence')
        }
    }

    init() {

    }

    end() {

    }
}

class NPCManager {
    constructor() {

    }
}

let sequences = {
    eve_test: {
        fix_y_axis: true
    }
}