import { system, EntityComponentTypes, EquipmentSlot } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"
import { gDP, ssDP } from "../arxLib/DPOperations"
import { getItem } from "./getItem"
import { fl } from "../lang/fetchLocalization"

/** id → опции. legendary — ролл/оформление. instant + onUse — сразу при выборе, не в abilities */
export const WEAPON_SKILLS = {
    damage: {},
    handy: {},
    balanced: {},
    painful: {},
    massive: {},
    repair: {
        instant: true,
        onUse: (_player, item) => { item.damage = 0 },
    },
    rat_slayer: {},
    soul_stealer: {},
    training: {},
    poisoned: {},
    destructive: {},
    explosive: { legendary: true },
    obsessive: { legendary: true },
}

const LEGENDARY_ROLL_CHANCE = 0.1

/** Команда для выбора навыка (регистрируется в _main.js) */
export const WEAPON_SKILL_COMMAND = 'arx:weapon'

/** В lore предметов текст по умолчанию курсивный — §r в начале строки отключает наклон */
function loreLine(text) {
    return text.startsWith('§r') ? text : '§r' + text
}

function isLegendarySkill(skillId) {
    return !!WEAPON_SKILLS[skillId]?.legendary
}

function getWeaponAbilities(item) {
    const raw = gDP(item, 'abilities', []) || []
    const abilities = [...new Set(raw.filter(id => WEAPON_SKILLS[id] && !WEAPON_SKILLS[id].instant))]
    if (JSON.stringify(raw) !== JSON.stringify(abilities)) {
        ssDP(item, 'abilities', abilities)
    }
    return abilities
}

function getSkillName(skillId, player) {
    const key = `weapon_skill.${skillId}.name`
    return fl(player, key)
}

function getSkillDescription(skillId, player) {
    const key = `weapon_skill.${skillId}.description`
    return fl(player, key)
}

function pickRandomSkill(legendary, owned, exclude = []) {
    const blocked = new Set([...owned, ...exclude])
    const pool = Object.keys(WEAPON_SKILLS).filter(id => !!WEAPON_SKILLS[id].legendary === legendary && !blocked.has(id))
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
}

function formatSkillNameLine(player, skillId, forLore = false) {
    const name = getSkillName(skillId, player)
    const nameColor = forLore ? '§f' : '§8'
    if (isLegendarySkill(skillId)) {
        const label = fl(player, 'weapon_skill.rarity.legendary')
        return `§v◆ §c§l[${label}]§r§v ${name} ◆`
    }
    return `§3◆ ${nameColor}${name}§3 ◆`
}

function formatSkillDescriptionLine(description, forLore = false) {
    const descColor = forLore ? '§f' : '§8'
    return `§r${descColor}§o${description}`
}

function formatOfferButton(player, skillId) {
    const description = getSkillDescription(skillId, player)
    const nameLine = formatSkillNameLine(player, skillId)
    if (isLegendarySkill(skillId)) {
        return `${nameLine}§8\n${formatSkillDescriptionLine(description)}`
    }
    return `${nameLine}\n${formatSkillDescriptionLine(description)}`
}

export function isWeapon(item) {
    return item?.getTags().includes('is_weapon') ?? false
}

export function isRegisteredWeapon(item) {
    return !!gDP(item, 'everHolded')
}

/** Базовый XP на первый уровень (было 20; ÷4 — уровни в 4 раза быстрее) */
const WEAPON_XP_PER_LEVEL_BASE = 5

/** XP required to go from level N to N+1 */
export function xpRequiredForLevel(level) {
    return WEAPON_XP_PER_LEVEL_BASE * Math.pow(2, level)
}

/** Total XP needed to reach level L from 0 */
export function totalXpForLevel(level) {
    if (level <= 0) return 0
    let sum = 0
    for (let i = 0; i < level; i++) sum += xpRequiredForLevel(i)
    return sum
}

export function getLevelFromXp(xp) {
    let level = 0
    while (xp >= totalXpForLevel(level + 1)) level++
    return level
}

export function getXpProgress(xp) {
    const level = getLevelFromXp(xp)
    const intoLevel = xp - totalXpForLevel(level)
    const forNext = xpRequiredForLevel(level)
    return { level, intoLevel, forNext }
}

/** Полоска прогресса в стиле skillsOperations.getSkillsData (без числа XP) */
export function buildXpProgressBar(progressPercent) {
    const symb = 'I'
    const lineLength = 25
    const progressClamped = Math.max(0, Math.min(100, progressPercent))
    const lengthDone = Math.max(0, Math.min(lineLength, Math.floor(lineLength * progressClamped / 100)))
    const lengthUndone = Math.max(0, lineLength - lengthDone)
    return loreLine('[§a' + symb.repeat(lengthDone) + `§l${symb}§r§f` + symb.repeat(lengthUndone) + '§f]')
}

export function writeItemToMainhand(player, item) {
    system.run(() => {
        const equippable = player.getComponent(EntityComponentTypes.Equippable)
        if (equippable) equippable.setEquipment(EquipmentSlot.Mainhand, item)
    })
}

