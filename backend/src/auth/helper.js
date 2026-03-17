const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    const payload = {
        id,
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const options = {
    maxAge: 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
}

module.exports = { generateToken, options };