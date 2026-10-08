const router = require('express').Router();
const auth = require('../middleware/auth');
const Trip = require('../models/Trip');
const Feedback = require('../models/Feedback');

router.use(auth);

// READ
router.get('/', async (req, res) => {
  const filter = { parent: req.parent._id };
  if (req.query.tripId) filter.trip = req.query.tripId;
  res.json({ feedback: await Feedback.find(filter).sort({ createdAt: -1 }) });
});

// CREATE: rate a completed journey
router.post('/', async (req, res) => {
  const trip = await Trip.findOne({ _id: req.body.tripId, parent: req.parent._id, status: 'completed' });
  if (!trip) return res.status(404).json({ message: 'Completed trip not found' });
  if (await Feedback.exists({ parent: req.parent._id, trip: trip._id })) {
    return res.status(409).json({ message: 'You already rated this journey. Edit your rating instead.' });
  }
  const feedback = await Feedback.create({ parent: req.parent._id, trip: trip._id, rating: req.body.rating, comment: req.body.comment });
  res.status(201).json({ feedback });
});

// UPDATE
router.put('/:id', async (req, res) => {
  const feedback = await Feedback.findOne({ _id: req.params.id, parent: req.parent._id });
  if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
  if (req.body.rating !== undefined) feedback.rating = req.body.rating;
  if (req.body.comment !== undefined) feedback.comment = req.body.comment;
  await feedback.save();
  res.json({ feedback });
});

// DELETE
router.delete('/:id', async (req, res) => {
  const feedback = await Feedback.findOneAndDelete({ _id: req.params.id, parent: req.parent._id });
  if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
  res.json({ message: 'Feedback deleted' });
});

module.exports = router;
