import { world } from "@minecraft/server"
import { checkForItem } from '../items/checkForItem'
import { sDP } from "../arxLib/DPOperations"

export function dynamicLightCoreTick() {
    for (const player of world.getPlayers()) {

        let dynamicLightPower = 0

        // Mainhand items
        if (checkForItem(player, 'mainhand', 'minecraft:torch')) dynamicLightPower += 14
        if (checkForItem(player, 'mainhand', 'minecraft:redstone_torch')) dynamicLightPower += 7
        if (checkForItem(player, 'mainhand', 'minecraft:soul_torch')) dynamicLightPower += 12
        if (checkForItem(player, 'mainhand', 'minecraft:copper_torch')) dynamicLightPower += 12
        if (checkForItem(player, 'mainhand', 'minecraft:lantern')) dynamicLightPower += 14

        // Belt lamps
        if (checkForItem(player, 'legs', 'arx:belt_lamp')) dynamicLightPower += 10
        if (checkForItem(player, 'legs', 'arx:brightmouse')) dynamicLightPower += 14
        if (checkForItem(player, 'legs', 'arx:magilight')) dynamicLightPower += 9
        if (checkForItem(player, 'legs', 'arx:archilight')) dynamicLightPower += 15
        if (checkForItem(player, 'legs', 'arx:firefly_belt_lamp')) dynamicLightPower += 14
        if (checkForItem(player, 'legs', 'arx:mechanic_belt_lamp')) dynamicLightPower += 9

        // Check allowed values range
        if (dynamicLightPower > 15) dynamicLightPower = 15

        // Write in DP
        sDP(player, 'dynamicLightPower', dynamicLightPower)

        if (dynamicLightPower > 0) launchLight(player, player.getHeadLocation(), dynamicLightPower)
    }

    for (const entity of world.getDimension('minecraft:overworld').getEntities()) {
        if (entity.typeId === 'minecraft:player') continue
        const currentPower = entity.getDynamicProperty('dynamicLightPower')
        if (currentPower > 0) {
            launchLight(entity, entity.location, currentPower)
        }
    }
}

// Set light blocks
function launchLight(entity, position, power) {

    if (power > 15) power = 15
    if (power < 1) return

    const currnetBlock = entity.dimension.getBlock(position)
    if (currnetBlock.typeId !== 'minecraft:air') return

    currnetBlock.setType(`arx:dynamic_light_block_${power}`)
}