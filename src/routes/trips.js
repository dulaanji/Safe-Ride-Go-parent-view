const router = require('express').Router();
const auth = require('../middleware/auth');
const Child = require('../models/Child');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const Feedback = require('../models/Feedback');
const { buildCurrentTrip, MIN } = require('../utils/tripView');

router.use(auth);

async function loadCurrent(parentId) {
  const trip = await Trip.findOne({ parent: parentId, status: 'active' }).sort({ createdAt: -1 });
  const child = await Child.findOne({ parent: parentId });
  return { trip, child };
}

// READ: today's live journey
router.get('/current', async (req, res) => {
  const { trip, child } = await loadCurrent(req.parent._id);
  if (!trip || !child) return res.status(404).json({ message: 'No active journey right now' });
  const unread = await Alert.countDocuments({ parent: req.parent._id, read: false });
  res.json({ trip: buildCurrentTrip(trip, child), unreadAlerts: unread });
});

// UPDATE: demo helper, simulate a delay (also CREATEs an alert)
router.post('/current/delay', async (req, res) => {
  const minutes = Number(req.body.minutes ?? 10);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) return res.status(400).json({ message: 'Delay must be 1 to 60 minutes' });
  const { trip, child } = await loadCurrent(req.parent._id);
  if (!trip) return res.status(404).json({ message: 'No active journey right now' });
  trip.etaAt = new Date(Math.max(trip.etaAt.getTime(), Date.now()) + minutes * MIN);
  trip.delayMin += minutes;
  await trip.save();
  await Alert.create({ parent: req.parent._id, type: 'delay', title: `Van delayed by ${minutes} minutes`, body: `New pickup time at ${child.pickupStop}` });
  res.json({ trip: buildCurrentTrip(trip, child) });
});

// UPDATE: demo helper, restart today's journey (6 minutes away)
router.post('/current/reset', async (req, res) => {
  const child = await Child.findOne({ parent: req.parent._id });
  if (!child) return res.status(404).json({ message: 'No child linked' });
  let trip = await Trip.findOne({ parent: req.parent._id, status: 'active' });
  const now = Date.now();
  if (!trip) trip = new Trip({ parent: req.parent._id, child: child._id, title: 'Morning route', startedAt: new Date(now - 26 * MIN), etaAt: new Date(now + 6 * MIN) });
  trip.startedAt = new Date(now - 26 * MIN);
  trip.etaAt = new Date(now + 6 * MIN);
  trip.delayMin = 0;
  await trip.save();
  res.json({ trip: buildCurrentTrip(trip, child) });
});

// READ: completed trips (each joined with the parent's feedback, if any)
router.get('/history', async (req, res) => {
  const trips = await Trip.find({ parent: req.parent._id, status: 'completed' }).sort({ arrivedAt: -1 }).limit(30);
  const child = await Child.findOne({ parent: req.parent._id });
  const feedback = await Feedback.find({ parent: req.parent._id, trip: { $in: trips.map((t) => t._id) } });
  const byTrip = Object.fromEntries(feedback.map((f) => [String(f.trip), f]));
  res.json({
    childName: child ? child.name : '',
    trips: trips.map((t) => ({
      id: t._id, title: t.title, arrivedAt: t.arrivedAt, durationMin: t.durationMin, feedback: byTrip[String(t._id)] || null,
    })),
  });
});

module.exports = router;
