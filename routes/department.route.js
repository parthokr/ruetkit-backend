const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')
const departmentRoute = express.Router()

const departmentController = require('../controllers/departmentController')

departmentRoute.get('/', [auth, requireStaffOrAdmin], departmentController.listAllDepartments)
departmentRoute.post('/', [auth, requireStaffOrAdmin], departmentController.createDeapartment)

module.exports = departmentRoute