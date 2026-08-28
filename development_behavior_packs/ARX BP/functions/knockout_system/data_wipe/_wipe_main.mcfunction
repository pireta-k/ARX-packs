# Экспа
    scoreboard players set @s xp 0
    scoreboard players set @s xp_stage 0
    scoreboard players set @s skill_point 0
    scoreboard players set @s speed_skill 0
    scoreboard players set @s strength_skill 0
    scoreboard players set @s magic_skill 0

#Статистика
    scoreboard players set @s count_death 0

    scoreboard players set @s count_mbs_kills 0
    scoreboard players set @s count_mob_kills 0
    scoreboard players set @s count_bss_kills 0

    scoreboard players set @s count_death 0
    scoreboard players set @s count_hits 0
    scoreboard players set @s count_dist_x100 0

    scoreboard players set @s count_spells 0
    scoreboard players set @s count_spent_mp 0

#Возвращаем family в нормальное состояние
    event entity @s arx:set_default_family_data