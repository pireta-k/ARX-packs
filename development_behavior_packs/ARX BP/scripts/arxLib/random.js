export const random = {
    /**
     * Get an integer between two numbers (inclusive)
     * @param {number} num1
     * @param {number} num2
     */
    int(num1, num2) {
        const min = Math.ceil(Math.min(num1, num2))
        const max = Math.floor(Math.max(num1, num2))
        const diff = max - min
        if (diff < 1) return min
        return Math.floor(Math.random() * (diff + 1) + min)
    },
    /**
     * Choose one element from an array
     * @param {Array} array 
     */
    choice(array) {
        const len = array.length
        if (len === 0) return undefined
        const index = Math.floor(Math.random() * len)
        return array[index]
    }
}