const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()

const isCourseCodeValid = (code) => {
    const codePart1 = code.split(' ')[0]
    const codePart2 = code.split(' ')[1]
    
    return /^[A-Z]+$/.test(codePart1) && /^[0-9]+$/.test(codePart2)
  }

exports.createCourse = async (req, res, next) => {
    const {code, title, department_id: departmentId} = req.body

    
    try {
        if (!isCourseCodeValid(code)) return next(new RuetkitError(400, {field: 'code', 'detail': 'Invalid course code provided'}))

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
    
        // will it even hit?
        if (year === undefined || semester === undefined) {
            return next(new RuetkitError(400, {field: 'code', detail: 'Invalid course code provided'}))
        } 


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
            return next(new RuetkitError(400, {field: 'code', detail: 'This course has already been added'}))
        }
        return next(new RuetkitError())
    } finally {
        prisma.$disconnect()
    }

}

// List all courses (staff purpose)
exports.listCourse = async (req, res, next) => {
    const {dept: departmentId} = req.query
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