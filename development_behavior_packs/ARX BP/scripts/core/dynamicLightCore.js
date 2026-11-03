import { world } from "@minecraft/server"
import { checkForItem } from '../items/checkForItem'
import { sDP } from "../arxLib/DPOperations"
import { getItem } from "../items/getItem"
import { lightSourcesList } from "../items/lists"

export function dynamicLightCoreTick() {
    for (const player of world.getPlayers()) {

        let dynamicLightPower = 0

        const mainhandItemId = getItem(player, 'mainhand')?.typeId
        const legsItemId = getItem(player, 'legs')?.typeId

        // Mainhand
        if (mainhandItemId in lightSourcesList.mainhand) dynamicLightPower += lightSourcesList.mainhand[mainhandItemId]

        // Belt lamps
        if (mainhandItemId in lightSourcesList.beltLamps) dynamicLightPower += lightSourcesList.beltLamps[mainhandItemId]
        if (legsItemId in lightSourcesList.beltLamps) dynamicLightPower += lightSourcesList.beltLamps[legsItemId]

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