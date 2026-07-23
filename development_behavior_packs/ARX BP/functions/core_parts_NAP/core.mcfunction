# Это функция, запускающаяся каждый такт, использующая новый синтаксис execute [NAP]

# Проверяем количество игроков с scores={verify=2}
    scoreboard players set @a debug_verify 0
    execute as @a[scores={verify=2}] run scoreboard players add @a debug_verify 1
    execute as @r[scores={verify=2, debug_verify=2..}] run tellraw @a[scores={verify=2}] { "rawtext": [ { "text": "§4Обнаржуена §cкритическая §4ошибка системы core>>>scores>>>too_many_players_with_verification_2" } ] }
    execute as @r[scores={debug_verify=..0}] run tellraw @a { "rawtext": [ { "text": "§4Обнаржуена §cкритическая §4ошибка системы core>>>scores>>>no_players_with_verification_2" } ] }
    
# Рандом
    scoreboard players random @a custom_random 0 1000
    scoreboard players random @a custom_random_b 0 1000
    scoreboard players random @a custom_random_c 0 1000