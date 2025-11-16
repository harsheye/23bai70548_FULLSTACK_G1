const jwt = require('jsonwebtoken');
const secretKey = 'yourSecretKey';

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access Denied' });

  try {
    const verified = jwt.verify(token, secretKey);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid Token' });
  }
}

module.exports = verifyToken;
