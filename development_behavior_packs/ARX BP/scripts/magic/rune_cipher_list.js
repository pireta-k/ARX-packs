// SPOILERS WARNING!!! If you play Arx, I highly don't recommend you to read this file

/** Это список рун и их шифровок, с помощью которых определяется заклинание
 * @type {Record<String, String>}
 */ 
export const runeCiphers = {

    // Main runes 
    "maledictio": "AA", // Curse. Affuon's rune
    "invocatio": "BA", // Summon. Sukimo's rune
    "dispersio": "AQ", // Dispersion. Ordu's rune
    "arcus": "AB", // Bow / arrow. Nakassi's rune
    "illusio": "AE", // Illusion. Elletera's rune
    "venenatio": "AF", // Poisoning. Flora's rune
    "ignis": "AG", // Flame. Flurri's rune
    "cura": "AI", // Cure. Horo's rune
    "visus": "AU", // Vision. Yanamia's rune
    "impetus": "AV", // Physical damage. Kontata's rune
    "defensio": "AW", // Protection. Sandio's rune
    "mobilitas": "AY", // Mobility. Sinriada's rune
    "translatio": "BB", // Teleportation. Trafana's rune
    "mutatio": "BC", // Transformation. Tracursia's rune
    "aqua": "BD", // Water. Watashi's rune
    "aura": "AR", // Air, wind. Aria's rune
    "nodus": "ND", // Chain, connection. Noxera's rune
    "terra": "TR", // Stone, terrain. Carbon's rune
    "fulmen": "FL", // Electricity. Shakrex's rune
    "rattum": "RT", // Rat. Rattex's rune

    // Руны пре-модификации (Опционально). Могут стоять перед руной. Не являются самостоятельной руной
    "non": "NO", // Logical inversion. Dinaronos's rune

    // Руны пост-модификации (опционально). Стоят всегда в конце заклинания. Модифицируют его значение
    "magna": "AP", // Strengthen the spell. Megger's rune
    "durata": "AS", // Lengthen spell's effect. Sakiifori's rune
    "area": "AD", // Area effect. Disortari's rune
    "alternus": "AL", // Alternative action. Kotoka's rune
}