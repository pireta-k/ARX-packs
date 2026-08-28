# Автоматическая регистрация scores в мире

# Переменная верификации и её настройка
    scoreboard objectives add verify dummy Верификация
    scoreboard players set @s verify 2

# Различные переменные рандома
    scoreboard objectives add custom_random dummy Спец_ранд 

scoreboard objectives add no_fog dummy no_fog

# Константы (для команд scoreboard players operation...)
    scoreboard objectives add const_0 dummy Константа_0
    scoreboard players set @s const_0 0

#ТИКИ
scoreboard objectives add tick dummy такт
scoreboard objectives add sec dummy секунда

scoreboard players set @s tick 0
scoreboard players set @s sec 0

# Высокотехнологичное
    scoreboard objectives add battery_avail dummy battery_avail
    scoreboard objectives add battery_charge dummy battery_charge
    scoreboard objectives add battery_charg_lg dummy battery_charg_lg
    scoreboard objectives add battery_max dummy battery_max
    scoreboard objectives add battery_max_log dummy battery_max_log


scoreboard objectives add saturation dummy saturation

# Статистика
    scoreboard objectives add count_death dummy count_death
    # Мобы
        scoreboard objectives add count_mob_kills dummy count_mob_kills

    # Минибоссы
        scoreboard objectives add count_mbs_kills dummy count_mbs_kills

    # Боссы
        scoreboard objectives add count_bss_kills dummy count_bss_kills

    # Удары (полученные)
        scoreboard objectives add count_hits dummy count_hits

    # Заклинания
        scoreboard objectives add count_spells dummy count_spells
        scoreboard objectives add count_spent_mp dummy count_mp
    
    # Блоки
        scoreboard objectives add count_broken_blocks dummy count_broken_blocks
        scoreboard objectives add count_placed_blocks dummy count_placed_blocks

scoreboard objectives add weighLoading dummy weighLoading

# Watchdog
scoreboard objectives add watchdog_last_pass dummy watchdog_last_pass
scoreboard objectives add watchdog_counter dummy watchdog_counter