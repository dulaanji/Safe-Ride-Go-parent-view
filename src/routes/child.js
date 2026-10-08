const router = require('express').Router();
const auth = require('../middleware/auth');
const Child = require('../models/Child');

router.use(auth);

// READ
router.get('/', async (req, res) => {
  const child = await Child.findOne({ parent: req.parent._id });
  if (!child) return res.status(404).json({ message: 'No child linked to your account yet' });
  res.json({ child });
});

// UPDATE: only fields a parent may change (school controls name, van and driver)
router.put('/', async (req, res) => {
  const child = await Child.findOne({ parent: req.parent._id });
  if (!child) return res.status(404).json({ message: 'No child linked to your account yet' });
  if (req.body.pickupStop !== undefined) {
    const stop = String(req.body.pickupStop).trim();
    if (!stop) return res.status(400).json({ message: 'Pickup stop cannot be empty' });
    child.pickupStop = stop;
  }
  if (req.body.emergencyContact !== undefined) {
    const num = String(req.body.emergencyContact).replace(/[\s-]/g, '');
    if (num && !/^0\d{9}$/.test(num)) return res.status(400).json({ message: 'Emergency contact must be a 10-digit number' });
    child.emergencyContact = num;
  }
  await child.save();
  res.json({ child });
});

module.exports = router;
