const router = require('express').Router();
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

router.use(auth);

// READ (filter with ?unread=true)
router.get('/', async (req, res) => {
  const filter = { parent: req.parent._id };
  if (req.query.unread === 'true') filter.read = false;
  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await Alert.countDocuments({ parent: req.parent._id, read: false });
  res.json({ alerts, unreadCount });
});

// CREATE
router.post('/', async (req, res) => {
  const alert = await Alert.create({
    parent: req.parent._id, type: req.body.type, title: req.body.title, body: req.body.body,
  });
  res.status(201).json({ alert });
});

// UPDATE: mark all as read (declared before /:id routes)
router.patch('/read-all', async (req, res) => {
  const r = await Alert.updateMany({ parent: req.parent._id, read: false }, { read: true });
  res.json({ updated: r.modifiedCount });
});

// UPDATE: mark one as read / unread
router.patch('/:id', async (req, res) => {
  const alert = await Alert.findOneAndUpdate(
    { _id: req.params.id, parent: req.parent._id },
    { read: req.body.read !== false },
    { returnDocument: 'after' }
  );
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  res.json({ alert });
});

// DELETE
router.delete('/:id', async (req, res) => {
  const alert = await Alert.findOneAndDelete({ _id: req.params.id, parent: req.parent._id });
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  res.json({ message: 'Alert deleted' });
});

module.exports = router;
