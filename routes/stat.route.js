const express = require('express')
const auth = require('../middlewares/auth')
const statRoute = express.Router()
const statController = require('../controllers/statController')

statRoute.get('/', [auth], statController.fetchSiteStat)

module.exports = statRoute