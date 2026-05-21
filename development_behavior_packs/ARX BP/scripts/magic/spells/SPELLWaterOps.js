import { iDP } from "../../arxLib/DPOperations"

// Защита
export function waterOps(player, waterBonus) {
    iDP(player, 'wetness', waterBonus)
}