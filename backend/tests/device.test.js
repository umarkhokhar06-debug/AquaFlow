process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { connect, disconnect, clear } = require('./testDb');
const { createUser, tokenFor } = require('./helpers');

let app;
let AuditLog;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  AuditLog = require('../src/models/AuditLog');
});

afterEach(async () => {
  await clear();
});

afterAll(async () => {
  await disconnect();
});

describe('Device calibration', () => {
  it('stores calibrated tank capacity correctly on installation', async () => {
    const admin = await createUser({ userType: 'admin', email: 'admin3@test.com' });
    const owner = await createUser({ email: 'owner1@test.com' });

    const res = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        deviceId: 'DEV-001',
        name: 'Test Tank Sensor',
        houseLabel: 'House 1',
        ownerId: owner._id.toString(),
        tank_depth: 200,
        tank_full_distance: 10
      });

    expect(res.status).toBe(201);
    expect(res.body.device.calibration.tank_depth).toBe(200);
    expect(res.body.device.calibration.tank_full_distance).toBe(10);
    expect(res.body.device.history.length).toBe(1);
    expect(res.body.device.history[0].event).toBe('installed');
  });

  it('records a calibration-change history entry and audit log entry on recalibration', async () => {
    const admin = await createUser({ userType: 'admin', email: 'admin4@test.com' });
    const owner = await createUser({ email: 'owner2@test.com' });

    const createRes = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        deviceId: 'DEV-002',
        name: 'Test Tank Sensor 2',
        houseLabel: 'House 2',
        ownerId: owner._id.toString(),
        tank_depth: 150,
        tank_full_distance: 5
      });
    const deviceId = createRes.body.device.id || createRes.body.device._id;

    const updateRes = await request(app)
      .put(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ tank_depth: 180 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.device.calibration.tank_depth).toBe(180);

    const calibrationEvents = updateRes.body.device.history.filter(h => h.event === 'calibrated');
    expect(calibrationEvents.length).toBe(1);
    expect(calibrationEvents[0].details.before.tank_depth).toBe(150);
    expect(calibrationEvents[0].details.after.tank_depth).toBe(180);

    const auditLogs = await AuditLog.find({ action: 'DEVICE_CALIBRATION_CHANGED' });
    expect(auditLogs.length).toBe(1);
  });
});
