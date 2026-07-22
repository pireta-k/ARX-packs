import { world } from '@minecraft/server';

export class Weather {
    static #weatherMap = new WeakMap();
    constructor(dimension) {
        this.#dimension = dimension;
    }
    #dimension

    /** @type {import('@minecraft/server').WeatherType} */
    get id() { return world.getDynamicProperty('weather:' + this.dimension.id) || 'Clear'; }

    /** @type {import('@minecraft/server').Dimension} */
    get dimension() { return this.#dimension; }

    isRaining() {
        return ['Rain', 'Thunder'].includes(this.id);
    }

    /**
     * @param {import('@minecraft/server').Dimension} dimension
     * @returns {Weather}
     */
    static get(dimension) {
        return this.#weatherMap.get(dimension) || (this.#weatherMap.set(dimension, new Weather(dimension))).get(dimension);
    }
}

world.afterEvents.weatherChange.subscribe(data => {
    world.setDynamicProperty('weather:' + world.getDimension(data.dimension).id, data.newWeather);
});