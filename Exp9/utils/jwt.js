const jwt = require('jsonwebtoken');
const secretKey = 'yourSecretKey';

function generateToken(user) {
  return jwt.sign(user, secretKey, { expiresIn: '1h' });
}

module.exports = { generateToken };
