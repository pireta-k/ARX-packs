/** @typedef {Record<BookId, BookData>} BooksList */
/** @typedef {string} BookId */

const { Player } = require("@minecraft/server")

/**
 * @typedef {object} BookData
 * @property {boolean} [isForeign=false]
 */

// A text of a book has localization key bookId.text
// bookId.title for a title

/** @type {BooksList} */
const booksList = {

}

class Book {
    constructor(bookId) {
        this.id = bookId
    }

    /**
     * Show a screen with text
     * @param {Player} player 
     */
    createUI(player) {
        const text = new 
    }
}