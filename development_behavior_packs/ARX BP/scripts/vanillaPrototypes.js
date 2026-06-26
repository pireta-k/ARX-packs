// This file edits vanilla prototyes
import { system, world, World, Entity, EntityComponentTypes, EquipmentSlot, Player, ItemStack, MolangVariableMap, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server"
import { sDP, iDP, gDP } from "./arxLib/DPOperations"

function editVanillaPrototypes() {
    // Entity
    Entity.prototype.sDP = function (dp, value) { return sDP(this, dp, value) }
    Entity.prototype.iDP = function (dp, valueToIncrease = 1) { return iDP(this, dp, valueToIncrease) }
    Entity.prototype.gDP = function (value) { return gDP(this, value) }

    // World
    World.prototype.sDP = function (dp, value) { return sDP(this, dp, value) }
    World.prototype.iDP = function (dp, valueToIncrease = 1) { return iDP(this, dp, valueToIncrease) }
    World.prototype.gDP = function (value) { return gDP(this, value) }
}

editVanillaPrototypes()