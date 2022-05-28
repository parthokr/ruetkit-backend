const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()

exports.getMaterial = async (req, res, next) => {
    let { materialId } = req.params
    materialId = Number(materialId)

    console.log(materialId)
    // TODO check if materialId is not number

    try {
        const material = await prisma.material.findUnique({
            where: {
                id: materialId
            },
            select: {
                id: true,
                title: true,
                description: true,
                user: {
                    select: { id: true, fullname: true }
                },
                department: {
                    select: { id: true, acronym: true, description: true }
                }
            }
        })

        if (material === null) return next(new RuetkitError(404, { detail: 'The material you requested was not found' }))

        res.status(200).send(material)

    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.listMaterials = async (req, res, next) => {
    // console.log(req.query)
    // if (req.query !== undefined) return _listFilteredMaterials(req, res, next)

    const {query, uploaded_by: uploadedBy, page, exact} = req.query

    let userQuery = {ruet_id: Number(uploadedBy) || undefined}
    if (isNaN(Number(uploadedBy))) {
        userQuery = {
            fullname: {
                contains: uploadedBy || undefined,
                mode: 'insensitive'
            }
        }
    }

    let containsOrSearch = exact === 'true' ? 'search' : 'contains'
    let defaultOrInsensitive = exact === 'true' ? 'default' : 'insensitive'

    console.log(userQuery);

    console.log(query, uploadedBy)
    try {
        const materials = await prisma.material.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                user: {
                    select: { id: true, fullname: true }
                },
                department: {
                    select: { acronym: true, description: true }
                }
            },
            where: {
                OR: [
                    {
                        title: {
                            [containsOrSearch]: query || undefined,
                            mode: defaultOrInsensitive
                        }
                    },
                    {
                        description: {
                            [containsOrSearch]: query || undefined,
                            mode: defaultOrInsensitive
                        }
                    },
                    {
                        department: {
                            acronym: {
                                [containsOrSearch]: query || undefined,
                                mode: defaultOrInsensitive
                            }
                        }
                    },
                    {
                        department: {
                            description: {
                                [containsOrSearch]: query || undefined,
                                mode: defaultOrInsensitive
                            }
                        }
                    },
                ],
                user: userQuery
            }
        })
        res.send(materials)
    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.createMaterialMeta = async (req, res, next) => {
    // console.log(req.user)
    const { title, description, department_id: departmentId } = req.body
    console.log(title)
    try {
        const material = await prisma.material.create({
            data: {
                title,
                description,
                user: {
                    connect: { id: req.user.id }
                },
                department: {
                    connect: { id: Number(departmentId) }
                }
            }
        })

        res.send(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(403, { field: err.meta.target[0], detail: `${err.meta.target[0]} has been used already` }))
        } else if (err.code === 'P2025') {
            return next(new RuetkitError(400, { field: 'department_id', detail: 'Invalid department_id provided' }))
        }
    } finally {
        prisma.$disconnect()
    }

}