import { fl, sl } from "./lang/fetchLocalization";
import { system } from "@minecraft/server"

// Emotions
export const emotionsList = ["sit", "sit_alt", "lie_on_back", "lie_on_belly", "lie_star", "lie_on_right_side", "lie_on_left_side", "sit_like_gangster", "show_item", "hands_up", "half_sit", "facepalm", "proud", "sad", "whiny", "monk_pose", "think", "sit_on_knees", "bind_right_arm", "bind_left_arm"]

// Emote
export function emote(p, emotion) {

    // Knocked
    if (p.gDP('respawnDelay') > 0) {
        sl(p, 'emote.cannot_cus_knocked', [], '§c')
        return
    }
    // Moving
    if (p.isMoving) {
        sl(p, 'emote.cannot_cus_moving', [], '§c')
        return
    }
    // Riding
    if (p.isRiding) {
        sl(p, 'emote.cannot_cus_riding', [], '§c')
        return
    }
    // Flying
    if (!p.isOnGround) {
        sl(p, 'emote.cannot_cus_flying', [], '§c')
        return
    }

    // Set emotion
    system.run(function () {
        p.sDP('hasEverEmoted', true)
        p.runCommand(`playanimation @s animation.emote.${emotion} a 0.1 "query.is_moving || query.is_sneaking || q.property('arx:is_knocked') == true"`)
        p.runCommand("tag @s add is_emoting_via_arx_command")
    })
}