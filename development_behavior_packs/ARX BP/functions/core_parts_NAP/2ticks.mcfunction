# Эта функция вызывается раз в 2 такта (1/10 сек) и использует синтаксис NAP

# Партиклы от блуждающих огоньков
    execute at @e[type=arx:wandering_flame_of_tsaskhin] run particle arx:wandering_flame_of_tsaskhin ~ ~ ~
    execute unless entity @a[tag=scarlet_night] at @e[type=arx:wandering_flame_of_night] run particle arx:wandering_flame_of_night ~ ~ ~
    execute at @e[type=arx:wandering_flame_of_mines] run particle arx:wandering_flame_of_mines ~ ~ ~