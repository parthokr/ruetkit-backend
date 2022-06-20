require('dotenv').config()
const express = require('express')
const userRoute = express.Router()

// import all middlewares
const auth = require('../middlewares/auth')
const requireStaffOrAdmin = require('../middlewares/requireStaffOrAdmin')

const userController = require('../controllers/userController')

userRoute.post('/signup', userController.signUp)

userRoute.post('/signin', userController.signIn)

// verify user
userRoute.post('/:id/verify', userController.verify)

// resend verification code
// TODO make it patch
userRoute.patch('/:id/verify', userController.resendVerification)

// verify existing access token
userRoute.post('/token', [auth], userController.verifyToken)

// refresh access token using refreshToken
userRoute.post('/token/refresh', userController.refreshToken)

// send password reset verification code
userRoute.get('/:ruetId/password/reset', userController.sendPasswordResetVerification)

// resend password reset verification code
userRoute.patch('/:id/password/reset', userController.resendPasswordResetVerification)

// verify password reset verification code (ping)
userRoute.post('/:id/password/reset/verify', userController.verifyPasswordResetVerification)

// reset password
userRoute.post('/:id/password/reset', userController.resetPassword)

// save fcm token to firebase realtime database
userRoute.post('/fcm', [auth], userController.saveFCMToken)


module.exports = userRoute