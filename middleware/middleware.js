const jwt = require('jsonwebtoken');


const validateUser = (req, res, next) => {
    const bearerHeader =
        req.body.token || req.query.token || req.headers["x-access-token"] || req.headers["authorization"];
    const token = bearerHeader?.split(' ')[1];
    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        const decoded = jwt.verify(token, 'muhatacece');
        req.user = decoded.user;
    } catch (err) {
        return res.status(401).send("Invalid Token");
    }
    return next();
};

module.exports = {
    validateUser: validateUser
}

