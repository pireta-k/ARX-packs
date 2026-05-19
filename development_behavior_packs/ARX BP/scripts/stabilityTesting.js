import { system, world } from "@minecraft/server"

// Этот код отвечает за проведение тестов стабильности Аркса
import { getTime } from './time'


// Интервал между тестами в секундах
const testIntervalSec = 5

// Время при последнем тесте стабильности. При инициализации системы устанавливается время при инициал. системы
let timeLastTest = getTime()

let stabilityTestResult = undefined

// Получаем данные с последнего теста стабильности в виде str XXX.XX%
export function getStabilityTestResult() {
    const result = stabilityTestResult

    if (result == null) return undefined
    const textColor =
        result > 0.90 ? '§a' :
        result > 0.75 ? '§e' :
        result > 0.50 ? '§6' : '§c'

    return `${textColor}${(result * 100).toFixed(2)}§fŨ`
}

// Выполняем тест стабильности
function performStabilityTest() {
    const now = getTime() // Получаем московское время
    const delta = now.getTime() - timeLastTest.getTime() // Получаем разницу во времени между тестом стабильности, который сейчас в процессе завершения, и предыдущим в миллисекундах

    // Если мы получили неожиданное delta, скипаем тест стабильности
    if (delta <= 0) {
        return
    }

    // Получаем стабильность в виде float, где идеальная стабильность 1.0
    stabilityTestResult = testIntervalSec * 1000 / delta // Значения в миллисек.

    // Выставляем timeLastTest
    timeLastTest = now
}

// Интервальный запуск
system.runInterval(() => {

    // Запуск тестов стабильности
    performStabilityTest()

}, testIntervalSec * 20);