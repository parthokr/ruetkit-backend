const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../../errors/ruetkit')
const { sendMail } = require('../../services/sendMail')
const prisma = new PrismaClient()

exports.listUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
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

        res.send(users)
    } catch (err) {
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.toggleRestriction = async (req, res, next) => {
    let {reason} = req.body
    reason = reason.replace('\n', '<br/>')

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