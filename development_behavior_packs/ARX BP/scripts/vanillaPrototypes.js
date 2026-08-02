// This file edits vanilla prototyes
import { System, World, world, Entity, Player, ItemStack } from "@minecraft/server"
import { sDP, iDP, gDP } from "./arxLib/DPOperations"
import { Vector } from "./arxLib/math"
import { Weather } from "./arxLib/weather"
import { customDimensionIds } from "./_main"

let dimensionsCache

function editVanillaPrototypes() {
    // Player
    {
        Object.defineProperty(Player.prototype, 'RPName', { get: function () { return this.getDynamicProperty('name') } })
    }

    // Entity
    {
        // DP operations
        Entity.prototype.sDP = function (dp, value) { return sDP(this, dp, value) }
        Entity.prototype.iDP = function (dp, valueToIncrease = 1) { return iDP(this, dp, valueToIncrease) }
        Entity.prototype.gDP = function (value, fallback = undefined) { return gDP(this, value, fallback) }

        // HP
        Object.defineProperty(Entity.prototype, 'currentHP', { get: function () { return this.getComponent('health')?.currentValue } })
        Object.defineProperty(Entity.prototype, 'maxHP', { get: function () { return this.getComponent('health')?.defaultValue } })
        // 0 - death, 0.5 - moderate injuries, 1 - healthy
        Object.defineProperty(Entity.prototype, 'wellness', { get: function () { return this.currentHP / this.maxHP } })

        // Block
        Object.defineProperty(Entity.prototype, 'b', { get: function () { return this.dimension.getBlock(this.location) } })

        Object.defineProperty(Entity.prototype, 'lightLevel', { get: function () { return this.b?.getLightLevel() } })

        // Riding
        Object.defineProperty(Entity.prototype, 'isRiding', { get: function () { return !!this.getComponent('minecraft:riding') } })
        Object.defineProperty(Entity.prototype, 'ridingOn', { get: function () { return this.getComponent('minecraft:riding')?.entityRidingOn } })
        Object.defineProperty(Entity.prototype, 'hasRiders', { get: function () { return !!this.getComponent('minecraft:rideable')?.getRiders()?.length } })
        Object.defineProperty(Entity.prototype, 'riders', { get: function () { return this.getComponent('minecraft:rideable')?.getRiders() } })

        Object.defineProperty(Entity.prototype, 'isMoving', { get: function () { return Object.values(this.getVelocity()).some(axis => Math.abs(axis) > 0.05) } })

        Object.defineProperty(Entity.prototype, 'isUnderground', { get: function () { return !!this.dimension.getBlockAbove(Vector.upLift(this.location, 2)) } })
        Object.defineProperty(Entity.prototype, 'isInRain', { get: function () { return !this.isUnderground && new Weather(this.dimension).isRaining() } })
    }

    // World
    {
        // DP operations
        World.prototype.sDP = function (dp, value) { return sDP(this, dp, value) }
        World.prototype.iDP = function (dp, valueToIncrease = 1) { return iDP(this, dp, valueToIncrease) }
        World.prototype.gDP = function (value, fallback = undefined) { return gDP(this, value, fallback) }
        World.prototype.getAllDimensions = function () {
            if (dimensionsCache) return dimensionsCache
            const ds = [
                world.getDimension('minecraft:overworld'),
                world.getDimension('minecraft:nether'),
                world.getDimension('minecraft:the_end'),
            ]
            for (const dId of customDimensionIds) {
                ds.push(world.getDimension(dId))
            }
            dimensionsCache = ds
            return ds
        }
        World.prototype.getEntitiesInAllDimensions = function () {
            let result = []
            for (const d of world.getAllDimensions()) {
                result.push(...d.getEntities())
            }
            return result
        }
    }
}

editVanillaPrototypes()