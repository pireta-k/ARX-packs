import { getTime } from "./arxLib/time"
import { checkForItem } from "./items/checkForItem"
import { world } from "@minecraft/server"
import { sDP } from "./arxLib/DPOperations"

// Получаем историю блока (триггер)
world.afterEvents.entityHitBlock.subscribe((hitEvent) => {
    if (hitEvent.damagingEntity.hasTag('gbd_ready') || checkForItem(hitEvent.damagingEntity, "mainhand", 'arx:mod_sword')) {
        hitEvent.damagingEntity.removeTag('gbd_ready')
        readBlockHistory(hitEvent.hitBlock, hitEvent.damagingEntity)
    }
})

// Записываем историю блока (триггер)
world.afterEvents.playerPlaceBlock.subscribe((placeEvent) => {
    if (placeEvent.player.location.y > 40 && (placeEvent.player.getGameMode() === 'Survival')) {
        recordBlockHistory(placeEvent.block, placeEvent.player)
    }
})

// Функция записи истории блока
function recordBlockHistory(block, player) {
    const now = getTime()
    const y = now.getFullYear()
    const m = (now.getMonth() + 1).toString().padStart(2, '0')
    const d = now.getDate().toString().padStart(2, '0')
    const h = now.getHours().toString().padStart(2, '0')
    const min = now.getMinutes().toString().padStart(2, '0')
    const s = now.getSeconds().toString().padStart(2, '0')
    
    const DPName = `bH:${block.location.x},${block.location.y},${block.location.z},${block.dimension.id.split(':')[1].substring(0, 2)}`
    const valueToRecord = `["${player.name}","${y}${m}${d}","${h}${min}${s}"]`

    sDP(world, DPName, valueToRecord)
}

// Функция чтения истории блока
function readBlockHistory(block, player) {
    const history = world.getDynamicProperty(`bH:${block.location.x},${block.location.y},${block.location.z},${block.dimension.id.split(':')[1].substring(0, 2)}`)
    if (!history) {
        player.sendMessage(`§cНе обнаружено истории взаимодействия с блоком`)
        return
    }

    const [name, dateStr, timeStr] = JSON.parse(history)
    const y = dateStr.substring(0, 4)
    const m = dateStr.substring(4, 6)
    const d = dateStr.substring(6, 8)
    const h = timeStr.substring(0, 2)
    const min = timeStr.substring(2, 4)
    const s = timeStr.substring(4, 6)
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    
    player.sendMessage(`§dИстория взаимодействия:\n§eПоставивший игрок§f: ${name}\n§eДата§f: ${d} ${months[+m-1]} ${y}\n§eВремя§f: ${h}h ${min}m ${s}s`)
}