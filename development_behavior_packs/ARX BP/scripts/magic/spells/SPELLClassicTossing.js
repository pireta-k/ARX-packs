// Подбрасывание
import { sl } from "../../lang/fetchLocalization"

export function classicTossing(player, power) {
    if (player.hasTag('disable_magic_of_modified_moving')) {
        sl(player, 'magic.modified_moving.blocked')
        return
    } else {
        player.addEffect('levitation', 20, { amplifier: power, showParticles: false })
    }
}