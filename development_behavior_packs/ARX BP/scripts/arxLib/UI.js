import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { fl } from "../lang/fetchLocalization";

/**
 * @typedef DynamicAFDItem
 * @property {Function} exe
 * @property {Function} [condition]
 * @property {String} [icon]
 */

/**
 * @typedef DynamicActionFormDataOptions
 * @property {String} title
 * @property {String} body
 */

export class UI {
    /**
     * A smart form
     * @param {Player} p 
     * @param {Record<String, DynamicAFDItem>} data
     * @param {String} localizationNameSpace
     * @param {DynamicActionFormDataOptions} [options]
     */
    static async dynamicActionFormData(p, data, localizationNameSpace, options = {}) {
        // Allowed info options
        let allowedOptions = []
        for (const key in data) {
            const option = data[key]
            const available = !('condition' in option) || option.condition()
            if (available) allowedOptions.push(key)
        }
        // Create form
        const form = new ActionFormData()
        if (options.body) form.body(options.body)
        if (options.title) form.title(options.title)
        // Add options to form
        for (const option of allowedOptions) {
            const current = data[option] // Get current option obj

            form.button(fl(p, `${localizationNameSpace}.option.${option}`), current.icon)
        }

        form.show(p).then((response) => {
            // If canceled, return
            if (response.canceled) return

            // Get option
            const optionKey = allowedOptions[response.selection]
            const option = data[optionKey]
            if (!option) return
            if (option.condition && !option.condition(p)) return

            // Run function
            try { option.exe() }
            catch (error) {
                console.warn(`§eDynamic Action Form Data§f: ${error.stack}${error}`)
            }
        })
    }
}