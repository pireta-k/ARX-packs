# Это функция, запускающаяся каждый такт, использующая новый синтаксис execute [NAP]

# Могила (выпадает из игрока при его ноке и подсасывает лут)
    # Выдаём тег могиле, если рядом с коробом есть неподнятый им лут
        tag @e[type=arx:grave, tag=grave_cd_expired] remove some_items_not_hopped
        execute at @e[type=arx:grave, tag=grave_cd_expired, tag=!some_items_not_hopped, tag=!stop_hopping] at @e[type=item, r=3] run tag @e[type=arx:grave, tag=grave_cd_expired] add some_items_not_hopped
    
    # Запускаем эвент arx:remove_item_hopper (теперь могила не притягивает предметы) 
        event entity @e[type=arx:grave, tag=grave_cd_expired, tag=!some_items_not_hopped] arx:remove_item_hopper
        tag @e[type=arx:grave, tag=grave_cd_expired, tag=!some_items_not_hopped] add stop_hopping
        tag @e[type=arx:grave, tag=grave_cd_expired, tag=stop_hopping] remove some_items_not_hopped

    # Телепортируем все предметы на короб, если они ещё не закончились
        execute at @e[type=arx:grave, tag=!grave_cd_expired] run tp @e[type=item, r=3] ~ ~0.5 ~
        execute at @e[type=arx:grave, tag=some_items_not_hopped] run tp @e[type=item, r=3] ~ ~0.5 ~

    # Киляем гроб, если он пустой
        event entity @e[type=arx:grave, tag=grave_cd_expired] arx:test_is_empty

# Проверяем количество игроков с scores={verify=2}
    scoreboard players set @a debug_verify 0
    execute as @a[scores={verify=2}] run scoreboard players add @a debug_verify 1
    execute as @r[scores={verify=2, debug_verify=2..}] run tellraw @a[scores={verify=2}] { "rawtext": [ { "text": "§4Обнаржуена §cкритическая §4ошибка системы core>>>scores>>>too_many_players_with_verification_2" } ] }
    execute as @r[scores={debug_verify=..0}] run tellraw @a { "rawtext": [ { "text": "§4Обнаржуена §cкритическая §4ошибка системы core>>>scores>>>no_players_with_verification_2" } ] }
    
# Рандом
    scoreboard players random @a custom_random 0 1000
    scoreboard players random @a custom_random_b 0 1000
    scoreboard players random @a custom_random_c 0 1000