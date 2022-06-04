const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()
const {uploadMaterial : _uploadMaterial} = require('../services/uploadMaterial')
const {uploadThumbnail: _uploadThumbnail} = require('../services/uploadThumbnail')
const {v4: uuidv4} = require('uuid')

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

    // WARNING this block is for owner's lookup
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
                course: {
                    select: { id: true, code: true, title: true, semester: true, year: true, department: { select: { id: true, acronym: true, description: true } } }
                },
                material_link: {
                    select: {drive_file_id: true}
                },
                thumbnail_link: {
                    select: {url: true}
                },
                uploader: {
                    select: { id: true, fullname: true }
                },
                approver: {
                    select: {
                        id: true,
                        fullname: true
                    }
                },
                liked_by: true
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
            },
            orderBy: {
                liked_by: 'desc'
            }
        })

        // rename user key as uploaded_by
        materials.map((material, index) => {
            const { uploader: uploaded_by, ...rest } = material
            materials[index] = { ...rest, uploaded_by }
        })

        // determine if current signed in user has liked this material

        materials.map((material, index) => {
            material['liked'] = false
            if (material.liked_by.includes(req.user.id)) {
                material['liked'] = true
            }
        })

        // count liked by

        materials.map((material, index) => {
            material['liked_by'] = material.liked_by.length
        })

        // delete liked_by
        delete materials['liked_by']

        res.status(200).send(materials)
    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.createMaterialMeta = async (req, res, next) => {
    // console.log(req.user)
    let { title, 
        description, 
        course_id: courseId, 
        material_link_id: materialLinkId,
        // thumbnail_link_id: thumbnailLinkId,
        thumbnail_link: thumbnailLink
    } = req.body

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

    if (materialLinkId === null || materialLinkId === undefined || materialLinkId === '') {
        return next(new RuetkitError(400, {field: 'material_link_id', detail: 'material_link_id is required'}))
    }

    // if (thumbnailLinkId === null || thumbnailLinkId === undefined || thumbnailLinkId === '') {
    //     return next(new RuetkitError(400, {field: 'thumbnail_link_id', detail: 'thumbnail_link_id is required'}))
    // }

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
                material_link: {connect: {id: materialLinkId}},
                thumbnail_link: {
                    create: {url: thumbnailLink, uploader: {connect: {id: req.user.id}}}
                },
                liked_by: {
                    set: [req.user.id]
                }
            }
        })
        res.send(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(403, { field: err.meta.target[0], detail: `${err.meta.target[0]} is not available` }))
        } else if (err.code === 'P2025') {
            // return next(new RuetkitError(400, { field: 'course_id', detail: 'Invalid course_id provided' }))

            // may be course_id or material_link_id or thumbnail_link_id is invalid
            return next(new RuetkitError(400, {detail: 'Bad request body'}))
        }
        return next(new RuetkitError())
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
        req.files[0].originalname = `[RuetKit]_${uuidv4()}_${title}`
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
      } finally {
          prisma.$disconnect()
      }
}

exports.checkMaterialTitle = async (req, res, next) => {
    let {title} = req.body
    title = title.trim().toLowerCase()
    if (title === null || title === undefined || title === '') {
        return next(new RuetkitError(400, {field: 'title', detail: 'Title is required'}))
    }
    try {
        const searchTitle = await prisma.material.findMany({
            where: {
                title: {
                    contains: title,
                    mode: 'insensitive'
                }
            },
            take: 1
        })
        if (searchTitle[0]?.title.toLocaleLowerCase() === title) { // equivalent to searchTitle[0] && searchTitle[0].title.toLowerCase() === title
            return res.sendStatus(403)
        } 
        res.sendStatus(200)
    } catch (err) {
        console.log(err);
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}


exports.uploadThumbnail = async (req, res, next) => {
    try {
        req.files[0].originalname = `${uuidv4()}`
        const uploadRes = await _uploadThumbnail(req.files[0])

        const createDriveFileID = await prisma.thumnail_Link.create({
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
      } finally {
          prisma.$disconnect()
      }
}

exports.toggleLike = async (req, res, next) => {
    const {materialId} = req.params

    try {
        const material = await prisma.material.findFirst({
            where: {
                id: Number(materialId)
            }
        })
        // handle if user alreaady liked this material
        if (material.liked_by.includes(req.user.id)) {
            // unlike this material

            const liked_by = material.liked_by
            delete liked_by[liked_by.indexOf(req.user.id)]
            await prisma.material.update({
                where: {
                    id: Number(materialId)
                },
                data: {
                    liked_by: {
                        set: liked_by
                    }
                }
            })
            res.status(200).send({unliked: true})
        } else {
            await prisma.material.update({
                where: {
                    id: Number(materialId)
                },
                data: {
                    liked_by: {
                        push: req.user.id
                    }
                }
            })
            res.status(200).send({liked: true})
        }
    } catch(err) {
        console.log(err)
        return next(new RuetkitError())
    }
}