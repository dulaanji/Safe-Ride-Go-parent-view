const Child = require('../models/Child');
const Trip = require('../models/Trip');
const Alert = require('../models/Alert');

const MIN = 60 * 1000;

// Demo data: in the real system the school links a verified parent to a child.
async function seedForParent(parent) {
  if (await Child.exists({ parent: parent._id })) return;
  const now = Date.now();
  const child = await Child.create({ parent: parent._id, name: 'Nethmi P.' });
  await Trip.create({
    parent: parent._id, child: child._id, kind: 'morning', status: 'active',
    title: 'Morning route', startedAt: new Date(now - 26 * MIN), etaAt: new Date(now + 6 * MIN),
  });
  const yesterdayArrival = new Date(now - 24 * 60 * MIN);
  await Trip.create({
    parent: parent._id, child: child._id, kind: 'morning', status: 'completed',
    title: 'Home to SLIIT College', startedAt: new Date(yesterdayArrival.getTime() - 24 * MIN),
    etaAt: yesterdayArrival, arrivedAt: yesterdayArrival, durationMin: 24,
  });
  await Alert.create([
    { parent: parent._id, type: 'van', title: 'Van approaching your stop', body: 'About 5 minutes away', read: false },
    { parent: parent._id, type: 'school', title: `${child.name.split(' ')[0]} reached school`, body: 'SLIIT College, 7:02 AM', read: true },
  ]);
}

module.exports = { seedForParent };
