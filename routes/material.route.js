const express = require('express')
const auth = require('../middlewares/auth')
const requireStaff = require('../middlewares/requireStaff')

const materialRoute = express.Router()

const materialController = require('../controllers/materialController')

materialRoute.get('/', [auth], materialController.listMaterials)

materialRoute.get('/:materialId', [auth], materialController.getMaterial)


materialRoute.post('/', [auth], materialController.createMaterialMeta)

materialRoute.delete('/:materialId', [auth], materialController.deleteMaterial)

materialRoute.patch('/:materialId/approve', [auth, requireStaff], materialController.approveMaterial)

module.exports = materialRoute