import { iDP } from "../../arxLib/dp"

// Защита
export function waterOps(player, waterBonus) {
    iDP(player, 'wetness', waterBonus)
}