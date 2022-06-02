const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')

const multer = require('multer');
const upload = multer();

const materialRoute = express.Router()

const materialController = require('../controllers/materialController')

materialRoute.get('/', [auth], materialController.listMaterials)

materialRoute.get('/:materialId', [auth], materialController.getMaterial)

materialRoute.post('/', [auth], materialController.createMaterialMeta)

materialRoute.post('/check', [auth], materialController.checkMaterialTitle)

materialRoute.delete('/:materialId', [auth], materialController.deleteMaterial)

materialRoute.patch('/:materialId/approve', [auth, requireStaffOrAdmin], materialController.approveMaterial)

materialRoute.post('/upload', [auth, upload.any()], materialController.uploadMaterial)

module.exports = materialRoute