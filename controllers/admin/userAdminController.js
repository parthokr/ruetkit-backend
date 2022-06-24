require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../../errors/ruetkit')
const { v4: uuidv4 } = require('uuid')
const { sendMail } = require('../../services/sendMail')
const { checkPassword } = require('../../utils/checkPassword')
const { createNotification } = require('../../services/manageNotification')
const { sendNotification } = require('../../services/sendNotification')
const prisma = new PrismaClient()

exports.listUsers = async (req, res, next) => {
    try {
        let users = await prisma.user.findMany({
            select: {
                id: true,
                ruet_id: true,
                fullname: true,
                email: true,
                is_verified: true,
                role: true,
                status: true
            }
        })
        users = users.map(user => {
            user['owner'] = false
            if (user.id === req.user.id) {
                user['owner'] = true
                return user
            }
            return user
        })
        res.send(users)
    } catch (err) {
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.toggleRestriction = async (req, res, next) => {
    let {reason} = req.body

    const allowedRolesToRestrict = {
        STAFF: ['USER'],
        ADMIN: ['USER', 'STAFF']
    }

    try {
        const { userId } = req.params
        const targetUser = await prisma.user.findUnique({
            select: {
                fullname: true,
                email: true,
                status: true,
                role: true
            },
            where: { id: Number(userId) }
        })
        if (targetUser === null) return next(new RuetkitError(404, {detail: 'Requested user was not found'}))

        // rasie 400 while attempting to RESTRICT user with no reason
        if (targetUser.status === 'UNRESTRICTED' && (reason === undefined || reason.length === 0)) {
            return next(new RuetkitError(404, {field: 'reason', detail: 'Reason is required'}))
        }

        
        if (allowedRolesToRestrict[req.user.role].includes(targetUser.role)) {
            const updatedUser = await prisma.user.update({
                select: {
                    status: true
                },
                where: { id: Number(userId) },
                data: { status: targetUser.status === 'UNRESTRICTED' ? 'RESTRICTED' : 'UNRESTRICTED' }
            })

            let mailOption = {}
            // send email on account restriction
            if (updatedUser.status === 'RESTRICTED') {
                reason = reason.replace('\n', '<br/>')

                mailOption = {
                    to: targetUser.email, 
                    subject: 'RuetKit account restriction',
                    text: `
                        Hi ${targetUser.fullname}, <br/>
                        Your ruetkit account has been <strong>restricted</strong> for the following reason(s).
                        <br/> <br />
                        <div style="box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px; padding: 2%">
                            ${reason}
                        </div>
                        <br/>
                        If you think this was done by mistake, contact staff. <br/>
                        <em>Don't reply to this email.</em>
                        <br/> <br/>
                        Regards, <br/>
                        RuetKit.
                    `
                }
            } 
            // send email on revoking restriction 
            else {
                mailOption = {
                    to: targetUser.email, 
                    subject: 'Revocation of restriction from RuetKit account',
                    text: `
                    Hi ${targetUser.fullname}, <br/>
                    Restriction from your ruetkit account has been <strong>revoked</strong>.
                    <br/> <br/>
                    Thanks for being with ruetkit. <br/>
                    <em>Don't reply to this email.</em>
                    <br/> <br/>
                    Regards, <br/>
                    RuetKit.
                    `
                }
            }
            sendMail(mailOption)
            return res.send(updatedUser)
        }
        return next(new RuetkitError(403, { detail: 'You are not allowed to perform this action' }))

    } catch (err) {
        console.log(err);
    } finally {
        prisma.$disconnect()
    }
}

exports.upgradeUser = async (req, res, next) => {
    let {userId: id} = req.params 
    let {to, password} = req.body
    id = Number(id)
    if (isNaN(id)) return next(new RuetkitError(400, {detail: 'Invalid user id provided'}))
    if (to === '' || to === null || to === undefined) return next(new RuetkitError(400, {detail: "'to' is required"}))
    if (password === '' || password === null || password === undefined) return next(new RuetkitError(400, {detail: "Password is required"}))

    const allowedRoledToUpgradeTo = req.user.id ===  Number(process.env.SYSTEM_ID) ? 
                                    ['STAFF', 'ADMIN'] : ['STAFF']
    if (!allowedRoledToUpgradeTo.includes(to)) return next(new RuetkitError(400, {detail: `Allowed roles are ${allowedRoledToUpgradeTo.toString()}`}))

    try {
        const user = await prisma.user.findUnique({
            where: {id: req.user.id},
            select: {
                password: true
            }
        })

        if (user === null) {
            return next(new RuetkitError(404, {detail: 'This user doesn\'t exist'}))
        }

        if (!await checkPassword(password, user.password)) {
            return next(new RuetkitError(403, {field: 'password', detail: 'Incorrect password'}))
        }
        const updatedUser = await prisma.user.update({
            where: {id},
            data: {
                role: to
            },
            select: {
                fullname: true
            }
        })
        const notificastionID = uuidv4()
        const upgradeNotification = {
            notification: {
                title: 'You have been upgraded to STAFF',
                body: `Congratulations ${updatedUser.fullname}! Your role has been upgraded to STAFF`,
            },
            severity: 'info',
            link: 'https://ruetkit.live/admin/user',
            navigate: `/user/${id}`,
            dispatch: 'SET_ROLE;STAFF'
        }

        createNotification({
            id: notificastionID,
            title: upgradeNotification.notification.title,
            body: upgradeNotification.notification.body,
            severity: upgradeNotification.severity,
            userID: id,
            navigate: upgradeNotification.navigate
        })
        sendNotification({id: notificastionID, userID: id, approvalOrDisprovalNotification: upgradeNotification})

        res.status(200).send({id, to})

    } catch (err) {
        console.log(err)
        if (err.code === 'P2025') {
            return next(new RuetkitError(404, {detail: 'Requested user was not found'}))
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.downgradeUser = async (req, res, next) => {
    let {userId: id} = req.params 
    let {to, password} = req.body
    id = Number(id)
    if (isNaN(id)) return next(new RuetkitError(400, {detail: 'Invalid user id provided'}))
    if (to === '' || to === null || to === undefined) return next(new RuetkitError(400, {detail: "'to' is required"}))
    if (password === '' || password === null || password === undefined) return next(new RuetkitError(400, {detail: "Password is required"}))

    const allowedRoledToDowngradeTo = req.user.id ===  Number(process.env.SYSTEM_ID) ? 
                                    ['USER', 'STAFF'] : ['USER']
    if (!allowedRoledToDowngradeTo.includes(to)) return next(new RuetkitError(400, {detail: `Allowed roles are ${allowedRoledToDowngradeTo.toString()}`}))

    try {
        const user = await prisma.user.findUnique({
            where: {id: req.user.id},
            select: {
                password: true
            }
        })

        if (user === null) {
            return next(new RuetkitError(404, {detail: 'This user doesn\'t exist'}))
        }

        if (!await checkPassword(password, user.password)) {
            return next(new RuetkitError(403, {field: 'password', detail: 'Incorrect password'}))
        }

        const updatedUser = await prisma.user.update({
            where: {id},
            data: {
                role: to
            }
        })

        const notificastionID = uuidv4()
        const downgradeNotification = {
            notification: {
                title: 'You have been downgraded to USER',
                body: `Hello ${updatedUser.fullname}, your role has been downgraded to USER`,
            },
            severity: 'info',
            link: 'https://ruetkit.live/admin/user',
            navigate: `/user/${id}`,
            dispatch: 'SET_ROLE;USER'
        }

        createNotification({
            id: notificastionID,
            title: downgradeNotification.notification.title,
            body: downgradeNotification.notification.body,
            severity: downgradeNotification.severity,
            userID: id,
            navigate: downgradeNotification.navigate
        })
        sendNotification({id: notificastionID, userID: id, approvalOrDisprovalNotification: downgradeNotification})
        res.status(200).send({id, to})

    } catch (err) {
        console.log(err)
        if (err.code === 'P2025') {
            return next(new RuetkitError(404, {detail: 'Requested user was not found'}))
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}