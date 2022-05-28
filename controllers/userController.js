const RuetkitError = require('../errors/ruetkit')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { generateAccessToken, generateRefreshToken } = require('../services/generateToken')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()


exports.signUp = async (req, res, next) => {
    const { ruet_id, fullname, email, password, password2 } = req.body


    let errors = ['ruet_id', 'fullname', 'email', 'password', 'password2'].filter((field) => {
        return req.body[field] === undefined || req.body[field] === ''
    })
    errors = errors.map((field, _index) => {
        return { field, detail: `${field} is required` }
    })

    if (errors.length !== 0) {
        return next(new RuetkitError(401, errors))
    }

    if (password !== password2) {
        return next(new RuetkitError(404, {field: 'password2', detail: 'Password didn\'t match'}))
    }
    try {
        if (isNaN(Number(ruet_id))) {
            return next(new RuetkitError(400, {field: 'ruet_id', detail: 'Ruet ID is supposed to be an integer'}))
        }
        const user = await prisma.user.create({
            data: {
                ruet_id: Number(ruet_id),
                fullname,
                email,
                password: await bcrypt.hash(password, 10),
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
    } finally {
        prisma.$disconnect()
    }
}

exports.signIn = async (req, res, next) => {
    let { ruet_id, password } = req.body
    const ruetId = Number(ruet_id)
    if (isNaN(ruetId)) return next(new RuetkitError(400, {field: 'ruet_id', detail: 'Ruet ID is supposed to be an integer'}))
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
            where: { ruet_id: ruetId },
            select: {
                id: true,
                fullname: true,
                password: true,
                is_verified: true,
                status: true,
                role: true
            }
        })
        if (user === null) {
            return next(new RuetkitError(404, {field: 'ruet_id', detail: 'This user doesn\'t exist'}))
        }

        if (await bcrypt.compare(password, user.password)) {
            if (user.status === 'RESTRICTED') {
                return next(new RuetkitError(403, {field: 'ruet_id', detail: 'This user has been restricted'}))
            }
    
            if (!user.is_verified) {
                return next(new RuetkitError(425, {field: 'ruet_id', detail: 'This user has not been verified yet', id: user.id}))
            }
            const accessToken = await generateAccessToken({ id: user.id, fullname: user.fullname, role: user.role })
            const refreshToken = await generateRefreshToken({ id: user.id, fullname: user.fullname,role: user.role })
            res.status(200).send({ accessToken, refreshToken, fullname: user.fullname, role: user.role })
        } else {
            return next(new RuetkitError(401, {field: 'password', detail: 'Invalid credentials provided'}))
        }
    } catch (e) {
        console.log(e)

        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.verify = async (req, res, next) => {
    const userId = Number(req.params.id)
    const { code } = req.body
    if (isNaN(userId)) return next(new RuetkitError(400, { detail: 'Invalid user id provided' }))
    if (code === undefined || code === '') return next(new RuetkitError(400, { field: 'code', detail: 'Code is required' }))
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, is_verified: true, status: true, code: true}
        })
        // console.log(user)
        if (user === null) {
            res.sendStatus(404)
        }
        if (user.is_verified) {
            return next(new RuetkitError(403, { detail: 'This user has already been verified' }))
        }
        if (user.status === 'RESTRICTED') {
            return next(new RuetkitError(403, {detail: 'This user has been restricted'}))
        }
        if (user.code.code === code) {
            prisma.user.update({
                where: { id: userId },
                data: {
                    is_verified: true
                }
            }).then(async user => {
                
                prisma.code.delete({
                    where: {user_id: userId}
                }).then(async _code => {
                    const accessToken = await generateAccessToken({ id: user.id, fullname: user.fullname, role: user.role })
                    const refreshToken = await generateRefreshToken({ id: user.id, fullname: user.fullname, role: user.role })
                    res.status(200).send({ accessToken, refreshToken, fullname: user.fullname, role: user.role })
                })
            })
        }
        else {
            return next(new RuetkitError(401, { field: 'code', detail: 'Invalid code provided' }))
        }
    } catch (e) {
        console.log(e)
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.resendVerification = async (req, res, next) => {
    const userId = Number(req.params.id)
    if (isNaN(userId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid user id provided' }))
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                status: true,
                code: true
            }
        })
        if (user === null) 
            return next(new RuetkitError(404, { detail: 'This user was not found' }))
        if (user.code === null) 
            return next(new RuetkitError(403, {detail: 'You are not allowed to perform this action'}))

        if (user.is_verified) return next(new RuetkitError(403, {detail: 'This user has already been verified'}))
        if (user.status === 'RESTRICTED') return next(new RuetkitError(403, {detail: 'This user has been restricted'}))
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
    } finally {
        prisma.$disconnect()
    }
}

exports.verifyToken = async (req, res, next) => {
    res.status(200).send({fullname: req.user.fullname, role: req.user.role})
}

