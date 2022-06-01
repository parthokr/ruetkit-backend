const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()

exports.listAllDepartments = async (req, res, next) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: {
                acronym: 'asc'
            }
        })
        res.send(departments)
    } catch(err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}

exports.createDeapartment = async (req, res, next) => {
    const {acronym, description} = req.body
    if (acronym === null || acronym === undefined || acronym === '') return next(new RuetkitError(400, {field: 'acronym', detail: 'Acronym is required'}))
    if (description === null || description === undefined || description === '') return next(new RuetkitError(400, {field: 'description', detail: 'Description is required'}))
    
    try {
        const departments = await prisma.department.create({
            data: {
                acronym: acronym.toUpperCase(),
                description
            }
        })
        res.sendStatus(200)
    } catch(err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(403, {field: err.meta.target[0], detail: `${err.meta.target[0]} has been used already`}))
        }
    } finally {
        prisma.$disconnect()
    }
}

exports.listCoursesOfADepartment = async (req, res, next) => {
    const {departmentId} = req.params

    if (departmentId === null || departmentId === '' || departmentId === undefined) {
        return next(new RuetkitError(400, {detail: 'Please specify a department'}))
    }

    try {
        const courseOfADepartment = await prisma.department.findUnique({
            select: {
                course: {
                    select: {
                        id: true,
                        code: true,
                        title: true
                    }
                }
            },
            where: {
                id: Number(departmentId)
            }
        })
        if (courseOfADepartment === null) {
            return next(new RuetkitError(404, {detail: 'Department was not found'}))
        }
        res.status(200).send(courseOfADepartment.course)
    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}