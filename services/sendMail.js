require('dotenv').config()

const nodemailer = require('nodemailer')
const nodeMailgun = require('nodemailer-mailgun-transport')

const auth = {
    auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
    }
}

const transport = nodemailer.createTransport(nodeMailgun(auth))


exports.sendMail = ({to, subject, text}) => {
    const mailOptions = {
        from: 'RuetKit <noreply@mail.ruetkit.live>',
        to,
        subject,
        html: text
    }
    transport.sendMail(mailOptions, (err, data) => {
    console.log(err);
    console.log(data);
})
}
