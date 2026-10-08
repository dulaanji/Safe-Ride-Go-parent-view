const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const Parent = require('../models/Parent');
const Child = require('../models/Child');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const Feedback = require('../models/Feedback');
const PickupNote = require('../models/PickupNote');
const { normalizeMobile, isValidMobile } = require('../utils/helpers');

router.use(auth);

// READ
router.get('/', async (req, res) => {
  const child = await Child.findOne({ parent: req.parent._id });
  res.json({ parent: req.parent.toSafeJSON(), child });
});

// UPDATE: display name and mobile number
router.put('/', async (req, res) => {
  const p = req.parent;
  if (req.body.displayName !== undefined) {
    const name = String(req.body.displayName).trim();
    if (name.length < 2) return res.status(400).json({ message: 'Display name is too short' });
    p.displayName = name;
  }
  if (req.body.mobile !== undefined) {
    const mobile = normalizeMobile(req.body.mobile);
    if (!isValidMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    if (mobile !== p.mobile && (await Parent.exists({ mobile }))) return res.status(409).json({ message: 'That mobile number is already registered' });
    p.mobile = mobile;
  }
  await p.save();
  res.json({ parent: p.toSafeJSON() });
});

// UPDATE: alert channel toggles
router.put('/channels', async (req, res) => {
  for (const key of ['app', 'sms', 'whatsapp']) {
    if (typeof req.body[key] === 'boolean') req.parent.alertChannels[key] = req.body[key];
  }
  await req.parent.save();
  res.json({ parent: req.parent.toSafeJSON() });
});

// DELETE: remove the account and every record that belongs to it
router.delete('/', async (req, res) => {
  const ok = await bcrypt.compare(String(req.body?.password || ''), req.parent.passwordHash);
  if (!ok) return res.status(403).json({ message: 'Password is incorrect' });
  const filter = { parent: req.parent._id };
  await Promise.all([Child.deleteMany(filter), Trip.deleteMany(filter), Alert.deleteMany(filter), Feedback.deleteMany(filter), PickupNote.deleteMany(filter)]);
  await req.parent.deleteOne();
  res.json({ message: 'Account deleted' });
});

module.exports = router;
