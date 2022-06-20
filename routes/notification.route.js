const express = require('express')
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')
const notificationRoute = express.Router()

const notificationController = require('../controllers/notificationController')

notificationRoute.get('/unread/count', [auth], notificationController.countNotifications)
notificationRoute.get('/', [auth], notificationController.listNotifications)
notificationRoute.patch('/:notificationID/read', [auth], notificationController.markAsRead)
notificationRoute.patch('/:notificationID/unread', [auth], notificationController.markAsUnread)
notificationRoute.post('/', [auth], notificationController.createNotification)


module.exports = notificationRoute