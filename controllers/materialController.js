const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()

exports.listMaterials = async (req, res, next) => {
    try {
        const materials = await prisma.material.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                user: {
                    select: {id: true, fullname: true}
                },
                department: {
                    select: {acronym: true, description: true}
                }
            },
            where: {
                title: {
                    contains: 'test'
                }
            }
        })
        res.send(materials)
    } catch(err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.createMaterialMeta = async (req, res, next) => {
    // console.log(req.user)
    const {title, description, department_id: departmentId} = req.body
    console.log(title)
    try {
        const material = await prisma.material.create({
            data: {
                title,
                description,
                user: {
                    connect: {id: req.user.id}
                },
                department: {
                    connect: {id: Number(departmentId)}
                }
            }
        })

        res.send(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(403, {field: err.meta.target[0], detail: `${err.meta.target[0]} has been used already`}))
        } else if (err.code === 'P2025') {
            return next(new RuetkitError(400, {field: 'department_id', detail: 'Invalid department_id provided'}))
        }
    } finally {
        prisma.$disconnect()
    }

}