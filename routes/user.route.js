require('dotenv').config()
const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const userRoute = express.Router()

const { PrismaClient } = require('@prisma/client')
const { generateAccessToken, generateRefreshToken } = require('../services/generateToken')
const auth = require('../middlewares/auth')
const requireStaff = require('../middlewares/requireStaff')

const prisma = new PrismaClient()


class RuetkitError extends Error {
    constructor(code = 500, message = 'Something went wrong') {
        super(code)
        this.code = code
        this.message = message
    }
}

userRoute.post('/signup', async (req, res, next) => {
    const { ruet_id, fullname, email, password } = req.body


    let errors = ['ruet_id', 'fullname', 'email', 'password'].filter((field) => {
        return req.body[field] === undefined || req.body[field] === ''
    })
    errors = errors.map((field, _index) => {
        return { field, detail: `${field} is required` }
    })

    if (errors.length !== 0) {
        return next(new RuetkitError(401, errors))
    }
    try {
        const user = await prisma.user.create({
            data: {
                ruet_id,
                fullname,
                email,
                password: await bcrypt.hash(password, 10),
                status: 'not_verified',
                role: 'user',
                code: {
                    create: {
                        code: Math.random().toString(36).slice(2, 8).toUpperCase()
                    }
                }
            }
        })
        res.send({ id: user.id })
    } catch (e) {
        console.log(e)
        if (e.code === 'P2002') {
            return next(new RuetkitError(401, { field: e.meta.target[0], detail: `${e.meta.target[0]} is already used` }))
        }
        return next(new RuetkitError())
    }
})

userRoute.post('/signin', async (req, res, next) => {
    const { ruet_id, password } = req.body
    let errors = ['ruet_id', 'password'].filter((field) => {
        return req.body[field] === undefined || req.body[field] === ''
    })
    errors = errors.map((field, _index) => {
        return { field, detail: `${field} is required` }
    })

    if (errors.length !== 0) {
        return next(new RuetkitError(401, errors))
    }

    try {
        const user = await prisma.user.findUnique({
            where: { ruet_id },
            select: {
                id: true,
                password: true,
                status: true,
                role: true
            }
        })
        if (user === null) {
            return next(new RuetkitError(401, {detail: 'This user doesn\'t exist'}))
        }
        if (user.status !== 'verified') {
            return next(new RuetkitError(403, {detail: 'This user is not verified yet'}))
        }
        if (await bcrypt.compare(password, user.password)) {
            const accessToken = await generateAccessToken({ id: user.id, role: user.role })
            const refreshToken = await generateRefreshToken({ id: user.id, role: user.role })
            res.status(200).send({ accessToken, refreshToken })
        } else {
            return next(new RuetkitError(401, {detail: 'Invalid credentials provided'}))
        }
    } catch (e) {
        console.log(e)

        return next(new RuetkitError())
    }
})

userRoute.post('/:id/verify', async (req, res, next) => {
    const userId = Number(req.params.id)
    const { code } = req.body
    if (isNaN(userId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid user id provided' }))
    if (code === undefined || code === '') return next(new RuetkitError(400, { field: 'code', detail: 'Code is required' }))
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, status: true, code: true, role: true }
        })
        if (user === null) {
            res.sendStatus(404)
        }
        if (user.status === 'verified') {
            return next(new RuetkitError(403, { detail: 'This user is already verified' }))
        }
        if (user.code.code === code) {
            prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'verified'
                }
            }).then(async user => {
                const accessToken = await generateAccessToken({ id: user.id, role: user.role })
                const refreshToken = await generateRefreshToken({ id: user.id, role: user.role })
                res.status(200).send({ accessToken, refreshToken })
            })
        }
        else {
            return next(new RuetkitError(400, { field: 'code', detail: 'Invalid code provided' }))
        }
    } catch (e) {
        console.log(e)
        return next(new RuetkitError())
    }
})

userRoute.get('/:id/verify', async (req, res, next) => {
    const userId = Number(req.params.id)
    if (isNaN(userId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid user id provided' }))
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                status: true
            }
        })
        if (user === null) 
            return next(new RuetkitError(404, { detail: 'This user was not found' }))

        if (user.status === 'verified') return next(new RuetkitError(403, {detail: 'This user is already verified'}))

        await prisma.user.update({
            where: { id: userId },
            data: {
                code: {
                    update: {
                        code: Math.random().toString(36).slice(2, 8).toUpperCase()
                    }
                }
            }
        }).then(async _user => {
            res.sendStatus(200)
        })
    } catch (e) {
        return next(new RuetkitError())
    }

})

userRoute.post('/refresh', async (req, res, next) => {
    const { refreshToken } = req.body
    // console.log(refreshToken)
    if (refreshToken === null || refreshToken === undefined || refreshToken === '') {
        return next(new RuetkitError(400, { field: 'refreshToken', detail: 'Refresh token is required' }))
    }

    try {
        const user = jwt.verify(refreshToken, process.env.JWT_PRIVATE_KEY)
        const accessToken = await generateAccessToken({ id: user.id, role: user.role })
        res.status(200).send({ accessToken })
    } catch (e) {
        return next(new RuetkitError())
    }
})

userRoute.get('/', [auth, requireStaff], async (req, res, next) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            fullname: true,
            email: true,
            role: true,
            status: true
        }
    })

    res.send(users)
})

module.exports = userRoute