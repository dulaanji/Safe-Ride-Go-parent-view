const MIN = 60 * 1000;
const WINDOW_MIN = 20; // progress bar covers the last 20 minutes before pickup

function buildCurrentTrip(trip, child) {
  const now = Date.now();
  const msLeft = trip.etaAt.getTime() - now;
  const arrived = msLeft <= 0;
  const minsAway = arrived ? 0 : Math.ceil(msLeft / MIN);
  const progress = Math.max(0, Math.min(1, 1 - msLeft / (WINDOW_MIN * MIN)));
  const firstName = child.name.split(' ')[0];

  const steps = [
    { key: 'left', title: 'Van left the depot', time: trip.startedAt, state: 'done' },
    { key: 'started', title: 'Trip started · 3 stops done', time: new Date(trip.startedAt.getTime() + 15 * MIN), state: 'done' },
    { key: 'approach', title: `${arrived ? 'Arrived at' : 'Approaching'} ${child.pickupStop}`, time: trip.etaAt, state: arrived ? 'done' : 'current', expected: !arrived },
    { key: 'boarded', title: `${firstName} boarded`, note: arrived ? 'Waiting for boarding confirmation' : "You'll get an alert", state: arrived ? 'current' : 'pending' },
    { key: 'school', title: `Arrived at ${child.school}`, time: new Date(trip.etaAt.getTime() + 44 * MIN), state: 'pending', expected: true },
  ];

  return {
    id: trip._id,
    kind: trip.kind,
    status: arrived ? 'arrived' : 'on_the_way',
    childName: child.name,
    grade: child.grade,
    vanNo: child.vanNo,
    school: child.school,
    stop: child.pickupStop,
    driver: { name: child.driverName, phone: child.driverPhone },
    etaAt: trip.etaAt,
    minsAway,
    progress,
    delayMin: trip.delayMin,
    steps,
  };
}

module.exports = { buildCurrentTrip, MIN };
