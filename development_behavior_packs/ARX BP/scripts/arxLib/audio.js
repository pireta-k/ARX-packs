import { Dimension } from "@minecraft/server"

/**
 * Play a sound with optional pitch and volume variations.
 * 
 * @param {string} soundId - Identifier of the sound to play.
 * @param {Dimension} d - Dimension
 * @param {import("@minecraft/server").Vector3} location - The location where the sound should be played. Vector3.
 * @param {number} [pitch=1] - Base pitch of the sound. A value of 1 plays at normal pitch.
 * @param {number} [pitchSpread=0] - Maximum random deviation added to the pitch. The actual pitch will be `pitch ± pitchSpread/2`.
 * @param {number} [volume=1] - Base volume of the sound. A value of 1 plays at full volume.
 * @param {number} [volumeSpread=0] - Maximum random deviation added to the volume. The actual volume will be `volume ± volumeSpread/2`.
 * @returns {void}
 */
export function playSound(soundId, d, location, pitch = 1, pitchSpread = 0, volume = 1, volumeSpread = 0) {
    if (!soundId || !d || !location) {
        console.error('Play sound error: missing arguments')
        return
    }

    const randomSpread = (base, spread) => {
        if (spread === 0) return base
        const half = spread / 2
        return base + (Math.random() * spread - half)
    }

    const soundOptions = {
        pitch: randomSpread(pitch, pitchSpread),
        volume: randomSpread(volume, volumeSpread),
    }

    d.playSound(soundId, location, soundOptions)
}
