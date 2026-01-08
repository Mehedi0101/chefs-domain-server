const express = require('express');
const jwt = require('jsonwebtoken');

const tokenRouter = express.Router();

// authentication middleware
// tokenRouter.use(authMiddleware);

// token creation
tokenRouter.post('/', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    res
        .cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        })
        .send({ success: true });
})



// clearing token after user logout
tokenRouter.post('/logout', async (req, res) => {
    res.clearCookie('token', { maxAge: 0 }).send({ success: true });
})

module.exports = { tokenRouter };