const bcrypt = require('bcrypt')
exports.checkPassword = async (password1, password2) => {
    return await bcrypt.compare(password1, password2)
}