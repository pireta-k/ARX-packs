# ЭТА ФУНКЦИЯ ЗАПУСКАЕТСЯ АВТОМАТИЧЕСКИ КАЖДЫЕ 20 тактов (= 1 секунда)


# Вычисление доступности батарей 
    tag @a[hasitem={item=arx:battery_large}, scores={battery_avail=0}] add battery_avail
    tag @a[hasitem={item=arx:battery_small}, scores={battery_avail=0}] add battery_avail
    tag @a[hasitem={item=arx:battery_ultra}, scores={battery_avail=0}] add battery_avail
    tag @a[hasitem={item=arx:battery_homemade}, scores={battery_avail=0}] add battery_avail
    tellraw @a[tag=battery_avail] { "rawtext": [ { "text": "§aВы открыли особый навык: §bТеория аккумуляторов!" } ] }
    tellraw @a[tag=battery_avail] { "rawtext": [ { "text": "Доступны новые сведения в <§cОбщие данные о персонаже§f>!" } ] }
    tellraw @a[tag=battery_avail] { "rawtext": [ { "text": "Доступны новые иконки в <§1Помощь по иконкам§f>!" } ] }
    scoreboard players set @a[tag=battery_avail] battery_avail 1
    tag @a remove battery_avail

# ЗАПУСК ФУНКЦИИ БАТАРЕЙ
    execute as @a[scores={battery_avail=1}] at @s run function core_parts_NAP/battery_logic

# Ломаем лодки мобами
    execute at @e[family=boat_destroyer] run damage @e[family=boat, r=1] 1000

# Горим порочным пламенем
    scoreboard players set @a[hasitem={item=arx:amul_essence_of_vicious_demon, location=slot.armor.legs}] vicious_flame 0
    execute at @e[scores={vicious_flame=1..}] run particle arx:vicious_flame ~ ~1.2 ~
    title @a[scores={vicious_flame=1..}] title §aВы горите!
    execute at @e[scores={vicious_flame=1..}] run playsound vicious_flame @a ~ ~ ~ 
    damage @e[scores={vicious_flame=1..}] 1 suicide
    camera @a[scores={vicious_flame=1..}] fade time 0.5 0 0.5 color 0 150 0
    scoreboard players add @e[scores={vicious_flame=1..}] vicious_flame -1

# Звуки от Газгольдера Истрибитора
    execute as @e[type=arx:gasgolder_istribitor] at @s run playsound gasgolder_istribitor_saw @a ~ ~ ~ 

# Снятие тегов, которые выдаются блоками по радиусу
    # Запретители магии измененного движения
        # Контроль выпадающего такта
            tag @a remove disable_magic_of_modified_moving_control
            tag @a[tag=disable_magic_of_modified_moving_activate] add disable_magic_of_modified_moving_control

        tag @a remove disable_magic_of_modified_moving
        tag @a[tag=disable_magic_of_modified_moving_activate] add disable_magic_of_modified_moving
        tag @a[tag=disable_magic_of_modified_moving_control] add disable_magic_of_modified_moving

        tag @a remove disable_magic_of_modified_moving_activate
    
    # Нагреватели
        tag @a[tag=!heating_by_heater_block_control] remove heating_by_heater_block_activate
        tag @a remove heating_by_heater_block_control

# Одежда
    effect @a[tag=electrical_engineering_available, hasitem={item=arx:night_vision_device, location=slot.armor.head}] night_vision 12 0 true

# Маленькая голова (закл)
    scoreboard players add @a[scores={spell_of_small_head=1..}] spell_of_small_head -1 
    playanimation @a[scores={spell_of_small_head=1..}] animation.player.invisible_head

    effect @a[hasitem={item=arx:amul_ruby, location=slot.armor.legs}, scores={freezing=!..-1001}] fire_resistance 1 0 true

# Обнаружение и автофикс некоторых ошибок
    execute as @a[tag=self] run tellraw @a[scores={verify=2}] { "rawtext": [ { "text": "§4Обнаружена ошибка у @s core>>tags>>self" } ] }
    tag @a remove self

# Эффекты брони
    camera @a[hasitem={item=arx:blindness_bandage, location=slot.armor.head}] fade time 0 2 0 color 30 30 30