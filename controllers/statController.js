const { PrismaClient } = require('@prisma/client')
const RuetkitError = require('../errors/ruetkit')
const prisma = new PrismaClient()

exports.fetchSiteStat = async (req, res, next) => {
    try {
        const users = await prisma.user.count()
        const materials = await prisma.material.count()
        const approvedMaterials = await prisma.material.count({where: {approver_id: {not: null}}})
        res.status(200).send({users, materials, approved_materials: approvedMaterials})
    } catch (err) {
        console.log(err);
    } finally {
        prisma.$disconnect()
    }
}