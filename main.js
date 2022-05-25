const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors({
    origin: 'http://localhost:3000'
}))
app.use(express.json())
app.use((err, req, res, next) => {
    // This check makes sure this is a JSON parsing issue, but it might be
    // coming from any middleware, not just body-parser:

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(err);
        return res.sendStatus(400); // Bad request
    }

    next();
});

const userRoute = require('./routes/user.route')
const materialRoute = require('./routes/material.route')

app.use('/api/users', userRoute)
app.use('/api/materials', materialRoute)

app.use((err, req, res, next) => {
    res.status(err.code).send({error: err.message})
})


app.listen('8000', () => {
    console.log('Server running at port 8000');
})