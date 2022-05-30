class RuetkitError extends Error {
    constructor(code=500, message='Something went wrong') {
        super(code)
        this.code = code
        this.message = message
    }
}

const requireStaffOrAdmin = async (req, res, next) => {
    const allowedRole = ['STAFF', 'ADMIN']
    if (allowedRole.includes(req.user.role)) return next()
    return next(new RuetkitError(403, {detail: 'You are not allowed to perform this action'}))
}

module.exports = requireStaffOrAdmin