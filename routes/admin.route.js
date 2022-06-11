const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')
const adminRoute = express.Router()

const materialAdminController = require('../controllers/admin/materialAdminController')
const departmentAdminController =  require('../controllers/admin/departmentAdminController')

adminRoute.get('/materials', [auth, requireStaffOrAdmin], materialAdminController.listMaterials)
adminRoute.patch('/materials/:materialId/approve', [auth, requireStaffOrAdmin], materialAdminController.approveMaterial)
adminRoute.patch('/materials/:materialId/disprove', [auth, requireStaffOrAdmin], materialAdminController.disproveMaterial)
adminRoute.delete('/materials/:materialId', [auth, requireStaffOrAdmin], materialAdminController.deleteMaterial)


adminRoute.get('/departments/:departmentId', [auth, requireStaffOrAdmin], departmentAdminController.getDepartment)
adminRoute.post('/departments', [auth, requireStaffOrAdmin], departmentAdminController.createDeapartment)
adminRoute.patch('/departments/:departmentId', [auth, requireStaffOrAdmin], departmentAdminController.updateDepartment)
module.exports = adminRoute