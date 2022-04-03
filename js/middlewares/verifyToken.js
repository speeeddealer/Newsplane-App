const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.cookies.JWT;
    if (!token) {
        req.isVerified = false;
        next();
    } else {
        try {
            req.isVerified = jwt.verify(token, process.env.TOKEN_SECRET);
            next();
        } catch (err) {
            return res.status(400).send('Invalid Token');
        }
    }
};