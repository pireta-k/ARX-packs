import { iDP, sDP } from '../../arxLib/DPOperations'
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import { useStaff } from '../on_use_magic_items'
import { system } from "@minecraft/server"
import { fl, sl } from '../../lang/fetchLocalization'

/*
Цепь хранится в виде
DP chainSpell = 1:2:4:9, где цифры - это каналы, а ":" - разделители
*/

// Ключевая фукнция заклинания
export function chain(player) {
    if (player.hasTag('is_sneaking')) {
        // Отложим выполнение до следующего тика
        system.runTimeout(() => {
            editChain(player);
        }, 0);
    } else {
        // Отложим выполнение до следующего тика
        system.runTimeout(() => {
            sl(player, 'magic.chain.started')
            executeChain(player);
            sl(player, 'magic.chain.ended')
        }, 0);
    }
}

// Редактирование цепи
function editChain(player) {
    const form = new ActionFormData()
        .title(fl(player, 'magic.chain.title'))

        .body(createBodyText(player))

    form.button(fl(player, 'magic.chain.add_channel'), 'textures/ui/camera/edit_timeline')
    form.button(fl(player, 'magic.chain.clear'), 'textures/ui/camera/clear_timeline')

    form.show(player).then(response => {

        if (response.selection === 0) {
            addChannelToChain(player)
        }
        if (response.selection === 1) {
            sDP(player, 'chainSpell', undefined)
            editChain(player)
        }
    })
}

// Добавление канала в цепь
function addChannelToChain(player) {
    const form3 = new ModalFormData()
        .title(fl(player, 'magic.chain.add.title'))
        .textField(fl(player, 'magic.chain.add.field'), fl(player, 'magic.chain.add.placeholder'))
        .submitButton(fl(player, 'magic.chain.add.submit'))

        .show(player).then(response => {

            if (response.formValues) {

                let result = Number(response.formValues[0])

                if (result > 0 && result < 11) {
                    const chainDP = player.getDynamicProperty('chainSpell')

                    let cnannelsArray
                    let channelsString

                    if (chainDP !== undefined) {
                        cnannelsArray = chainDP.split(':')
                        cnannelsArray.push(result)
                        channelsString = cnannelsArray.join(':')
                    }
                    else {
                        channelsString = String(result)
                    }
                    sDP(player, 'chainSpell', channelsString)
                }

                editChain(player)
            }
        })
}

// Создать текст для окна редактирования цепи
function createBodyText(player) {
    let chainDP = player.getDynamicProperty('chainSpell')

    // Если нет цепи
    if (chainDP === undefined) {
        return fl(player, 'magic.chain.current_empty')
    }

    chainDP = String(chainDP)

    // Если есть цепь
    let cnannelsArray
    if (chainDP.includes(':')) {
        cnannelsArray = chainDP.split(':')
    }
    else {
        cnannelsArray = [chainDP]
    }

    return fl(player, 'magic.chain.current_channels', [cnannelsArray.join('\n§a↓§f\n')])
}

// Исполнить цепь
function executeChain(player) {
    let chainDP = player.getDynamicProperty('chainSpell')
    if (chainDP === undefined) {
        sl(player, 'magic.chain.empty_execute')
        return
    } else {
        chainDP = String(chainDP)
        const arrayOfChannels = chainDP.split(':')
        for (const channel of arrayOfChannels) {
            useStaff(player, channel)
        }
    }
}