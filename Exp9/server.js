const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/verifyToken');
const { generateToken } = require('./utils/jwt');

app.use(express.json());

// Public route to login and generate token
app.post('/login', (req, res) => {
  const user = { name: req.body.name || 'User', id: 1 };
  const token = generateToken(user);
  res.json({ token });
});

// Protected route
app.get('/dashboard', verifyToken, (req, res) => {
  res.json({ message: `Welcome ${req.user.name}` });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
