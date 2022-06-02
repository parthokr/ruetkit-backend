const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()
const {uploadMaterial : _uploadMaterial} = require('../services/uploadMaterial')

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

        // return 403 if material doesn't exist or
        //                                         material is not approved and user is not owner
        console.log(req.user.role)
        if (material === null || (material.approver === null && material.uploader.id !== req.user.id && req.user.role === 'USER'))
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
    const { query, dept, year, sem, cc: courseCode, uploaded_by: uploadedBy, page, exact, self } = req.query

    // check if self is true
    // then return materials belong to signed in user regardless approval status

    if (self === 'true') {
        try {
            const material = await prisma.material.findMany({
                where: {
                    uploader: {
                        id: req.user.id
                    }
                },
                select: {
                    id: true,
                    title: true,
                    approver: {
                        select: { id: true }
                    }
                }
            })

            if (material === null) return next(new RuetkitError(404, { detail: 'No upload yet' }))

            res.status(200).send(material)
        } catch (err) {
            console.log(err)
        } finally {
            prisma.$disconnect()
        }
    }

    // if self is false
    let containsOrSearch = exact === 'true' ? 'search' : 'contains'
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
                // only select the approved ones

                NOT: {
                    approver_id: null
                },
                // set up queries
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
            }
        })

        // rename user key as uploaded_by
        materials.map((material, index) => {
            const { uploader: uploaded_by, ...rest } = material
            materials[index] = { ...rest, uploaded_by }
        })

        res.status(200).send(materials)
    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.createMaterialMeta = async (req, res, next) => {
    // console.log(req.user)
    let { title, description, course_id: courseId, material_link_id: materialLinkId } = req.body

    if (title === null || title === undefined || title === '') {
        return next(new RuetkitError(400, {field: 'title', detail: 'Title is required'}))
    }

    // description is optional, leave it
    if (description === null || description === undefined || description === '') {
        description = ""
    }

    if (courseId === null || courseId === undefined || courseId === '') {
        return next(new RuetkitError(400, {field: 'course_id', detail: 'course_id is required'}))
    }
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
                },
                material_link: {connect: {id: materialLinkId}}
            }
        })
        res.send(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(403, { field: err.meta.target[0], detail: `${err.meta.target[0]} has been used already` }))
        } else if (err.code === 'P2025') {
            return next(new RuetkitError(400, { field: 'course_id', detail: 'Invalid course_id provided' }))
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
                    connect: { id: req.user.id }
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


exports.uploadMaterial = async (req, res, next) => {
    const {title} = req.body
    try {
        req.files[0].originalname = `[RuetKit] ${title} [${req.user.fullname}]`
        const uploadRes = await _uploadMaterial(req.files[0])

        const createDriveFileID = await prisma.material_Link.create({
            data: {
                drive_file_id: uploadRes.id,
                uploader: {
                    connect: {id: req.user.id}
                }
            }
        })
        res.status(200).send({id: createDriveFileID.id});
      } catch (f) {
          console.log(f)
        res.send(f.message);
      }
}