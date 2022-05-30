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
                id: Number(materialId)
            },
            select: {
                id: true,
                title: true,
                description: true,
                uploader: {
                    select: { id: true, fullname: true }
                },
                course: {
                    select: { id: true, code: true, title: true, department: { select: { id: true, acronym: true, description: true } } }
                },
                approver: {
                    select: {
                        id: true,
                        fullname: true
                    }
                }
            }
        })
        // console.log(material)
        // return 403 if material is not approved and user is not owner
        if (material === null || (material.approver === null && material.uploader.id !== req.user.id))
            return next(new RuetkitError(404, { detail: 'The material you requested was not found' }))

        // rename user key as uploaded_by
        const { uploader: uploaded_by, ...rest } = material
        res.status(200).send({ ...rest, uploaded_by })

    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.listMaterials = async (req, res, next) => {
    // console.log(req.query)
    // if (req.query !== undefined) return _listFilteredMaterials(req, res, next)

    const { query, dept, year, sem, cc: courseCode, uploaded_by: uploadedBy, page, exact } = req.query

    let containsOrSearch = exact === 'true' ? 'search' : 'contains'
    let defaultOrInsensitive = exact === 'true' ? 'default' : 'insensitive'


    // console.log(query, uploadedBy)
    try {
        const materials = await prisma.material.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                uploader: {
                    select: { id: true, fullname: true }
                },
                course: {
                    select: { id: true, code: true, title: true, semester: true, year: true, department: { select: { id: true, acronym: true, description: true } } }
                },
                approver: {
                    select: {
                        id: true,
                        fullname: true
                    }
                }
            },
            where: {
                OR: [
                    {
                        NOT: {
                            approver_id: null
                        }
                    },
                    {
                        uploader: {
                            id: req.user.id
                        }
                    }
                ],

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
                            course: {
                                code: {
                                    [containsOrSearch]: query,
                                    mode: 'insensitive'
                                }
                            }
                        },
                        {
                            course: {
                                title: {
                                    [containsOrSearch]: query,
                                    mode: 'insensitive'
                                }
                            }
                        },
                        {
                            course: {
                                department: {
                                    acronym: { [containsOrSearch]: query, mode: 'insensitive' },
                                }
                            }
                        },
                        {
                            course: {
                                department: {
                                    description: { [containsOrSearch]: query, mode: 'insensitive' },
                                }
                            }
                        }
                    ],
                }),
                ...(uploadedBy !== undefined && {
                    uploader: {
                        ...(isNaN(uploadedBy) && { fullname: { [containsOrSearch]: uploadedBy, mode: 'insensitive' } }),
                        ...(!isNaN(uploadedBy) && { ruet_id: Number(uploadedBy) })
                    }
                }),
                ...(dept !== undefined && {
                    course: {
                        department: {
                            acronym: {
                                contains: dept,
                                mode: 'insensitive'
                            }
                        },
                        ...(courseCode !== undefined && {
                            code: {
                                contains: courseCode,
                                mode: 'insensitive'
                            }
                        })
                    }
                }),
                ...(courseCode !== undefined && {
                    course: {
                        code: {
                            contains: courseCode,
                            mode: 'insensitive'
                        },
                        ...(dept !== undefined && {
                            department: {
                                acronym: {
                                    contains: dept,
                                    mode: 'insensitive'
                                }
                            }
                        })
                    }
                }),

                ...(year !== undefined && {
                    course: {
                        year: Number(year)
                    }
                }),
                ...(sem !== undefined && {
                    course: {
                        semester: sem === '1' ? 'ODD' : 'EVEN'
                    }
                })
                // user: userQuery
            }
        })

        // rename user key as uploaded_by
        materials.map((material, index) => {
            const { uploader: uploaded_by, ...rest } = material
            materials[index] = { ...rest, uploaded_by }
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
    const { title, description, course_id: courseId } = req.body
    console.log(title)
    try {
        const material = await prisma.material.create({
            data: {
                title,
                description,
                uploader: {
                    connect: { id: req.user.id }
                },
                course: {
                    connect: { id: Number(courseId) }
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
    const { materialId } = req.params

    // TODO chheck if materialId is not number

    try {
        const material = await prisma.material.delete({
            where: {
                id_uploader_id: {
                    id: Number(materialId),
                    uploader_id: req.user.id
                }
            }
        })
        res.sendStatus(204)
        // console.log(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2025') {
            // if user is not the owner or the material is already deleted
            return next(new RuetkitError(403, { detail: 'You are not allowed to perform this request' }))
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}

exports.approveMaterial = async (req, res, next) => {
    const { materialId } = req.params

    // TODO chheck if materialId is not number

    try {
        const material = await prisma.material.update({
            data: {
                approver: {
                    connect: {id: req.user.id}
                }
            },
            where: {
                id: Number(materialId)
            }
        })
        res.sendStatus(200)
        console.log(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2025') {
            // if material doesn't exist
            return next(new RuetkitError(404, { detail: 'Material was not found' }))
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}