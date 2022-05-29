const express = require('express')
const auth = require('../middlewares/auth')
const requireStaff = require('../middlewares/requireStaff')
const courseRoute = express.Router()

const courseController = require('../controllers/courseController')

courseRoute.get('/', [auth, requireStaff], courseController.listCourse)
courseRoute.post('/', [auth, requireStaff], courseController.createCourse)

module.exports = courseRoute