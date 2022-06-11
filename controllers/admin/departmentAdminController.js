const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../../errors/ruetkit')
const prisma = new PrismaClient()

function capitalize(word) {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

exports.getDepartment = async (req, res, next) => {
    const {departmentId} = req.params
    const {acronym, description} = req.body
    try {
        const department = await prisma.department.findUnique({
            where: {
                id: Number(departmentId)
            }
        })
        if (department === null) return next(new RuetkitError(404, {detail: 'Requested department was not found'}))
        res.status(200).send(department)
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
            return next(new RuetkitError(403, {field: err.meta.target[0], detail: `${capitalize(err.meta.target[0])} has been added already`}))
        }
    } finally {
        prisma.$disconnect()
    }
}

exports.updateDepartment = async (req, res, next) => {
    const {departmentId} = req.params
    const {acronym, description} = req.body
    if (acronym === null || acronym === undefined || acronym === '') return next(new RuetkitError(400, {field: 'acronym', detail: 'Acronym is required'}))
    if (description === null || description === undefined || description === '') return next(new RuetkitError(400, {field: 'description', detail: 'Description is required'}))
    
    try {
        const departments = await prisma.department.update({
            data: {
                acronym: acronym.toUpperCase(),
                description
            },
            where: {id: Number(departmentId)}
        })
        res.sendStatus(200)
    } catch(err) {
        console.log(err)
        if (err.code === 'P2002') {
            return next(new RuetkitError(403, {field: err.meta.target[0], detail: `${capitalize(err.meta.target[0])} has been added already`}))
        }
    } finally {
        prisma.$disconnect()
    }
}