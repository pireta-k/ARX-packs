import { Player } from "@minecraft/server"
import { fl } from "../lang/fetchLocalization"
import { ActionFormData } from "@minecraft/server-ui"

/** @typedef {Record<BookId, BookData>} BooksList */
/** @typedef {string} BookId */

/**
 * @typedef {object} BookData
 * @property {boolean} [isForeign=false]
 * @property {(this: Book) => void | Promise<void>} [run] - run a function istantly after a book wad opened
 * @property {(this: Book) => void | Promise<void>} [runAfter] - run a function when a book was closed
 */

// A text of a book has localization key book.bookId.text
// book.bookId.title for a title

/** @type {BooksList} */
const booksList = {
    golfari: {}
}

class Book {
    #localizationKeys

    /**
     * Create a new book. A book is attached to a player.
     * @param {Player} p 
     * @param {BookId} bookId 
     */
    constructor(p, bookId) {
        if (!(bookId in booksList)) {
            throw new Error('Trying to create a book instance with an invalid ID: ' + bookId)
        }

        const bookData = booksList[bookId]

        this.p = p
        this.id = bookId
        this.#localizationKeys = {
            text: 'book.' + bookId + '.text',
            title: 'book.' + bookId + '.title'
        }
        this.isForeign = bookData.isForeign ?? false
        this.run = bookData.run
        this.runAfter = bookData.runAfter
    }

    /**
     * Show a screen with text
     * @param {Player} p 
     */
    async show(p) {
        const loc = this.#localizationKeys
        const text = fl(p, loc.text)
        const title = '§l' + fl(p, loc.title)

        if (this.run && typeof this.run === 'function') {
            this.run.call(this)
        }

        new ActionFormData()
            .title(title)
            .body(text)
            .show(p)
            .then(() => {
                if (this.runAfter && typeof this.runAfter === 'function') {
                    this.runAfter.call(this)
                }
            })
    }
}