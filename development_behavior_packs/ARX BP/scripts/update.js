import { world } from "@minecraft/server";
import { VERSION } from "./_main"
import { gDP, ssDP } from "./arxLib/DPOperations"
import { getAdmins } from "./arxLib/admin";

// Detects update of Arx BP pack
export function detectUpdate() {
    const currentV = VERSION
    const latestV = gDP(world, 'latestV', [0, 0, 0])
}

// Update 
function update(currentV, latestV) {

    // Remember Arx version
    ssDP(world, 'latestV', currentV)
    getAdmins().forEach(p => {
        p.sendMessage(`Arx update detected: ${latestV} -> ${currentV}`)
    });
}

const updates = {
    [0, 1, 17]: 'build something'
}