exports.refreshToken = async (req, res, next) => {
    const { refreshToken } = req.body
    // console.log(refreshToken)
    if (refreshToken === null || refreshToken === undefined || refreshToken === '') {
        return next(new RuetkitError(400, { field: 'refreshToken', detail: 'Refresh token is required' }))
    }

    try {
        const user = jwt.verify(refreshToken, process.env.JWT_PRIVATE_KEY)
        const accessToken = await generateAccessToken({ id: user.id, role: user.role })
        res.status(200).send({ accessToken, fullname: user.fullname, role: user.role })
    } catch (e) {
        console.log(e)
        res.sendStatus(401)
        // return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.sendPasswordResetVerification = async (req, res, next) => {
    const ruetId = Number(req.params.ruetId)
    if (isNaN(ruetId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid Ruet ID provided' }))
    try {
        const user = await prisma.user.findUnique({
            where: {
                ruet_id: ruetId
            },
            select: {
                id: true,
                is_verified: true,
                status: true,
                code: true
            }
        })
        if (user === null) 
            return next(new RuetkitError(404, { detail: 'This user was not found' }))

        if (!user.is_verified) return next(new RuetkitError(403, {detail: 'This user has not been verified'}))
        if (user.status === 'RESTRICTED') return next(new RuetkitError(403, {detail: 'This user has been restricted'}))
        if (user.code !== null) return res.status(208).send({detail: 'You may have left off password reset process', id: user.id})

        await prisma.code.create({
            data: {
                code: Math.random().toString(36).slice(2, 8).toUpperCase(),
                user_id: user.id
            }
        }).then(_code => {
            res.status(200).send({id: user.id})
        })

    } catch (e) {
        console.log(e)
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.resendPasswordResetVerification = async (req, res, next) => {
    const userId = Number(req.params.id)
    if (isNaN(userId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid user id provided' }))
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                is_verified: true,
                status: true,
                code: true
            }
        })
        if (user === null) 
            return next(new RuetkitError(404, { detail: 'This user was not found' }))
        
        if (user.code === null) 
            return next(new RuetkitError(403, {detail: 'You are not allowed to perform this action'}))

        if (!user.is_verified) return next(new RuetkitError(403, {detail: 'This user has not been verified'}))
        if (user.status === 'RESTRICTED') return next(new RuetkitError(403, {detail: 'This user has been restricted'}))

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
        console.log(e)
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.verifyPasswordResetVerification = async (req, res, next) => {
    const userId = Number(req.params.id)
    const { code } = req.body
    if (isNaN(userId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid user id provided' }))
    if (code === undefined || code === '') return next(new RuetkitError(400, { field: 'code', detail: 'Code is required' }))
   
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { is_verified: true, status: true, code: true}
        })
        if (user === null) {
            res.sendStatus(404)
        }
        if (!user.is_verified) return next(new RuetkitError(403, {detail: 'This user has not been verified'}))
        if (user.status === 'RESTRICTED') return next(new RuetkitError(403, {detail: 'This user has been restricted'}))
        if (user.code === null) return next(new RuetkitError(403, {detail: 'You are not allowed to perform this request'}))
        if (user.code.code === code) {
            res.sendStatus(200)
        }
        else {
            return next(new RuetkitError(401, { field: 'code', detail: 'Invalid code provided' }))
        }
    } catch (e) {
        console.log(e)
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.resetPassword = async (req, res, next) => {
    const userId = Number(req.params.id)
    const { code, password, password2 } = req.body
    if (isNaN(userId)) return next(new RuetkitError(400, { field: 'code', detail: 'Invalid user id provided' }))
    if (code === undefined || code === '') return next(new RuetkitError(400, { field: 'code', detail: 'Code is required' }))
    if (password === undefined || password === '') return next(new RuetkitError(400, { field: 'password', detail: 'Password is required' }))
    if (password2 === undefined || password2 === '') return next(new RuetkitError(400, { field: 'password2', detail: 'Password2 is required' }))

    if (password !== password2) return next(new RuetkitError(401, {field: 'password2', detail: 'Password didn\'t match'}))

   
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true, is_verified: true, status: true, code: true}
        })
        if (user === null) {
            res.sendStatus(404)
        }
        if (!user.is_verified) return next(new RuetkitError(403, {detail: 'This user has not been verified'}))
        if (user.status === 'RESTRICTED') return next(new RuetkitError(403, {detail: 'This user has been restricted'}))
        if (user.code === null) return next(new RuetkitError(403, {detail: 'You are not allowed to perform this request'}))
        if (user.code.code === code) {
            if (await bcrypt.compare(password, user.password)) {
                return next(new RuetkitError(401, {field: 'password', detail: 'Try with a new password'}))
            }
            prisma.user.update({
                where: { id: userId },
                data: {
                    password: await bcrypt.hash(password, 10)
                }
            }).then(async user => {

                prisma.code.delete({
                    where: {
                        user_id: userId
                    }
                }).then(async _code => {
                    const accessToken = await generateAccessToken({ id: user.id, fullname: user.fullname, role: user.role })
                    const refreshToken = await generateRefreshToken({ id: user.id, fullname: user.fullname, role: user.role })
                    res.status(200).send({ accessToken, refreshToken, fullname: user.fullname, role: user.role })
                })
            })
        }
        else {
            return next(new RuetkitError(401, { field: 'code', detail: 'Invalid code provided' }))
        }
    } catch (e) {
        console.log(e)
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.listUsers = async (req, res, next) => {
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
}