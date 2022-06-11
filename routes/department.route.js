const express = require('express')
const auth = require('../middlewares/auth')

const departmentRoute = express.Router()

const departmentController = require('../controllers/departmentController')

departmentRoute.get('/', [auth], departmentController.listAllDepartments)
departmentRoute.get('/:departmentId/courses', departmentController.listCoursesOfADepartment)

module.exports = departmentRoute