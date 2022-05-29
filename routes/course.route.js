const express = require('express')
const auth = require('../middlewares/auth')
const requireStaff = require('../middlewares/requireStaff')
const courseRoute = express.Router()

const courseRoute = require('../controllers/departmentController')

courseRoute.get('/', [auth, requireStaff], departmentController.listAllDepartments)
courseRoute.post('/', [auth, requireStaff], departmentController.createDeapartment)

module.exports = departmentRoute