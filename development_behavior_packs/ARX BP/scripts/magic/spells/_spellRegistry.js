// SPOILERS WARNING!!! If you play Arx, I highly don't recommend you to read this file

// IMPORTS

// Spells
import { dinHijo } from './SPELLDinHijo'
import { magicDash } from './SPELLMagicDash'
import { speedBoost } from './SPELLSpeedBoost'
import { classicHeal } from './SPELLClassicHeal'
import { instantHeal } from './SPELLInstantHeal'
import { classicDefence } from './SPELLСlassicDefence'
import { chain } from './SPELLChain'
import { throwMob } from './SPELLThrowMob'
import { classicTossing } from './SPELLClassicTossing'
import { classicDamage } from './SPELLClassicDamage'
import { waterOps } from './SPELLWaterOps'
import { giveMagilight } from './SPELLGiveMagilight'
import { fireResistance } from './SPELLFireResistance'
import { dispelMagic } from './SPELLDispelMagic'
import { dispelEffects } from './SPELLDispelEffects'

// Other
import { iDP, ssDP } from '../../DPOperations'
import { setScore, getScore } from '../../scoresOperations';
import { getEntityFamilies } from '../../_main';
import { system } from "@minecraft/server"
import { runeCiphers } from '../rune_cipher_list'

/**
 * Реестр заклинаний
 * Каждое заклинание указывает:
 * - mpCost: стоимость маны
 * - description: описание
 * - validTargets: массив поддерживаемых целей (1 - на себя, 2 - на другого). Если не указано, все цели доступны
 * - onlyOnPlayers: заклинане можно использовать только на игроков
 * - handler: функция, принимающая player, spellData (с информацией о заклинании)
 */

