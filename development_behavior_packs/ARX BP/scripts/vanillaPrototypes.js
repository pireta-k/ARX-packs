// This file edits vanilla prototyes
import { System, World, Entity, Player, ItemStack } from "@minecraft/server"
import { sDP, iDP, gDP } from "./arxLib/DPOperations"
import { NPCSequence } from "./npcManager"

function editVanillaPrototypes() {
    // Entity
    {
        // DP operations
        Entity.prototype.sDP = function (dp, value) { return sDP(this, dp, value) }
        Entity.prototype.iDP = function (dp, valueToIncrease = 1) { return iDP(this, dp, valueToIncrease) }
        Entity.prototype.gDP = function (value) { return gDP(this, value) }
    }

    // World
    {
        // DP operations
        World.prototype.sDP = function (dp, value) { return sDP(this, dp, value) }
        World.prototype.iDP = function (dp, valueToIncrease = 1) { return iDP(this, dp, valueToIncrease) }
        World.prototype.gDP = function (value) { return gDP(this, value) }
    }
}

editVanillaPrototypes()