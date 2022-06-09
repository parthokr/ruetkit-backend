const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../../errors/ruetkit')
const prisma = new PrismaClient()

exports.listMaterials = async (req, res, next) => {
    // console.log(req.query)
    // if (req.query !== undefined) return _listFilteredMaterials(req, res, next)

    // default page is 1 and size is 10
    let { query, dept, year, sem, cc: courseCode, uploaded_by: uploadedBy, page=1, exact, size=20, approved } = req.query

    page = Number(page)
    size = Number(size)
    console.log(approved)
    
    let containsOrSearch = exact === 'true' ? 'search' : 'contains'
    try {
        let materials = await prisma.material.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                course: {
                    select: { 
                        id: true, 
                        code: true, 
                        title: true, 
                        semester: true, 
                        year: true, 
                        department: { 
                            select: { 
                                id: true, 
                                acronym: true, 
                                description: true 
                            } 
                        } 
                    }
                },
                is_uploaded_anonymously: true,
                material_link: {
                    select: { drive_file_id: true }
                },
                thumbnail_link: {
                    select: { url: true }
                },
                uploader: {
                    select: { id: true, fullname: true, role: true }
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
                }),
                ...(approved === 'true' && {NOT: {approver: null}}),
                ...(approved === 'false' && {approver: null})
            },
            orderBy: [
                // { like_count: 'desc' },
                { title: 'asc' }
            ],
            skip: (page-1)*size,
            take: size
        })


        materials = materials.map((material, _index) => {
            // determine if current signed in user has liked this material
            material['liked'] = false
            if (material.liked_by.includes(req.user.id)) {
                material['liked'] = true
            }

            // count number of likes
            material['liked_by'] = material.liked_by.length

            // replace .... with System
            if (material.approver?.id === Number(process.env.SYSTEM_ID)) {
                material.approver.fullname = 'System'
            }
            
            // rename user key as uploaded_by
            const { uploader: uploaded_by, ...rest } = material
            material = { ...rest, uploaded_by }


            // replace fullname with anonymous for anonoymously uploaded material
            if (material.is_uploaded_anonymously) {
                delete material['uploaded_by']
                material.uploaded_by = {fullname: 'Anonymous'}
            }
            
            // delete is_uploaded_anonymously attribute
            delete material['is_uploaded_anonymously']

            // return material
            return material
        })

        const found = await prisma.material.count({
            where: {
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
                }),
                ...(approved === 'true' && {NOT: {approver: null}}),
                ...(approved === 'false' && {approver: null})
            }
        })

        res.status(200).send({materials, found})
    } catch (err) {
        console.log(err)
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
        res.status(200).send({
            approver: {
                id: req.user.id
            }
        })
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


exports.disproveMaterial = async (req, res, next) => {
    const { materialId } = req.params

    // TODO chheck if materialId is not number

    try {
        const material = await prisma.material.update({
            data: {
                approver: {disconnect: true}
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

exports.deleteMaterial = async (req, res, next) => {
    const { materialId } = req.params
    console.log(materialId);

    // TODO chheck if materialId is not number

    try {
        const material = await prisma.material.delete({
            where: {
                id: Number(materialId)
            }
        })
        res.status(204).send({id: materialId})
        // console.log(material)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2025') {
            return res.status(404).send({detail: 'Requested material was not found'})
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }
}