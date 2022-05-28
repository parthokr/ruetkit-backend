const express = require('express')
const auth = require('../middlewares/auth')
const materialRoute = express.Router()

const materialController = require('../controllers/materialController')

materialRoute.get('/', [auth], materialController.listMaterials)

materialRoute.post('/', [auth], materialController.createMaterialMeta)

module.exports = materialRoute