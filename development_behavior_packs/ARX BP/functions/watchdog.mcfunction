# Watchdog algorithm for entire ARX javascript system

# Set counter to 0 if everything is fine
execute as @a[scores={verify=2}] unless score @s watchdog_last_pass = @s watchdog run scoreboard players set @s watchdog_counter 0
# Increase counter if there is something strange
execute as @a[scores={verify=2}] if score @s watchdog_last_pass = @s watchdog run scoreboard players add @s watchdog_counter 1
# Remember old value
execute as @a[scores={verify=2}] run scoreboard players operation @s watchdog_last_pass = @s watchdog
# Report to all players if there is something strange
# 10 seconds (== 200 ticks) of no-responce from js consider as js falling
execute as @a[scores={verify=2, watchdog_counter = 200}] run tellraw @a { "rawtext": [ { "text": "[§cCritical§f] Looks like Arx doesn't properly work on your Minecraft version! Download the latest Arx update from the official source (§bgithub.com/pireta-k/ARX-packs§f). If no update is available yet and you are using the latest Minecraft version, message Catherine, the Arx developer, on Discord (§b@pireta§f), and she’ll release a fix soon." } ] }

# If player is still playing, remind him again in 2 mins
execute as @a[scores={verify=2, watchdog_counter = 2400..}] run scoreboard players set @s watchdog_counter 199