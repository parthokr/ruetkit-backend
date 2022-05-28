const express = require('express')
const auth = require('../middlewares/auth')
const requireStaff = require('../middlewares/requireStaff')
const departmentRoute = express.Router()

const departmentController = require('../controllers/departmentController')

departmentRoute.get('/', [auth, requireStaff], departmentController.listAllDepartments)
departmentRoute.post('/', [auth, requireStaff], departmentController.createDeapartment)

module.exports = departmentRoute