import { fl } from "./lang/fetchLocalization";
import { system } from "@minecraft/server"

// Emotions
export const emotionsList = ["sit", "sit_alt", "lie_on_back", "lie_on_belly", "lie_star", "lie_on_right_side", "lie_on_left_side", "sit_like_gangster", "show_item", "hands_up", "half_sit", "facepalm", "proud", "sad", "whiny", "monk_pose", "think", "sit_on_knees", "bind_right_arm", "bind_left_arm"]

// Emote
export function emote(p, emotion) {

    // Knocked
    if (p.gDP('respawnDelay') > 0) {
        p.sendMessage(`§c` + fl(p, 'emote.cannot_cus_knocked'))
        return
    }
    // Moving
    if (p.getTags().includes("is_moving")) {
        p.sendMessage("§c" + fl(p, 'emote.cannot_cus_moving'))
        return
    }
    // Riding
    if (p.getTags().includes("is_riding")) {
        p.sendMessage("§c" + fl(p, 'emote.cannot_cus_riding'))
        return
    }
    // Flying
    if (!p.getTags().includes("on_ground")) {
        p.sendMessage("§c" + fl(p, 'emote.cannot_cus_flying'))
        return
    }

    // Set emotion
    system.run(function () {
        p.sDP('hasEverEmoted', true)
        p.runCommand(`playanimation @s animation.emote.${emotion} a 0.1 "query.is_moving || query.is_sneaking || q.property('arx:is_knocked') == true"`)
        p.runCommand("tag @s add is_emoting_via_arx_command")
    })
}