export function writeItemToSlot(player, item, slot) {
    system.run(() => {
        if (slot === undefined) {
            const equippable = player.getComponent(EntityComponentTypes.Equippable)
            if (equippable) equippable.setEquipment(EquipmentSlot.Mainhand, item)
            return
        }
        const inv = player.getComponent('minecraft:inventory')?.container
        if (inv) inv.setItem(slot, item)
    })
}

export function buildWeaponLore(item, crafterName, player) {
    const madeBy = crafterName ?? gDP(item, 'madeBy', 'Unknown')
    const xp = gDP(item, 'xp', 0) || 0
    const { level, intoLevel, forNext } = getXpProgress(xp)
    const progressPercent = forNext > 0 ? (intoLevel / forNext) * 100 : 100

    const lines = [
        loreLine(`§e§l${fl(player, 'weapon_skill.ui.level', [level])}`),
        buildXpProgressBar(progressPercent),
    ]
    if (gDP(item, 'pendingUpgrades', 0) > 0) {
        lines.push(loreLine(`§e§l! §r§e${fl(player, 'weapon_skill.ui.upgrade_available', [WEAPON_SKILL_COMMAND])}`))
    }

    const abilities = getWeaponAbilities(item)
    if (abilities.length > 0) {
        lines.push(loreLine(''))
        for (const id of abilities) {
            const description = getSkillDescription(id, player)
            const nameLine = formatSkillNameLine(player, id, true)
            lines.push(loreLine(isLegendarySkill(id) ? `${nameLine}§f` : nameLine))
            lines.push(loreLine(formatSkillDescriptionLine(description, true)))
        }
    }

    lines.push(loreLine(''))
    lines.push(loreLine(`§f§o${fl(player, 'weapon_skill.ui.made_by', [madeBy])}`))
    return lines
}

export function refreshWeaponLore(item, crafterName, player) {
    item.setLore(buildWeaponLore(item, crafterName, player))
}

export function pickTwoRandomSkills(ownedIds) {
    const owned = new Set(ownedIds || [])
    const picks = []

    for (let i = 0; i < 2; i++) {
        const wantLegendary = Math.random() < LEGENDARY_ROLL_CHANCE
        let id = pickRandomSkill(wantLegendary, owned, picks)
        if (!id) id = pickRandomSkill(!wantLegendary, owned, picks)
        if (id) picks.push(id)
    }

    return picks
}

/** Текущая пара навыков на выбор — хранится на предмете, не перероллится при открытии меню */
function getValidPendingOffers(item) {
    const owned = new Set(getWeaponAbilities(item))
    const raw = gDP(item, 'pendingOffers', []) || []
    return raw.filter(id => WEAPON_SKILLS[id] && !owned.has(id))
}

function rollAndStorePendingOffers(item) {
    const offers = pickTwoRandomSkills(getWeaponAbilities(item))
    ssDP(item, 'pendingOffers', offers)
    return offers
}

/** Вернуть сохранённые офферы или один раз сгенерировать и записать на предмет */
function ensurePendingOffers(item) {
    const offers = getValidPendingOffers(item)
    if (offers.length > 0) {
        if (JSON.stringify(offers) !== JSON.stringify(gDP(item, 'pendingOffers', []))) {
            ssDP(item, 'pendingOffers', offers)
        }
        return offers
    }
    return rollAndStorePendingOffers(item)
}

function clearPendingOffers(item) {
    ssDP(item, 'pendingOffers', undefined)
}

function showWeaponSkillForm(player, item, offers) {
    if (!offers?.length) return
    const pendingUpgrades = gDP(item, 'pendingUpgrades', 0)

    let body = `§3${fl(player, 'weapon_skill.ui.form_header')}§8:`
    body += `\n§7${fl(player, 'weapon_skill.ui.form_choose_one')}\n`
    if (pendingUpgrades > 1) {
        body += `\n§8• §7${fl(player, 'weapon_skill.ui.form_stored_upgrades', [pendingUpgrades])}`
    }

    const form = new ActionFormData()
        .title(`§3${fl(player, 'weapon_skill.ui.form_title')}`)
        .body(body)

    for (const id of offers) {
        form.button(formatOfferButton(player, id))
    }

    form.show(player).then(response => {
        if (response.canceled || response.selection === undefined) return
        applySkillChoice(player, item, response.selection, offers)
    })
}

function applySkillChoice(player, item, selectionIndex, offers) {
    const skillId = offers[selectionIndex]
    if (!skillId) return

    const def = WEAPON_SKILLS[skillId]
    if (def?.instant) {
        def.onUse?.(player, item)
    } else {
        const abilities = [...getWeaponAbilities(item)]
        if (!abilities.includes(skillId)) abilities.push(skillId)
        ssDP(item, 'abilities', abilities)
    }

    let remainingPicks = gDP(item, 'pendingUpgrades', 0) - 1
    if (remainingPicks < 0) remainingPicks = 0

    if (remainingPicks > 0) {
        const nextOffers = rollAndStorePendingOffers(item)
        if (nextOffers.length === 0) remainingPicks = 0
    } else {
        clearPendingOffers(item)
    }

    ssDP(item, 'pendingUpgrades', remainingPicks)
    ssDP(item, 'upgradePending', remainingPicks > 0)
    refreshWeaponLore(item, undefined, player)
    writeItemToMainhand(player, item)

    if (remainingPicks > 0) {
        notifyWeaponUpgradeAvailable(player, remainingPicks)
    }
    player.sendMessage(fl(player, 'weapon_skill.ui.skill_selected'))
}

