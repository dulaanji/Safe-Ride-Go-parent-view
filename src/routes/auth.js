const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Parent = require('../models/Parent');
const { seedForParent } = require('../utils/seed');
const { normalizeMobile, isValidMobile, signToken, demoMode, makeOtp } = require('../utils/helpers');

async function issueOtp(parent) {
  parent.otpCode = makeOtp();
  parent.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await parent.save();
  // Real SMS provider would be called here. Demo mode returns the code to the app.
  return demoMode() ? parent.otpCode : undefined;
}

// CREATE: register a parent account (step 1 of 2)
router.post('/register', async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const mobile = normalizeMobile(req.body.mobile);
  const password = String(req.body.password || '');
  if (fullName.length < 2) return res.status(400).json({ message: 'Please enter your full name' });
  if (!isValidMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  let parent = await Parent.findOne({ mobile });
  if (parent && parent.verified) return res.status(409).json({ message: 'That mobile number is already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  if (parent) { parent.fullName = fullName; parent.passwordHash = passwordHash; }
  else parent = new Parent({ fullName, displayName: fullName, mobile, passwordHash });
  const demoCode = await issueOtp(parent);
  res.status(201).json({ mobile, demoCode });
});

router.post('/resend', async (req, res) => {
  const parent = await Parent.findOne({ mobile: normalizeMobile(req.body.mobile) });
  if (!parent || parent.verified) return res.status(404).json({ message: 'No pending verification for this number' });
  res.json({ demoCode: await issueOtp(parent) });
});

// UPDATE: verify the OTP, mark account verified and link the child
router.post('/verify', async (req, res) => {
  const parent = await Parent.findOne({ mobile: normalizeMobile(req.body.mobile) });
  const code = String(req.body.code || '').trim();
  if (!parent) return res.status(404).json({ message: 'Account not found' });
  if (!parent.otpCode || parent.otpExpires < new Date()) return res.status(400).json({ message: 'Code expired, tap Resend code' });
  if (parent.otpCode !== code) return res.status(400).json({ message: 'Incorrect code, please try again' });
  parent.verified = true;
  parent.otpCode = undefined;
  parent.otpExpires = undefined;
  await parent.save();
  await seedForParent(parent);
  res.json({ token: signToken(parent), parent: parent.toSafeJSON() });
});

router.post('/login', async (req, res) => {
  const mobile = normalizeMobile(req.body.mobile);
  const parent = await Parent.findOne({ mobile });
  const ok = parent && (await bcrypt.compare(String(req.body.password || ''), parent.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Mobile number or password is incorrect' });
  if (!parent.verified) {
    const demoCode = await issueOtp(parent);
    return res.status(403).json({ message: 'Please verify your mobile number', needsVerification: true, mobile, demoCode });
  }
  res.json({ token: signToken(parent), parent: parent.toSafeJSON() });
});

module.exports = router;
