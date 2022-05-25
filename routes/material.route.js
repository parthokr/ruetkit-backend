const express = require('express')
const auth = require('../middlewares/auth')
const materialRoute = express.Router()

materialRoute.get('/', [auth], async (req, res, next) => {
    res.send('Protected route')
})

module.exports = materialRoute