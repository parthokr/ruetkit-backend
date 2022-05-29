const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()

exports.createCourse = async (req, res, next) => {
    const {code, title, department_id: departmentId} = req.body
    // TODO handle malformed request body


    let year, semester;
    switch(code.split(' ')[1][0]) {
        case '1':
            year = 1
            break
        case '2':
            year = 2
            break
        case '3':
            year = 3
            break
        case '4':
             year = 4
             break
        default:
            year = undefined
    }    
    switch (code.split(' ')[1][1]) {
        case '1':
            semester = 'ODD'
            break
        case '2':
            semester = 'EVEN'
            break
        default:
            semester = undefined
    } 

    if (year === undefined || semester === undefined) {
        return next(new RuetkitError(400, {field: 'coode', detail: 'Invalid course code provided'}))
    } 

    try {
        const course = await prisma.course.create({
            data: {
                code,
                title,
                year,
                semester,
                department: {
                    connect: {id: departmentId}
                }
            }
        })

        res.status(201).send(course)
    } catch (err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(400, {detail: 'This course has already been added'}))
        }
    } finally {
        prisma.$disconnect()
    }

}

exports.listCourse = async (req, res, next) => {
    try {
        const course = await prisma.course.findMany({
            select: {
                id: true,
                code: true,
                title: true,
                year: true,
                semester: true,
                department: {
                    select: {
                        id: true,
                        acronym: true,
                        description: true
                    }
                }
            }
        })
        res.status(200).send(course)
    } catch (err) {
        console.log(err)
    } finally {
        prisma.$disconnect()
    }
}