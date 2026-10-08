const jwt = require('jsonwebtoken');

// Accepts "077 123 4567", "077-1234567", "+94771234567" and returns "0771234567"
function normalizeMobile(input) {
  let m = String(input || '').replace(/[\s-]/g, '');
  if (m.startsWith('+94')) m = '0' + m.slice(3);
  return m;
}
const isValidMobile = (m) => /^0\d{9}$/.test(m);

const signToken = (parent) =>
  jwt.sign({ id: parent._id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

const demoMode = () => process.env.DEMO_MODE !== 'false';
const makeOtp = () => (demoMode() && process.env.DEMO_OTP) || String(Math.floor(100000 + Math.random() * 900000));

module.exports = { normalizeMobile, isValidMobile, signToken, demoMode, makeOtp };
