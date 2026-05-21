import { langMap, defaultLanguage, fl } from './fetchLocalization'

const reviewDivider = '§8────────────────§r'
const KEYS_PER_PAGE = 12

/** @param {unknown} value */
function isTranslatedValue(value) {
    return typeof value === 'string' && value.trim().length > 0
}

/** @returns {string[]} */
function getBaseKeys() {
    return Object.keys(langMap[defaultLanguage])
}

/**
 * @param {string} langId
 * @returns {{
 *   langId: string,
 *   total: number,
 *   translated: number,
 *   missing: string[],
 *   extra: string[],
 *   percent: number,
 * }}
 */
export function analyzeLocalization(langId) {
    const baseKeys = getBaseKeys()
    const pack = langMap[langId] ?? {}
    const baseKeySet = new Set(baseKeys)
    const missing = []
    let translated = 0

    for (const key of baseKeys) {
        if (isTranslatedValue(pack[key])) translated++
        else missing.push(key)
    }

    const extra = Object.keys(pack).filter(key => !baseKeySet.has(key))

    const total = baseKeys.length
    const percent = total === 0 ? 100 : Math.floor((translated / total) * 100)

    return { langId, total, translated, missing, extra, percent }
}

/** @returns {string[]} */
export function getReviewLanguages() {
    return Object.keys(langMap).filter(id => id !== defaultLanguage)
}

/** @param {number} percent */
function formatPercent(percent) {
    return percent === 100 ? `§a${percent}%` : `§c${percent}%`
}

/** @param {import("@minecraft/server").Player} p */
export function buildLocalizationOverviewBody(p) {
    const baseKeys = getBaseKeys()
    const lines = [
        fl(p, 'info.dev_options.localization_review.intro'),
        fl(p, 'info.dev_options.localization_review.base', [defaultLanguage, baseKeys.length]),
        reviewDivider,
    ]

    for (const langId of getReviewLanguages()) {
        const stats = analyzeLocalization(langId)
        const missingFmt = stats.missing.length === 0 ? `§a${stats.missing.length}` : `§c${stats.missing.length}`

        lines.push(`§f${langId.toUpperCase()} §8§o${stats.translated}/${stats.total}`)
        lines.push(fl(p, 'info.dev_options.localization_review.coverage', [formatPercent(stats.percent)]))
        lines.push(fl(p, 'info.dev_options.localization_review.missing', [missingFmt]))
        if (stats.extra.length > 0) {
            lines.push(fl(p, 'info.dev_options.localization_review.extra', [`§e${stats.extra.length}`]))
        }
        lines.push(reviewDivider)
    }

    if (lines[lines.length - 1] === reviewDivider) lines.pop()

    return lines.join('\n')
}

/**
 * @param {string} langId
 * @param {number} missingCount
 */
export function getMissingKeysPageCount(langId, missingCount = analyzeLocalization(langId).missing.length) {
    if (missingCount === 0) return 1
    return Math.ceil(missingCount / KEYS_PER_PAGE)
}

/**
 * @param {import("@minecraft/server").Player} p
 * @param {string} langId
 * @param {number} page
 */
export function buildLocalizationMissingKeysBody(p, langId, page) {
    const stats = analyzeLocalization(langId)
    const lines = [
        fl(p, 'info.dev_options.localization_review.lang_intro', [langId.toUpperCase()]),
        fl(p, 'info.dev_options.localization_review.coverage', [formatPercent(stats.percent)]),
    ]

    if (stats.missing.length === 0) {
        lines.push(reviewDivider)
        lines.push(fl(p, 'info.dev_options.localization_review.all_translated'))
        return lines.join('\n')
    }

    const pageCount = getMissingKeysPageCount(langId, stats.missing.length)
    const safePage = Math.max(0, Math.min(page, pageCount - 1))
    const sliceStart = safePage * KEYS_PER_PAGE
    const pageKeys = stats.missing.slice(sliceStart, sliceStart + KEYS_PER_PAGE)

    lines.push(fl(p, 'info.dev_options.localization_review.page', [safePage + 1, pageCount]))
    lines.push(reviewDivider)
    lines.push(fl(p, 'info.dev_options.localization_review.missing_header'))

    for (const key of pageKeys) {
        lines.push(`§f${key}`)
    }

    return lines.join('\n')
}
