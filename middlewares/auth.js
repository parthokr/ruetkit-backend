const jwt = require('jsonwebtoken')
require('dotenv').config()
class RuetkitError extends Error {
    constructor(code=500, message='Something went wrong') {
        super(code)
        this.code = code
        this.message = message
    }
}

const auth = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer <token
    if (token === null || token === undefined || token === '') {
        return next(new RuetkitError(400, {error: "Access token is missing"}))
    }
    try {
        const user = jwt.verify(token, process.env.JWT_PRIVATE_KEY)
        req.user = user
    } catch (e) {
        console.log(e);
        return next(new RuetkitError(401, {detail: 'Invalid token provided'}))
    }
    next()
}

module.exports = auth