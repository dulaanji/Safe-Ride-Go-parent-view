// Integration test for every CRUD endpoint of the parent module.
// Needs a MongoDB to talk to. It uses a SEPARATE database (saferidego_test) and drops it at the end.
//   MONGODB_TEST_URI=mongodb://127.0.0.1:27017/saferidego_test npm test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DEMO_MODE = 'true';
process.env.DEMO_OTP = '482615';

const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');

let base, token, passed = 0;
const call = async (method, path, body, auth = true) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
};
const test = async (name, fn) => { await fn(); passed++; console.log('  ✓', name); };

(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/saferidego_test');
  await mongoose.connection.dropDatabase();
  const server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
  const mobile = '077 123 4567';
  let ids = {};

  console.log('Auth');
  await test('register rejects bad mobile / short password', async () => {
    assert.equal((await call('POST', '/auth/register', { fullName: 'A B', mobile: '123', password: 'abcdef' }, false)).status, 400);
    assert.equal((await call('POST', '/auth/register', { fullName: 'A B', mobile, password: 'abc' }, false)).status, 400);
  });
  await test('register (Create) returns demo OTP', async () => {
    const r = await call('POST', '/auth/register', { fullName: 'Amara Perera', mobile, password: 'secret1' }, false);
    assert.equal(r.status, 201); assert.equal(r.data.demoCode, '482615');
  });
  await test('login blocked until verified', async () => {
    const r = await call('POST', '/auth/login', { mobile, password: 'secret1' }, false);
    assert.equal(r.status, 403); assert.equal(r.data.needsVerification, true);
  });
  await test('verify rejects wrong code, accepts right code', async () => {
    assert.equal((await call('POST', '/auth/verify', { mobile, code: '000000' }, false)).status, 400);
    const r = await call('POST', '/auth/verify', { mobile, code: '482615' }, false);
    assert.equal(r.status, 200); token = r.data.token; assert.ok(token);
  });
  await test('duplicate register is rejected', async () => {
    assert.equal((await call('POST', '/auth/register', { fullName: 'X Y', mobile, password: 'secret1' }, false)).status, 409);
  });
  await test('login works, wrong password rejected', async () => {
    assert.equal((await call('POST', '/auth/login', { mobile, password: 'nope123' }, false)).status, 401);
    assert.equal((await call('POST', '/auth/login', { mobile, password: 'secret1' }, false)).status, 200);
  });
  await test('protected routes need a token', async () => {
    assert.equal((await call('GET', '/profile', null, false)).status, 401);
  });

  console.log('Profile');
  await test('read profile + child', async () => {
    const r = await call('GET', '/profile'); assert.equal(r.status, 200);
    assert.equal(r.data.parent.mobile, '0771234567'); assert.equal(r.data.child.name, 'Nethmi P.');
  });
  await test('update display name & mobile, validate', async () => {
    assert.equal((await call('PUT', '/profile', { displayName: 'A' })).status, 400);
    const r = await call('PUT', '/profile', { displayName: 'Amara D. Perera', mobile: '0779998888' });
    assert.equal(r.data.parent.displayName, 'Amara D. Perera'); assert.equal(r.data.parent.mobile, '0779998888');
  });
  await test('update alert channels', async () => {
    const r = await call('PUT', '/profile/channels', { whatsapp: true, sms: false });
    assert.equal(r.data.parent.alertChannels.whatsapp, true); assert.equal(r.data.parent.alertChannels.sms, false);
  });
  await test('child update (stop, emergency contact) + validation', async () => {
    assert.equal((await call('PUT', '/child', { emergencyContact: '12' })).status, 400);
    const r = await call('PUT', '/child', { pickupStop: 'Temple Junction', emergencyContact: '077 555 1212' });
    assert.equal(r.data.child.pickupStop, 'Temple Junction'); assert.equal(r.data.child.emergencyContact, '0775551212');
    await call('PUT', '/child', { pickupStop: 'Pagoda Road' });
  });

  console.log('Trips');
  await test('current trip ~6 min away with 5 steps', async () => {
    const r = await call('GET', '/trips/current');
    assert.equal(r.status, 200); assert.ok(r.data.trip.minsAway >= 5 && r.data.trip.minsAway <= 6);
    assert.equal(r.data.trip.steps.length, 5); assert.equal(r.data.unreadAlerts, 1);
  });
  await test('simulate 10-minute delay updates ETA and creates alert', async () => {
    const r = await call('POST', '/trips/current/delay', { minutes: 10 });
    assert.ok(r.data.trip.minsAway >= 15); assert.equal(r.data.trip.delayMin, 10);
    assert.equal((await call('POST', '/trips/current/delay', { minutes: 999 })).status, 400);
    const a = await call('GET', '/alerts'); assert.equal(a.data.alerts[0].type, 'delay');
    const reset = await call('POST', '/trips/current/reset'); assert.ok(reset.data.trip.minsAway <= 6);
  });

  console.log('Alerts');
  await test('list, filter unread, mark one read, mark all read, delete, create', async () => {
    let r = await call('GET', '/alerts'); assert.ok(r.data.alerts.length >= 3);
    r = await call('GET', '/alerts?unread=true'); assert.ok(r.data.alerts.every((a) => !a.read));
    const first = r.data.alerts[0]._id;
    assert.equal((await call('PATCH', `/alerts/${first}`, { read: true })).data.alert.read, true);
    await call('PATCH', '/alerts/read-all');
    assert.equal((await call('GET', '/alerts')).data.unreadCount, 0);
    assert.equal((await call('GET', '/alerts?unread=true')).data.alerts.length, 0);
    const c = await call('POST', '/alerts', { title: 'Test alert', type: 'info' }); assert.equal(c.status, 201);
    assert.equal((await call('POST', '/alerts', { type: 'info' })).status, 400);
    assert.equal((await call('DELETE', `/alerts/${c.data.alert._id}`)).status, 200);
    assert.equal((await call('DELETE', `/alerts/${c.data.alert._id}`)).status, 404);
  });

  console.log('Pickup notes');
  await test('create, read, update, delete + validation', async () => {
    assert.equal((await call('POST', '/pickup-notes', { text: '   ' })).status, 400);
    const c = await call('POST', '/pickup-notes', { text: 'Wait at the blue gate' }); assert.equal(c.status, 201);
    ids.note = c.data.note._id;
    assert.equal((await call('GET', '/pickup-notes')).data.notes.length, 1);
    assert.equal((await call('PUT', `/pickup-notes/${ids.note}`, { text: 'Wait at the red gate' })).data.note.text, 'Wait at the red gate');
    assert.equal((await call('DELETE', `/pickup-notes/${ids.note}`)).status, 200);
    assert.equal((await call('GET', '/pickup-notes')).data.notes.length, 0);
  });

  console.log('History + feedback');
  await test('history lists completed trip', async () => {
    const r = await call('GET', '/trips/history'); assert.equal(r.data.trips.length, 1);
    assert.equal(r.data.trips[0].durationMin, 24); ids.trip = r.data.trips[0].id;
  });
  await test('feedback create / duplicate / update / delete / validation', async () => {
    assert.equal((await call('POST', '/feedback', { tripId: ids.trip, rating: 9 })).status, 400);
    const c = await call('POST', '/feedback', { tripId: ids.trip, rating: 4, comment: 'Smooth ride' });
    assert.equal(c.status, 201); ids.fb = c.data.feedback._id;
    assert.equal((await call('POST', '/feedback', { tripId: ids.trip, rating: 5 })).status, 409);
    assert.equal((await call('GET', '/trips/history')).data.trips[0].feedback.rating, 4);
    assert.equal((await call('PUT', `/feedback/${ids.fb}`, { rating: 5 })).data.feedback.rating, 5);
    assert.equal((await call('DELETE', `/feedback/${ids.fb}`)).status, 200);
    assert.equal((await call('GET', '/trips/history')).data.trips[0].feedback, null);
  });

  console.log('Isolation + delete account');
  await test("another parent cannot touch my data", async () => {
    const mine = token;
    await call('POST', '/auth/register', { fullName: 'Other Parent', mobile: '0712223334', password: 'secret1' }, false);
    token = (await call('POST', '/auth/verify', { mobile: '0712223334', code: '482615' }, false)).data.token;
    const myAlert = (await (async () => { token = mine; return call('GET', '/alerts'); })()).data.alerts[0]._id;
    token = (await call('POST', '/auth/login', { mobile: '0712223334', password: 'secret1' }, false)).data.token;
    assert.equal((await call('DELETE', `/alerts/${myAlert}`)).status, 404);
    token = mine;
  });
  await test('delete account needs password, then removes everything', async () => {
    assert.equal((await call('DELETE', '/profile', { password: 'wrong' })).status, 403);
    assert.equal((await call('DELETE', '/profile', { password: 'secret1' })).status, 200);
    assert.equal((await call('GET', '/profile')).status, 401);
    assert.equal(await mongoose.model('Alert').countDocuments({ parent: { $exists: true } }) > 0, true); // other parent's alerts remain
  });

  console.log(`\nAll ${passed} test groups passed`);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
})().catch(async (e) => { console.error('\nFAILED:', e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
