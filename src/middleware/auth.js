const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const parent = await Parent.findById(payload.id);
    if (!parent) return res.status(401).json({ message: 'Account no longer exists' });
    req.parent = parent;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please sign in again' });
  }
};
