// SPOILERS WARNING!!! If you play Arx, I highly don't recommend you to read this file

// Это список рун и их шифровок, с помощью которых определяется заклинание
export const runeCiphers = {

    // Main runes 
    "maledictio": "AA", // Curse
    "invocatio": "BA", // Summon
    "dispersio": "AQ", // Dispersion
    "scire": "AH", // Query
    "arcus": "AB", // Лук / стрела
    "illusio": "AE", // Иллюзия / Ментальное искажение
    "venenatio": "AF", // Отравление
    "ignis": "AG", // Огонь
    "cura": "AI", // Лечение
    "laffaeti": "AM", // Левитация
    "signum": "AO", // Метка, обозначение
    "visus": "AU", // Зрение
    "impetus": "AV", // Физический урон 
    "defensio": "AW", // Защита
    "mobilitas": "AY", // Подвижность
    "translatio": "BB", // Телепортация
    "mutatio": "BC", // Превращение
    "aqua": "BD", // Water
    "aura": "AR", // Air, wind
    "rattum": "BG", // Rat
    "nodus": "ND", // Chain, connection

    // Руны пре-модификации (Опционально). Могут стоять перед руной. Не являются самостоятельной руной
    "non": "NO", // Logical inversion

    // Руны пост-модификации (опционально). Стоят всегда в конце заклинания. Модифицируют его значение. Используются в указаном ниже порядке, но возможны исключения
    "magna": "AP", // Усиление
    "minima": "AN", // Ослабление
    "durata": "AS", // Длительность
    "area": "AD", // Действие по площади
    "alternus": "AL", // Альетрнативное действие
}