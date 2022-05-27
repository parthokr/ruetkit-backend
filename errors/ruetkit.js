class RuetkitError extends Error {
    constructor(code = 500, message = 'Something went wrong') {
        super(code)
        this.code = code
        this.message = message
    }
}

module.exports = RuetkitError