const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')
const departmentRoute = express.Router()

const departmentController = require('../controllers/departmentController')

departmentRoute.get('/', [auth], departmentController.listAllDepartments)
departmentRoute.get('/:departmentId/courses', departmentController.listCoursesOfADepartment)
departmentRoute.post('/', [auth, requireStaffOrAdmin], departmentController.createDeapartment)

module.exports = departmentRoute