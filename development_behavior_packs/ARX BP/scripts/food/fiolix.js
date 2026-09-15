import { Player } from "@minecraft/server";
import { gDP, sDP } from "../arxLib/DPOperations";
import { sl } from "../lang/fetchLocalization";

/**
 * Consume fiolix
 * @param {Player} p
 * @param {number} power - 10 - very low dose, 100 - moderate dose, 200 - high dose
 */
export function consumeFiolix(p, power) {
    const fiolixDPName = 'fiolix'

    const isFirstTime = gDP(p, 'hasEverUsedFiolix') ?? false
    sDP(p, 'hasEverUsedFiolix', true)

    const valueBefore = gDP(p, fiolixDPName) ?? 0
    const valueAfter = valueBefore + power
    sDP(p, fiolixDPName, valueAfter)

    if (valueBefore < 200) {
        sl(p, 'fiolix.reaction.best')
    } else if (valueBefore < 400) {
        sl(p, 'fiolix.reaction.good')
    } else if (valueBefore < 600) {
        sl(p, 'fiolix.reaction.bad')
    } else {
        sl(p, 'fiolix.reaction.horrible')
    }
}