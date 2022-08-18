const jwt = require('jsonwebtoken')
require('dotenv').config()
const RuetkitError = require('../errors/ruetkit')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const auth = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer <token>
    if (token === null || token === undefined || token === '') {
        return next(new RuetkitError(400, {error: "Access token is missing"}))
    }
    try {
        const userId = jwt.verify(token, process.env.JWT_PRIVATE_KEY).id
        const user = await prisma.user.findUnique(
            {
                where: {id: userId},
                select: {
                    id: true, // to be set in request's user object
                    fullname: true, // to be set in request's user object
                    is_verified: true, // to be compared
                    status: true, // to be set in request's user object
                    role: true, // to be set in request's user object,
                    avatar: {
                        select: {url: true}
                    }
                }
            }
        )
        if (user === null) return next(new RuetkitError(404, {detail: 'This user doesn\'t exist'}))
        if (!user.is_verified) {return next(new RuetkitError(403, {detail: 'This account is not verified'}))}
        if (user.status === 'RESTRICTED') {return next(new RuetkitError(403, {detail: 'This account has been restricted, contact staff'}))}
        req.user = user
    } catch (e) {
        console.log(e);
        return next(new RuetkitError(401, {detail: 'Invalid token provided'}))
    } finally {
        prisma.$disconnect()
    }
    next()
}

module.exports = auth