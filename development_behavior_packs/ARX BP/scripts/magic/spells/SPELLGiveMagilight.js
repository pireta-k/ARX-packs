import { checkForItem } from "../../items/checkForItem";
import { sDP } from "../../arxLib/DPOperations"
import { fl } from "../../lang/fetchLocalization";

// Защита
export function giveMagilight(player, spellData, itemId, time) {
    let allowedItems = ['arx:magilight', 'arx:archilight']
    if (!(allowedItems.includes(itemId))) {
        console.warn('Unexpected item in giveMagilight()')
        return false
    }

    // Проверяем, есть ли нужный светильник в инвентаре
    const hasCurrentItem = checkForItem(player, 'any', itemId)
    // Проверяем, есть ли запущеный кд на этот светильник
    const magilightCD = player.gDP('allowMagilight')
    const archilightCD = player.gDP('allowArchilight')

    // Выдаем айтем, если его не было
    if (!hasCurrentItem) player.runCommand(`give @s ${itemId}`)


    let message = ''
    if (itemId === 'arx:magilight') {
        message = magilightCD ? fl(player, 'magic.magilight.extended', [time / 60]) : fl(player, 'magic.magilight.gained', [time / 60])
        sDP(player, 'allowMagilight', time)
    }
    else if (itemId === 'arx:archilight') {
        message = archilightCD ? fl(player, 'magic.archilight.extended', [time / 60]) : fl(player, 'magic.archilight.gained', [time / 60])
        sDP(player, 'allowArchilight', time)
    }

    player.sendMessage(message)
}