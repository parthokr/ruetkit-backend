const express = require('express')
const auth = require('../middlewares/auth')
const materialRoute = express.Router()

const materialController = require('../controllers/materialController')

materialRoute.get('/', [auth], materialController.listMaterials)

materialRoute.get('/:materialId', [auth], materialController.getMaterial)


materialRoute.post('/', [auth], materialController.createMaterialMeta)

materialRoute.delete('/:materialId', [auth], materialController.deleteMaterial)

module.exports = materialRoute