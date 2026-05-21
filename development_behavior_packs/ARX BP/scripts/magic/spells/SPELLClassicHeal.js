import { ssDP } from "../../arxLib/DPOperations"

// Реген
export function classicHeal(entity, spellData, time, power) {

    ssDP(spellData.initiator, 'hasEverCastedSanYanamoHoro', true)

    entity.runCommand('particle arx:classicHeal ~ ~1 ~')
    entity.runCommand(`effect @s regeneration ${time} ${power}`)
    entity.runCommand('playsound spell.healing @a ~ ~1 ~')
}