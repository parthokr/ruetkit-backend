const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors({
    origin: ['http://localhost:3000', 'https://parthokr.github.io', 'https://ruetkit.github.io', 'https://ruetkit.live/', 'http://192.168.0.101:3000']
}))
app.use(express.json())
app.use((err, req, res, next) => {
    // This check makes sure this is a JSON parsing issue

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(err);
        return res.sendStatus(400); // Bad request
    }

    next();
});

const userRoute = require('./routes/user.route')
const materialRoute = require('./routes/material.route')
const departmentRoute = require('./routes/department.route')
const courseRoute = require('./routes/course.route')
const statRoute = require('./routes/stat.route')
const adminRoute = require('./routes/admin.route')
const notificationRoute = require('./routes/notification.route')

app.use('/api/users', userRoute)
app.use('/api/departments', departmentRoute)
app.use('/api/materials', materialRoute)
app.use('/api/courses', courseRoute)
app.use('/api/stat', statRoute)
app.use('/api/admin', adminRoute)
app.use('/api/notifications', notificationRoute)

app.use((err, req, res, next) => {
    res.status(err.code).send({error: err.message})
})


app.listen(process.env.PORT || 8000, () => {
    console.log('Server running at port 8000');
})