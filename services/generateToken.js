const jwt = require('jsonwebtoken')


const generateAccessToken = async (payload) => {
    const accessToken = jwt.sign(payload, process.env.JWT_PRIVATE_KEY, {expiresIn: '7d'})
    return accessToken
}

const generateRefreshToken = async (payload) => {
    const refreshToken = jwt.sign(payload, process.env.JWT_PRIVATE_KEY, {expiresIn: '30d'})
    return refreshToken
}

module.exports = {
    generateAccessToken,
    generateRefreshToken
}