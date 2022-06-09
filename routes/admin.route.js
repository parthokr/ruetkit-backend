const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')
const adminRoute = express.Router()

const materialAdminController = require('../controllers/admin/materialAdminController')

adminRoute.get('/materials', [auth, requireStaffOrAdmin], materialAdminController.listMaterials)
adminRoute.patch('/materials/:materialId/approve', [auth, requireStaffOrAdmin], materialAdminController.approveMaterial)
adminRoute.patch('/materials/:materialId/disprove', [auth, requireStaffOrAdmin], materialAdminController.disproveMaterial)
adminRoute.delete('/materials/:materialId', [auth, requireStaffOrAdmin], materialAdminController.deleteMaterial)
module.exports = adminRoute