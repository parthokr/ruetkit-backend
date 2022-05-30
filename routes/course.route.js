const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')
const courseRoute = express.Router()

const courseController = require('../controllers/courseController')

courseRoute.get('/', [auth, requireStaffOrAdmin], courseController.listCourse)
courseRoute.post('/', [auth, requireStaffOrAdmin], courseController.createCourse)

module.exports = courseRoute