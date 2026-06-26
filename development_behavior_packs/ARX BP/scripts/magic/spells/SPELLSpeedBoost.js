import { sDP } from "../../arxLib/DPOperations"

const allowedPowers = [0, 1, 2, 3]

// Буст скорости
export function speedBoost(entity, spellData, time, power) {
    if (!allowedPowers.includes(power)) { console.warn(`Была использована недопустимая мощность заклинания буста скорости ${power}`) }

    if (entity.typeId === 'minecraft:player') {
        entity.runCommand('particle arx:sofiso_a ~ ~1.6 ~')
        sDP(entity, `speedBoost:level${power}`, time)
    } else {
        entity.runCommand('particle arx:sofiso_a ~ ~0.5 ~')
        entity.runCommand(`effect @s speed 0 ${time}`)
    }
}