export let spellRegistry = {
    // Get ready spells (old Din Hijo)
    'scire': {
        mpCost: 5,
        color: '#535ec1',
        description: 'заклинание запроса заклинания (4 канала)',
        onlyOnPlayers: true,
        handler: (player, spellData) => { dinHijo(player, 4, spellData) }
    },
    'scire magna': {
        mpCost: 10,
        color: '#535ec1',
        description: 'заклинание запроса заклинания (7 каналов)',
        onlyOnPlayers: true,
        handler: (player, spellData) => { dinHijo(player, 7, spellData) }
    },
    'scire magna magna': {
        mpCost: 20,
        color: '#535ec1',
        description: 'заклинание запроса заклинания (10 каналов)',
        onlyOnPlayers: true,
        handler: (player, spellData) => { dinHijo(player, 10, spellData) }
    },

    // Dash
    "mobilitas arcus": {
        mpCost: 8,
        color: '#379b2c',
        description: 'заклинание рывка',
        validTargets: [1],
        handler: (player) => { magicDash(player, 7) }
    },
    "mobilitas arcus magna": {
        mpCost: 15,
        color: '#379b2c',
        description: 'заклинание усиленного рывка',
        validTargets: [1],
        handler: (player) => { magicDash(player, 14) }
    },
    "mobilitas arcus magna magna": {
        mpCost: 35,
        color: '#379b2c',
        description: 'заклинание сверхрывка',
        validTargets: [1],
        handler: (player) => { magicDash(player, 30) }
    },

    "mobilitas arcus non visus": {
        mpCost: 16,
        color: '#379b2c',
        description: 'заклинание призрачного рывка',
        validTargets: [1],
        handler: (player) => { magicDash(player, 7, true) }
    },
    "mobilitas arcus non visus magna": {
        mpCost: 30,
        color: '#379b2c',
        description: 'заклинание призрачного усиленного рывка',
        validTargets: [1],
        handler: (player) => { magicDash(player, 14, true) }
    },
    "mobilitas arcus non visus magna magna": {
        mpCost: 70,
        color: '#379b2c',
        description: 'заклинание призрачного сверхрывка',
        validTargets: [1],
        handler: (player) => { magicDash(player, 30, true) }
    },

    // Speed boost
    "mobilitas": {
        mpCost: 10,
        color: '#59cf59',
        description: 'слабое заклинание ускорения',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 0) }
    },
    "mobilitas area": {
        mpCost: 30,
        color: '#59cf59',
        description: 'слабое заклинание ускорения по площади',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 0) }
    },
    "mobilitas durata": {
        mpCost: 60,
        color: '#59cf59',
        description: 'сверхдлительное заклинание слабого ускорения',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 180, 0) }
    },
    "mobilitas magna": {
        mpCost: 20,
        color: '#59cf59',
        description: 'хорошее заклинание ускорения',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 1) }
    },
    "mobilitas magna area": {
        mpCost: 60,
        color: '#59cf59',
        description: 'хорошее заклинание ускорения по площади',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 1) }
    },
    "mobilitas magna durata": {
        mpCost: 120,
        color: '#59cf59',
        description: 'заклинание сверхдлительного мощного ускорения',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 1) }
    },
    "mobilitas magna magna": {
        mpCost: 60,
        color: '#59cf59',
        description: 'мощное заклинание ускорения',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 2) }
    },
    "mobilitas magna magna magna": {
        mpCost: 120,
        color: '#59cf59',
        description: 'наимощнейшее заклинание ускорения',
        handler: (entity, spellData) => { speedBoost(entity, spellData, 30, 3) }
    },

    // Heal
    "cura": {
        mpCost: 5,
        color: '#fa68ae',
        description: 'слабое заклинание регенерации',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 10, 0) }
    },
    "cura durata": {
        mpCost: 25,
        color: '#fa68ae',
        description: 'слабое заклинание регенерации по площади',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 60, 0) }
    },
    "cura area": {
        mpCost: 15,
        color: '#fa68ae',
        description: 'слабое сверхдлительное заклинание регенерации',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 10, 0) }
    },
    "cura durata area": {
        mpCost: 75,
        color: '#fa68ae',
        description: 'слабое сверхдлительное заклинание регенерации по площади',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 60, 0) }
    },

    "cura magna": {
        mpCost: 15,
        color: '#fa68ae',
        description: 'хорошее заклинание регенерации',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 10, 1) }
    },
    "cura magna durata": {
        mpCost: 75,
        color: '#fa68ae',
        description: 'хорошее заклинание регенерации по площади',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 60, 1) }
    },
    "cura magna area": {
        mpCost: 45,
        color: '#fa68ae',
        description: 'хорошее сверхдлительное заклинание регенерации',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 10, 1) }
    },
    "cura magna durata area": {
        mpCost: 225,
        color: '#fa68ae',
        description: 'хорошее сверхдлительное заклинание регенерации по площади',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 60, 1) }
    },

    "cura magna magna magna": {
        mpCost: 45,
        color: '#fa68ae',
        description: 'мощное заклинание регенерации',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 10, 2) }
    },
    "cura magna magna magna durata": {
        mpCost: 225,
        color: '#fa68ae',
        description: 'мощное заклинание регенерации по площади',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 60, 2) }
    },
    "cura magna magna magna area": {
        mpCost: 135,
        color: '#fa68ae',
        description: 'мощное сверхдлительное заклинание регенерации',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 10, 2) }
    },
    "cura magna magna magna durata area": {
        mpCost: 675,
        color: '#fa68ae',
        description: 'мощное сверхдлительное заклинание регенерации по площади',
        handler: (entity, spellData) => { classicHeal(entity, spellData, 60, 2) }
    },

    // Мгновенный реген
    "cura mobilitas": {
        mpCost: 60,
        color: '#fa68ae',
        description: 'заклинание моментального восстановления',
        handler: (player, spellData) => { instantHeal(player, spellData) }
    },
    "cura mobilitas area": {
        mpCost: 180,
        color: '#fa68ae',
        description: 'заклинание моментального восстановления по площади',
        handler: (player, spellData) => { instantHeal(player, spellData) }
    },

    // Маяк
    "translatio": {
        mpCost: 40,
        color: '#ae19cb',
        description: 'заклинание маяка с задержкой 10 секунд',
        validTargets: [1],
        handler: (player) => {
            player.sendMessage('§dМаяк установлен')
            player.runCommand('summon arx:magic_beacon ~ ~ ~')
            ssDP(player, 'magicBeacon', 10)
            player.runCommand(`tag @e[type=arx:magic_beacon, r=0.1] add ${player.name}`)
        }
    },
    "translatio durata": {
        mpCost: 60,
        color: '#ae19cb',
        description: 'заклинание маяка с задержкой 30 секунд',
        validTargets: [1],
        handler: (player) => {
            player.sendMessage('§dМаяк установлен')
            player.runCommand('summon arx:magic_beacon ~ ~ ~')
            ssDP(player, 'magicBeacon', 30)
            player.runCommand(`tag @e[type=arx:magic_beacon, r=0.1] add ${player.name}`)
        }
    },

    // Защита
    "defensio": {
        mpCost: 15,
        color: '#d3b41a',
        description: 'слабое заклинание защиты',
        handler: (player, spellData) => { classicDefence(player, spellData, 10, 0) }
    },
    "defensio durata": {
        mpCost: 75,
        color: '#d3b41a',
        description: 'слабое длительное заклинание защиты',
        handler: (player, spellData) => { classicDefence(player, spellData, 60, 0) }
    },
    "defensio area": {
        mpCost: 45,
        color: '#d3b41a',
        description: 'слабое заклинание защиты по площади',
        handler: (player, spellData) => { classicDefence(player, spellData, 10, 0) }
    },
    "defensio durata area": {
        mpCost: 225,
        color: '#d3b41a',
        description: 'слабое длительное заклинание защиты по площади',
        handler: (player, spellData) => { classicDefence(player, spellData, 60, 0) }
    },

    "defensio magna": {
        mpCost: 45,
        color: '#d3b41a',
        description: 'хорошее заклинание защиты',
        handler: (player, spellData) => { classicDefence(player, spellData, 10, 1) }
    },
    "defensio magna durata": {
        mpCost: 225,
        color: '#d3b41a',
        description: 'хорошее длительное заклинание защиты',
        handler: (player, spellData) => { classicDefence(player, spellData, 60, 1) }
    },
    "defensio magna area": {
        mpCost: 135,
        color: '#d3b41a',
        description: 'хорошее заклинание защиты по площади',
        handler: (player, spellData) => { classicDefence(player, spellData, 10, 1) }
    },
    "defensio magna durata area": {
        mpCost: 675,
        color: '#d3b41a',
        description: 'хорошее длительное заклинание защиты по площади',
        handler: (player, spellData) => { classicDefence(player, spellData, 60, 1) }
    },

    "defensio magna magna magna": {
        mpCost: 135,
        color: '#d3b41a',
        description: 'мощное заклинание защиты',
        handler: (player, spellData) => { classicDefence(player, spellData, 10, 2) }
    },
    "defensio magna magna magna durata": {
        mpCost: 675,
        color: '#d3b41a',
        description: 'мощное длительное заклинание защиты',
        handler: (player, spellData) => { classicDefence(player, spellData, 60, 2) }
    },
    "defensio magna magna magna area": {
        mpCost: 405,
        color: '#d3b41a',
        description: 'мощное заклинание защиты по площади',
        handler: (player, spellData) => { classicDefence(player, spellData, 10, 2) }
    },
    "defensio magna magna magna durata area": {
        mpCost: 2025,
        color: '#d3b41a',
        description: 'мощное длительное заклинание защиты по площади',
        handler: (player, spellData) => { classicDefence(player, spellData, 60, 2) }
    },

    // Цепи
    "nodus": {
        mpCost: 10,
        color: '#86decf',
        description: 'заклинание цепи заклинаний',
        validTargets: [1],
        handler: (player) => { chain(player) }
    },

    // Стрельба с лука
    "arcus": {
        mpCost: 15,
        color: '#a2e578',
        description: 'заклинание слабого улучшения навыка стрельбы из лука',
        onlyOnPlayers: true,
        handler: (player) => {
            ssDP(player, 'shootingBoostBySpell_plus2', 60)
        }
    },
    "arcus magna": {
        mpCost: 45,
        color: '#a2e578',
        description: 'заклинание мощного улучшения навыка стрельбы из лука',
        onlyOnPlayers: true,
        handler: (player) => {
            ssDP(player, 'shootingBoostBySpell_plus4', 60)
        }
    },
    "non arcus": {
        mpCost: 15,
        color: '#417024',
        description: 'заклинание слабого ухудшения навыка стрельбы из лука',
        onlyOnPlayers: true,
        handler: (player) => {
            ssDP(player, 'shootingBoostBySpell_minus2', 60)
        }
    },
    "non arcus magna": {
        mpCost: 45,
        color: '#417024',
        description: 'заклинание мощного ухудшения навыка стрельбы из лука',
        onlyOnPlayers: true,
        handler: (player) => {
            ssDP(player, 'shootingBoostBySpell_minus4', 60)
        }
    },

    // Крысы
    "invocatio rattum": {
        mpCost: 20,
        color: '#8832cb',
        description: 'заклинание броска маленькой мышью',
        validTargets: [1],
        handler: (player) => { throwMob(player, 'arx:small_rat_black', 1.5, 'become_agressive') }
    },
    "invocatio rattum alternus": {
        mpCost: 25,
        color: '#8832cb',
        description: 'заклинание броска маленькой белой мышью',
        validTargets: [1],
        handler: (player) => { throwMob(player, 'arx:small_rat_white', 1.5, 'become_agressive') }
    },
    "invocatio rattum magna": {
        mpCost: 60,
        color: '#8832cb',
        description: 'заклинание броска пещерной крысой',
        validTargets: [1],
        handler: (player) => { throwMob(player, 'arx:cave_rat') }
    },
    "invocatio rattum magna magna": {
        mpCost: 120,
        color: '#8832cb',
        description: 'заклинание броска крысиным монстром',
        validTargets: [1],
        handler: (player) => { throwMob(player, 'arx:rat_monster', 1, 'become_agressive') }
    },
    "invocatio rattum magna magna alternus": {
        mpCost: 150,
        color: '#8832cb',
        description: 'заклинание броска белым крысиным монстром',
        validTargets: [1],
        handler: (player) => { throwMob(player, 'arx:rat_monster_white', 1, 'become_agressive') }
    },

    // Levitation
    "aura": {
        mpCost: 5,
        color: '#a7c9cf',
        description: 'слабое заклинание левитации',
        validTargets: [1],
        handler: (player) => { classicTossing(player, 2) }
    },
    "aura magna": {
        mpCost: 15,
        color: '#a7c9cf',
        description: 'хорошее заклинание левитации',
        validTargets: [1],
        handler: (player) => { classicTossing(player, 6) }
    },
    "aura magna magna": {
        mpCost: 45,
        color: '#a7c9cf',
        description: 'мощное заклинание левитации',
        validTargets: [1],
        handler: (player) => { classicTossing(player, 10) }
    },

    "signum": {
        mpCost: 10,
        color: '#5b3016',
        description: 'заклинание метки',
        validTargets: [1],
        handler: (player) => { setScore(player, 'mark', 60) }
    },

    "rattum illusio minima": {
        mpCost: 30,
        color: '#6e20d4',
        description: 'заклинание успокоения всех крыс, у которых есть спокойная фаза',
        validTargets: [2],
        handler: (entity) => {
            if (getEntityFamilies(entity).includes('rat')) {
                entity.runCommand('event entity @s become_calm')
                entity.runCommand('playsound spell.calming_rats @a ~ ~ ~')
                entity.runCommand('particle arx:spell_calming_rats ~ ~0.4 ~')
            }
        }
    },
    "rattum illusio magna": {
        mpCost: 30,
        color: '#d42020',
        description: 'заклинание провокации всех спокойных крыс',
        validTargets: [2],
        handler: (entity) => {
            if (getEntityFamilies(entity).includes('rat')) {
                entity.runCommand('event entity @s become_agressive')
                entity.runCommand('playsound spell.calming_rats @a ~ ~ ~')
                entity.runCommand('particle arx:spell_calming_rats ~ ~0.4 ~')
            }
        }
    },
    "rattum non invocatio": {
        mpCost: 60,
        color: '#8b4088',
        description: 'заклинание уничтожения небольших крыс',
        validTargets: [2],
        handler: (entity) => {
            if (getEntityFamilies(entity).includes('can_be_despawned_by_ratatao_spell')) {
                entity.dimension.spawnParticle('arx:spell_despawn_rats', { x: entity.location.x, y: entity.location.y + 0.3, z: entity.location.z })
                entity.dimension.spawnParticle('arx:beacon_fog', entity.location)
                entity.dimension.playSound('spell.despawn_rats', entity.location)
                entity.dimension.playSound('spell.power_sound', entity.location)
                entity.clearVelocity()
                entity.addEffect('levitation', 10, { amplifier: 1, showParticles: false })
                system.runTimeout(() => {
                    entity.remove()
                }, 10)
            }
        }
    },

    // Poison
    'venenatio': {
        mpCost: 20,
        color: '#a0c313',
        description: 'заклинание отравления',
        onlyOnPlayers: true,
        handler: (player) => {
            player.runCommand('effect @s poison 5 0 true')
        }
    },
    'venenatio durata': {
        mpCost: 60,
        color: '#a0c313',
        description: 'заклинание длительного отравления',
        onlyOnPlayers: true,
        handler: (player) => {
            player.runCommand('effect @s poison 15 0 true')
        }
    },
    'venenatio magna': {
        mpCost: 40,
        color: '#a0c313',
        description: 'заклинание усиленного отравления',
        onlyOnPlayers: true,
        handler: (player) => {
            player.runCommand('effect @s poison 5 1 true')
        }
    },
    'venenatio magna durata': {
        mpCost: 120,
        color: '#a0c313',
        description: 'заклинание усиленного длительного отравления',
        onlyOnPlayers: true,
        handler: (player) => {
            player.runCommand('effect @s poison 5 1 true')
        }
    },

    // Fire
    'ignis': {
        mpCost: 5,
        color: '#df853c',
        description: 'заклинание поджога на 5 секунд',
        handler: (entity) => { entity.setOnFire(5, true) }
    },
    'ignis durata': {
        mpCost: 12,
        color: '#df853c',
        description: 'заклинание поджога на 12 секунд',
        handler: (entity) => { entity.setOnFire(12, true) }
    },
    'ignis durata durata': {
        mpCost: 30,
        color: '#df853c',
        description: 'заклинание поджога на 30 секунд',
        handler: (entity) => { entity.setOnFire(30, true) }
    },
    'ignis durata durata durata': {
        mpCost: 60,
        color: '#df853c',
        description: 'заклинание поджога на 60 секунд',
        handler: (entity) => { entity.setOnFire(60, true) }
    },

    'non ignis': {
        mpCost: 8,
        color: '#92a8e9',
        description: 'заклинание тушения пламени',
        handler: (entity) => { entity.extinguishFire(true) }
    },

    // Огнестойкость
    'defensio ignis': {
        mpCost: 20,
        color: '#c1ab1a',
        description: 'заклинание огнестойкости на 10 сек.',
        handler: (player, spellData) => { fireResistance(player, spellData, 10) }
    },
    'defensio ignis area': {
        mpCost: 60,
        color: '#c1ab1a',
        description: 'заклинание огнестойкости по площади на 10 сек.',
        handler: (player, spellData) => { fireResistance(player, spellData, 10) }
    },
    'defensio ignis magna': {
        mpCost: 60,
        color: '#c1ab1a',
        description: 'заклинание огнестойкости на 30 сек.',
        handler: (player, spellData) => { fireResistance(player, spellData, 30) }
    },
    'defensio ignis area magna': {
        mpCost: 180,
        color: '#c1ab1a',
        description: 'заклинание огнестойкости по площади на 30 сек.',
        handler: (player, spellData) => { fireResistance(player, spellData, 30) }
    },
    'defensio ignis magna magna': {
        mpCost: 180,
        color: '#c1ab1a',
        description: 'заклинание огнестойкости на 90 сек.',
        handler: (player, spellData) => { fireResistance(player, spellData, 90) }
    },
    'defensio ignis area magna magna': {
        mpCost: 540,
        color: '#c1ab1a',
        description: 'заклинание огнестойкости по площади на 90 сек.',
        handler: (player, spellData) => { fireResistance(player, spellData, 90) }
    },


    'illusio minima': {
        mpCost: 60,
        color: '#9f3d69',
        description: 'заклинание невидимой головы на 60 секунд',
        onlyOnPlayers: true,
        handler: (player) => {
            setScore(player, 'spell_of_small_head', 60)
        }
    },

    'invocatio visus': {
        mpCost: 10,
        color: '#d8ed86',
        description: 'заклинание магисвета на 5 минут',
        onlyOnPlayers: true,
        handler: (player, spellData) => { giveMagilight(player, spellData, 'arx:magilight', 300) }
    },
    'invocatio visus durata': {
        mpCost: 30,
        color: '#d8ed86',
        description: 'заклинание магисвета на 15 минут',
        onlyOnPlayers: true,
        handler: (player, spellData) => { giveMagilight(player, spellData, 'arx:magilight', 900) }
    },
    'invocatio visus magna': {
        mpCost: 30,
        color: '#c586ed',
        description: 'заклинание архисвета на 5 минут',
        onlyOnPlayers: true,
        handler: (player, spellData) => { giveMagilight(player, spellData, 'arx:archilight', 300) }
    },
    'invocatio visus magna durata': {
        mpCost: 90,
        color: '#c586ed',
        description: 'заклинание архисвета на 15 минут',
        onlyOnPlayers: true,
        handler: (player, spellData) => { giveMagilight(player, spellData, 'arx:archilight', 900) }
    },

    // Рассеивания
    'dispersio': {
        mpCost: 20,
        color: '#7850c0',
        description: 'заклинание рассеивания магии',
        onlyOnPlayers: true,
        handler: (player, spellData) => { dispelMagic(player, spellData) }
    },
    'dispersio area': {
        mpCost: 60,
        color: '#7850c0',
        description: 'заклинание рассеивания магии по площади',
        onlyOnPlayers: true,
        handler: (player, spellData) => { dispelMagic(player, spellData) }
    },
    'dispersio alternus': {
        mpCost: 20,
        color: '#7850c0',
        description: 'заклинание рассеивания эффектов',
        handler: (entity, spellData) => { dispelEffects(entity, spellData) }
    },
    'dispersio alternus area': {
        mpCost: 60,
        color: '#7850c0',
        description: 'заклинание рассеивания эффектов по площади',
        handler: (entity, spellData) => { dispelEffects(entity, spellData) }
    },

    // Живые манекены
    'invocatio mutatio visus magna area': {
        mpCost: 120,
        color: '#cc7979',
        description: 'заклинание оживления манекенов',
        validTargets: [2],
        handler: (entity) => {
            if (entity.typeId === 'minecraft:armor_stand') {
                entity.runCommand('summon arx:resurrected_armor_stand ~ ~ ~ ~ ~')
                entity.remove()
            }
        }
    },

    // Night Vision spells
    'visus': {
        mpCost: 20,
        color: '#1e61e5',
        description: 'заклинание ночного зрения на 30 сек',
        onlyOnPlayers: true,
        handler: (entity) => { entity.addEffect('night_vision', 600, { showParticles: false }) }
    },
    'visus durata': {
        mpCost: 120,
        color: '#1e61e5',
        description: 'заклинание ночного зрения на 3 минуты',
        onlyOnPlayers: true,
        handler: (entity) => { entity.addEffect('night_vision', 3600, { showParticles: false }) }
    },
    'visus aura': {
        mpCost: 45,
        color: '#1e61e5',
        description: 'заклинание снятия туманов на 1 мин',
        onlyOnPlayers: true,
        handler: (entity) => { setScore(entity, 'no_fog', 60) }
    },

    // Blindness spells
    'non visus': {
        mpCost: 20,
        color: '#0d1b38',
        description: 'заклинание ослепления',
        handler: (entity) => { entity.addEffect('blindness', 100, { showParticles: false }) }
    },
    'non visus durata': {
        mpCost: 120,
        color: '#0d1b38',
        description: 'длительное заклинание ослепления',
        handler: (entity) => { entity.addEffect('blindness', 600, { showParticles: false }) }
    },
    'non visus area': {
        mpCost: 60,
        color: '#0d1b38',
        description: 'заклинание ослепления по площади',
        handler: (entity) => { entity.addEffect('blindness', 100, { showParticles: false }) }
    },
    'non visus durata area': {
        mpCost: 360,
        color: '#0d1b38',
        description: 'длительное заклинание ослепления по площади',
        handler: (entity) => { entity.addEffect('blindness', 600, { showParticles: false }) }
    },
    // Тьмы
    'non visus alternus': {
        mpCost: 10,
        color: '#300d38',
        description: 'заклинание тьмы',
        handler: (entity) => { entity.addEffect('darkness', 100, { showParticles: false }) }
    },
    'non visus durata alternus': {
        mpCost: 60,
        color: '#300d38',
        description: 'длительное заклинание тьмы',
        handler: (entity) => { entity.addEffect('darkness', 600, { showParticles: false }) }
    },
    'non visus area alternus': {
        mpCost: 30,
        color: '#300d38',
        description: 'заклинание тьмы по площади',
        handler: (entity) => { entity.addEffect('darkness', 100, { showParticles: false }) }
    },
    'non visus durata area alternus': {
        mpCost: 180,
        color: '#300d38',
        description: 'длительное заклинание тьмы по площади',
        handler: (entity) => { entity.addEffect('darkness', 600, { showParticles: false }) }
    },

    // Заклинания намокания
    'aqua': {
        mpCost: 10,
        color: '#1531ad',
        description: 'заклинание брызг',
        onlyOnPlayers: true,
        handler: (player) => { waterOps(player, 200) }
    },
    'aqua magna': {
        mpCost: 30,
        color: '#1531ad',
        description: 'заклинание мощных брызг',
        onlyOnPlayers: true,
        handler: (player) => { waterOps(player, 600) }
    },
    'aqua area': {
        mpCost: 30,
        color: '#1531ad',
        description: 'заклинание брызг по площади',
        onlyOnPlayers: true,
        handler: (player) => { waterOps(player, 200) }
    },
    'aqua magna area': {
        mpCost: 90,
        color: '#1531ad',
        description: 'заклинание мощных брызг по площади',
        onlyOnPlayers: true,
        handler: (player) => { waterOps(player, 600) }
    },
    // Высыхания
    'non aqua': {
        mpCost: 15,
        color: '#768ae2',
        description: 'заклинание моментального высыхания',
        onlyOnPlayers: true,
        handler: (player) => { waterOps(player, -600) }
    },
    'non aqua area': {
        mpCost: 45,
        color: '#768ae2',
        description: 'заклинание моментального высыхания по площади',
        onlyOnPlayers: true,
        handler: (player) => { waterOps(player, -600) }
    },

    // Невидимость
    'defensio visus': {
        mpCost: 30,
        color: '#bda4c5',
        description: 'заклинание невидимости на 10 сек',
        onlyOnPlayers: true,
        handler: (entity) => { entity.addEffect('night_vision', 200, { showParticles: false }) }
    },
    'defensio visus durata': {
        mpCost: 30,
        color: '#bda4c5',
        description: 'заклинание невидимости на 60 сек',
        onlyOnPlayers: true,
        handler: (entity) => { entity.addEffect('night_vision', 1200, { showParticles: false }) }
    },

    // Damage
    "impetus": {
        mpCost: 5,
        color: '#df3b3b',
        description: 'заклинание небольшого урона',
        handler: (entity, spellData) => { classicDamage(entity, spellData, 2.5) }
    },
    "impetus magna": {
        mpCost: 15,
        color: '#df3b3b',
        description: 'заклинание хорошего урона',
        handler: (entity, spellData) => { classicDamage(entity, spellData, 7.5) }
    },
    "impetus magna magna": {
        mpCost: 45,
        color: '#df3b3b',
        description: 'заклинание мощного урона',
        handler: (entity, spellData) => { classicDamage(entity, spellData, 22.5) }
    },
};


// Проверка каждого заклинания
Object.keys(spellRegistry).forEach(spell => {
    // Проверяем корректность реестра заклинаний
    if (!spellRegistry[spell].mpCost) console.warn(`Некорректно указана требуемая мана для заклинания ${spell}`)
    if (!spellRegistry[spell].mpCost) console.warn(`Отсутствует описание для заклинания ${spell}`)
    const runeArray = spell.split(' ')
    runeArray.forEach((rune, index) => {
        if (!Object.keys(runeCiphers).includes(rune)) console.warn(`Non-existent rune ${rune} in spell ${spell}`)
    })
    // Добавляем шифровку рун каждому заклинанию в реестр заклинаний
    let cipher = ''
    runeArray.forEach((rune, index) => {
        const runeSipher = runeCiphers[rune]
        cipher = runeSipher + cipher
    })
    spellRegistry[spell]['cipher'] = cipher
})