# Автоматическая регистрация scores в мире

# Переменная верификации и её настройка
    scoreboard objectives add verify dummy Верификация
    scoreboard players set @s verify 2

# Различные переменные рандома
    scoreboard objectives add custom_random dummy Спец_ранд 
    scoreboard objectives add custom_random_b dummy Спец_ранд_b
    scoreboard objectives add custom_random_c dummy Спец_ранд_c

scoreboard objectives add drugs_delay dummy Наркозавис.

scoreboard objectives add time_h dummy "Часы игры"
scoreboard objectives add time_m dummy Минуты-игры.

scoreboard objectives add no_dark_fog dummy no_dark_fog

scoreboard objectives add poit_mp_reg dummy poit_mp_reg

scoreboard objectives add weather dummy Погода
scoreboard objectives add weather_cond dummy Тип_погоды
scoreboard players set @s weather_cond 0

scoreboard objectives add day_history dummy Лог_дня
scoreboard objectives add day_delta dummy Дельта_дня

scoreboard objectives add invisible dummy Невидимость

scoreboard objectives add teleport_def dummy Обычн_тп
scoreboard objectives add teleport_dmg dummy Тп_с_уроном

scoreboard objectives add in_portal dummy in_portal

scoreboard objectives add no_fog dummy no_fog

scoreboard objectives add nightvis_saki dummy nightvis_saki

scoreboard objectives add item_control dummy item_control



# Константы (для команд scoreboard players operation...)
    scoreboard objectives add const_0 dummy Константа_0
    scoreboard players set @s const_0 0

#ТИКИ
scoreboard objectives add tick_sempra_dps dummy маг.ур.в.сек
scoreboard objectives add tick dummy такт
scoreboard objectives add sec dummy секунда

scoreboard players set @s tick 0
scoreboard players set @s sec 0

scoreboard objectives setdisplay list time_h

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

# Дебаг верификаций
    scoreboard objectives add debug_verify dummy debug_verify

scoreboard objectives add uni_cool_down dummy uni_cool_down

scoreboard objectives add spell_of_small_head dummy spell_of_small_head

# Обучение
    scoreboard objectives add learning dummy Этап_обучения

scoreboard objectives add weighLoading dummy weighLoading

# Watchdog
scoreboard objectives add watchdog_last_pass dummy watchdog_last_pass
scoreboard objectives add watchdog_counter dummy watchdog_counter