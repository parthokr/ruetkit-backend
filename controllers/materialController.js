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

        // rename user key as uploaded_by
        const {user: uploaded_by, ...rest} = material
        res.status(200).send({...rest, uploaded_by})

    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.listMaterials = async (req, res, next) => {
    // console.log(req.query)
    // if (req.query !== undefined) return _listFilteredMaterials(req, res, next)

    const {query, dept, sem, uploaded_by: uploadedBy, page, exact} = req.query

    let containsOrSearch = exact === 'true' ? 'search' : 'contains'
    let defaultOrInsensitive = exact === 'true' ? 'default' : 'insensitive'


    // console.log(query, uploadedBy)
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
                ...(query !== undefined && {
                    OR: [
                        {
                            title: {
                                [containsOrSearch]: query,
                                mode: 'insensitive'
                            }
                        },
                        {
                            description: {
                                [containsOrSearch]: query,
                                mode: 'insensitive'
                            }
                        },
                        {
                            department: {
                                acronym: {[containsOrSearch]: query, mode: 'insensitive'},
                            }
                        },
                        {
                            department: {
                                description: {[containsOrSearch]: query, mode: 'insensitive'},
                            }
                        }
                    ],
                }),
                ...(uploadedBy !== undefined && {
                    user: {
                        ...(isNaN(uploadedBy) && {fullname: {[containsOrSearch]: uploadedBy, mode: 'insensitive'}}),
                        ...(!isNaN(uploadedBy) && {ruet_id: Number(uploadedBy)})
                    }
                }),
                ...(dept !== undefined && {
                    department: {
                        acronym: {contains: dept, mode: 'insensitive'}
                    }
                })
                // user: userQuery
            }
        })

        // rename user key as uploaded_by
        materials.map((material, index) => {
            const {user: uploaded_by, ...rest} = material
            materials[index] = {...rest, uploaded_by}
        })

        res.status(materials.length === 0 ? 404 : 200).send(materials)
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

exports.deleteMaterial = async (req, res, next) => {
    const {materialId} = req.params

    // TODO chheck if materialId is not number

    try {
        const material = await prisma.material.delete({
            where: {
                id_user_id: {
                    id: Number(materialId),
                    user_id: req.user.id
                }
            }
        })
        res.sendStatus(204)
        // console.log(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2025') {
            // if user is not the owner or the material is already deleted
            return next(new RuetkitError(403, {detail: 'You are not allowed to perform this request'}))
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}