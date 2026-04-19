
# Урон истрибитора
    execute as @e[type=arx:gasgolder_istribitor] at @s run damage @a[r=3.2, has_property={arx:is_knocked=false}] 4
    execute as @e[type=arx:gasgolder_istribitor] at @s run damage @e[r=3, type=horse] 4

# Звук от магического рывка
    execute at @a[scores={tp_cd=1..}] run playsound magic_dash @a ~ ~1.3 ~