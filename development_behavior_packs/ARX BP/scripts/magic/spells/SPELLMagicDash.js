import { iDP, sDP, gDP } from '../../arxLib/DPOperations'
import { setScore } from '../../arxLib/scoresOperations'
import { system } from "@minecraft/server"
import { sl } from '../../lang/fetchLocalization'

// Магический рывок
export function magicDash(player, ticks, ghostDash = false) {
    if (gDP(player, 'weighLoading') <= 7) { // Допуск по весу
        player.runCommand('particle arx:magic_dash ~ ~1.3 ~ ')
        sDP(player, 'dash', ticks)
        dash(player, ghostDash)

    } else { // Недопуск по весу
        player.addTag('block_mp_withdraw')
        sl(player, 'magic.dash.too_heavy')
    }
}

function dash(player, ghostDash = false) {
    let powerMult = 1.3

    if (player.getProperty('arx:is_knocked')) return

    const isJumping = player.inputInfo.getButtonState('Sneak')

    if (ghostDash) player.addEffect('invisibility', 40, { showParticles: false })

    if (isJumping === 'Released') {
        const viewDirection = player.getViewDirection()
        player.applyKnockback({ x: viewDirection.x * powerMult, z: viewDirection.z * powerMult }, viewDirection.y * 0.5 * powerMult)
    } else {
        player.applyKnockback({ x: 0, z: 0 }, -0.7)
        player.addEffect('slow_falling', 40, { showParticles: false })
        if (!player.isOnGround) sDP(player, 'dash', 1)
    }
    player.dimension.spawnParticle('arx:magic_dash', player.getHeadLocation())

    if (player.getDynamicProperty('dash') > 0) {
        iDP(player, 'dash', -1)
        system.runTimeout(() => {
            dash(player)
        }, 1)
    }
}