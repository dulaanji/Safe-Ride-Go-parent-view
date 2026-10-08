const router = require('express').Router();
const auth = require('../middleware/auth');
const Trip = require('../models/Trip');
const PickupNote = require('../models/PickupNote');

router.use(auth);

const activeTrip = (parentId) => Trip.findOne({ parent: parentId, status: 'active' }).sort({ createdAt: -1 });

// READ: notes for today's journey
router.get('/', async (req, res) => {
  const trip = await activeTrip(req.parent._id);
  if (!trip) return res.json({ notes: [] });
  res.json({ notes: await PickupNote.find({ parent: req.parent._id, trip: trip._id }).sort({ createdAt: -1 }) });
});

// CREATE: "Need to tell the driver?" pickup note
router.post('/', async (req, res) => {
  const trip = await activeTrip(req.parent._id);
  if (!trip) return res.status(404).json({ message: 'No active journey to attach a note to' });
  const note = await PickupNote.create({ parent: req.parent._id, trip: trip._id, text: req.body.text });
  res.status(201).json({ note });
});

// UPDATE
router.put('/:id', async (req, res) => {
  const note = await PickupNote.findOne({ _id: req.params.id, parent: req.parent._id });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.text = req.body.text;
  await note.save();
  res.json({ note });
});

// DELETE
router.delete('/:id', async (req, res) => {
  const note = await PickupNote.findOneAndDelete({ _id: req.params.id, parent: req.parent._id });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  res.json({ message: 'Note deleted' });
});

module.exports = router;
