class RuetkitError extends Error {
    constructor(code=500, message='Something went wrong') {
        super(code)
        this.code = code
        this.message = message
    }
}

const requireStaff = async (req, res, next) => {
    if (req.user.role === 'staff') return next()
    return next(new RuetkitError(403, {detail: 'You are not allowed to perform this action'}))
}

module.exports = requireStaff