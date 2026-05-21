import { system } from "@minecraft/server"
import { getRayImpactDirection } from "../rayCast"

// Damage spells
export function classicDamage(victim, spellData, amountOfDamage) {
    const caster = spellData.initiator

    // Knockback по направлению луча
    const powerMult = amountOfDamage / 10
    const impactDirection = getRayImpactDirection(spellData, victim)
    try {
        victim.applyKnockback(
            { x: impactDirection.x * 4 * powerMult, z: impactDirection.z * 4 * powerMult },
            impactDirection.y * 0.5 * powerMult
        )
    }
    catch {} // We cannot apply knockback on this entity (e.g. item)

    // Deal damage
    victim.dimension.spawnParticle('arx:spell_classic_damage', victim.getHeadLocation())
    victim.dimension.playSound('spell.classic_damage', victim.getHeadLocation())
    victim.applyDamage(amountOfDamage, { cause: 'entityAttack', damagingEntity: caster })

    // Add temp tag
    caster.addTag('used_magic_damage_just_now')

    // Remove temporary tag through some time
    system.runTimeout(() => {
        caster.removeTag('used_magic_damage_just_now')
    }, 1)
}