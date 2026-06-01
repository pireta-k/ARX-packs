import { world } from '@minecraft/server'
import { gDP } from '../arxLib/DPOperations'

const HUD_STRESS_PREFIX = 'arxHud:'
const lastPayloadByPlayerId = new Map()
const subtitleReady = new Set()

const ICON_STRESS = '\uE200'
const ICON_HAPPY = '\uE201'
const ICON_NEUTRAL = '\uE202'
const ICON_MANA = '\uE10D'

/** @param {number} stressLevel -4..4 */
export function buildStressHudText(stressLevel) {
    if (stressLevel === 0) return ICON_NEUTRAL
    if (stressLevel > 0) return ICON_STRESS.repeat(stressLevel)
    return ICON_HAPPY.repeat(Math.abs(stressLevel))
}

/** Текст маны для HUD (всегда, если есть персонаж в Survival). */
export function buildManaHudText(player) {
    const mp = gDP(player, 'mp') ?? 0
    if (player.getDynamicProperty('myRule:manaDisplayMode') === 'decimals') {
        return `${mp.toFixed(1)}${ICON_MANA}`
    }
    return `${Math.floor(mp)}${ICON_MANA}`
}

export function shouldShowHud(player) {
    return player.getDynamicProperty('respawnDelay') === 0
        && player.getGameMode() === 'Survival'
        && gDP(player, 'hasRegisteredCharacter')
}

function ensureSubtitleChannel(player) {
    if (subtitleReady.has(player.id)) return
    player.onScreenDisplay.setTitle(HUD_STRESS_PREFIX, {
        subtitle: ' ',
        stayDuration: 20,
        fadeInDuration: 0,
        fadeOutDuration: 0,
    })
    subtitleReady.add(player.id)
}

function pushHud(player, stressTitle, manaSubtitle) {
    const payloadKey = `${stressTitle}|${manaSubtitle}`
    const playerId = player.id
    if (lastPayloadByPlayerId.get(playerId) === payloadKey) return
    lastPayloadByPlayerId.set(playerId, payloadKey)

    ensureSubtitleChannel(player)
    const display = player.onScreenDisplay
    display.setTitle(stressTitle, {
        stayDuration: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0,
    })
    display.updateSubtitle(manaSubtitle)
}

/** @param {import('@minecraft/server').Player} player */
export function syncHud(player) {
    if (!shouldShowHud(player)) {
        clearHud(player)
        return
    }
    const stressLevel = gDP(player, 'stressLevel') ?? 0
    pushHud(
        player,
        HUD_STRESS_PREFIX + buildStressHudText(stressLevel),
        buildManaHudText(player),
    )
}

/** @param {import('@minecraft/server').Player} player */
export function updateStressHud(player, stressLevel) {
    if (!shouldShowHud(player)) {
        clearHud(player)
        return
    }
    pushHud(
        player,
        HUD_STRESS_PREFIX + buildStressHudText(stressLevel),
        buildManaHudText(player),
    )
}

/** @param {import('@minecraft/server').Player} player */
export function clearHud(player) {
    pushHud(player, HUD_STRESS_PREFIX, ' ')
}

world.afterEvents.playerSpawn.subscribe((event) => {
    if (!event.player?.isValid) return
    subtitleReady.delete(event.player.id)
    lastPayloadByPlayerId.delete(event.player.id)
})