function notifyWeaponUpgradeAvailable(player, remainingPicks = 1) {
    const cmd = WEAPON_SKILL_COMMAND
    if (remainingPicks > 1) {
        player.sendMessage(fl(player, 'weapon_skill.ui.upgrade_available_many', [remainingPicks, cmd]))
    } else {
        player.sendMessage(fl(player, 'weapon_skill.ui.upgrade_available_one', [cmd]))
    }
}

function enqueueSkillPicks(player, item, slot, levelsGained) {
    if (levelsGained <= 0) return

    const remainingPicks = (gDP(item, 'pendingUpgrades', 0) || 0) + levelsGained

    let offers = getValidPendingOffers(item)
    if (offers.length === 0) {
        offers = rollAndStorePendingOffers(item)
    }
    if (offers.length === 0) {
        player.sendMessage(fl(player, 'weapon_skill.ui.all_skills_learned'))
        return
    }

    ssDP(item, 'pendingUpgrades', remainingPicks)
    ssDP(item, 'upgradePending', true)
    refreshWeaponLore(item, undefined, player)
    writeItemToSlot(player, item, slot)
    notifyWeaponUpgradeAvailable(player, remainingPicks)
}

export function addWeaponXp(player, item, amount, slot) {
    if (amount <= 0) return
    if (player.getGameMode() === 'Creative' || player.getGameMode() === 'Spectator') return
    if (!isWeapon(item) || !isRegisteredWeapon(item)) return

    const oldXp = gDP(item, 'xp', 0) || 0
    const oldLevel = getLevelFromXp(oldXp)
    const newXp = oldXp + amount
    const newLevel = getLevelFromXp(newXp)

    ssDP(item, 'xp', newXp)
    ssDP(item, 'level', newLevel)

    const levelsGained = newLevel - oldLevel
    if (levelsGained > 0) {
        enqueueSkillPicks(player, item, slot, levelsGained)
    } else {
        refreshWeaponLore(item, undefined, player)
        writeItemToSlot(player, item, slot)
    }
}

export function grantWeaponXpFromDamage(player, damage) {
    if (damage <= 0) return
    const item = getItem(player, 'mainhand')
    if (!isWeapon(item) || !isRegisteredWeapon(item)) return
    addWeaponXp(player, item, damage / 5, undefined)
}

export function grantWeaponXpFromMana(player, manaSpent) {
    if (manaSpent <= 0) return
    const item = getItem(player, 'mainhand')
    if (!isWeapon(item) || !isRegisteredWeapon(item)) return
    addWeaponXp(player, item, manaSpent / 10, undefined)
}

/**
 * @returns {'opened' | 'no_pending' | 'wrong_item' | 'all_skills_taken'}
 */
export function openWeaponSkillPick(player) {
    const item = getItem(player, 'mainhand')
    if (!isWeapon(item) || !isRegisteredWeapon(item)) {
        player.sendMessage(fl(player, 'weapon_skill.ui.hold_weapon_mainhand'))
        return 'wrong_item'
    }

    const pendingUpgrades = gDP(item, 'pendingUpgrades', 0)
    if (pendingUpgrades <= 0) {
        player.sendMessage(fl(player, 'weapon_skill.ui.no_pending_upgrade'))
        return 'no_pending'
    }

    const offers = ensurePendingOffers(item)
    if (!offers.length) {
        ssDP(item, 'pendingUpgrades', 0)
        ssDP(item, 'upgradePending', false)
        clearPendingOffers(item)
        refreshWeaponLore(item, undefined, player)
        writeItemToMainhand(player, item)
        player.sendMessage(fl(player, 'weapon_skill.ui.all_skills_learned'))
        return 'all_skills_taken'
    }

    system.runTimeout(() => {
        writeItemToMainhand(player, item)
        showWeaponSkillForm(player, item, offers)
    }, 0)
    return 'opened'
}

export function registerWeaponIfNeeded(player, item, slot) {
    if (!isWeapon(item) || isRegisteredWeapon(item)) return

    const crafterName = gDP(player, 'name', 'Unknown')
    ssDP(item, 'madeBy', crafterName)
    ssDP(item, 'everHolded', true)
    ssDP(item, 'xp', 0)
    ssDP(item, 'level', 0)
    ssDP(item, 'abilities', [])
    ssDP(item, 'pendingUpgrades', 0)
    ssDP(item, 'upgradePending', false)
    clearPendingOffers(item)
    refreshWeaponLore(item, crafterName, player)
    writeItemToSlot(player, item, slot)
}

export function onWeaponInventoryChange(event) {
    const player = event.player
    const item = event.itemStack
    if (!item || !isWeapon(item)) return

    registerWeaponIfNeeded(player, item, event.slot)
}
