process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { connect, disconnect, clear } = require('./testDb');
const { createUser, tokenFor } = require('./helpers');

let app;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
});

afterEach(async () => {
  await clear();
});

afterAll(async () => {
  await disconnect();
});

describe('Driver attendance', () => {
  it('clocks in, reports status, then clocks out', async () => {
    const driver = await createUser({ userType: 'driver', email: 'attdriver1@test.com' });
    const auth = `Bearer ${tokenFor(driver)}`;

    const clockInRes = await request(app)
      .post('/api/driver/attendance/clock-in')
      .set('Authorization', auth)
      .send({ latitude: 24.86, longitude: 67.0 });
    expect(clockInRes.status).toBe(201);
    expect(clockInRes.body.attendance.clockOutAt).toBeNull();

    const statusRes = await request(app)
      .get('/api/driver/attendance/status')
      .set('Authorization', auth);
    expect(statusRes.body.clockedIn).toBe(true);

    const clockOutRes = await request(app)
      .post('/api/driver/attendance/clock-out')
      .set('Authorization', auth)
      .send({});
    expect(clockOutRes.status).toBe(200);
    expect(clockOutRes.body.attendance.clockOutAt).not.toBeNull();

    const statusAfter = await request(app)
      .get('/api/driver/attendance/status')
      .set('Authorization', auth);
    expect(statusAfter.body.clockedIn).toBe(false);
  });

  it('rejects clocking in twice without clocking out first', async () => {
    const driver = await createUser({ userType: 'driver', email: 'attdriver2@test.com' });
    const auth = `Bearer ${tokenFor(driver)}`;

    await request(app).post('/api/driver/attendance/clock-in').set('Authorization', auth).send({});
    const secondClockIn = await request(app).post('/api/driver/attendance/clock-in').set('Authorization', auth).send({});
    expect(secondClockIn.status).toBe(400);
  });

  it('rejects clocking out when not clocked in', async () => {
    const driver = await createUser({ userType: 'driver', email: 'attdriver3@test.com' });
    const res = await request(app)
      .post('/api/driver/attendance/clock-out')
      .set('Authorization', `Bearer ${tokenFor(driver)}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('lets an admin view attendance across all drivers', async () => {
    const driver = await createUser({ userType: 'driver', email: 'attdriver4@test.com' });
    const admin = await createUser({ userType: 'admin', email: 'attadmin1@test.com' });

    await request(app)
      .post('/api/driver/attendance/clock-in')
      .set('Authorization', `Bearer ${tokenFor(driver)}`)
      .send({});

    const res = await request(app)
      .get('/api/drivers/attendance')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.attendance.length).toBe(1);
    expect(res.body.attendance[0].driver.email).toBe('attdriver4@test.com');
  });

  it('rejects a non-admin from viewing all-driver attendance', async () => {
    const driver = await createUser({ userType: 'driver', email: 'attdriver5@test.com' });
    const res = await request(app)
      .get('/api/drivers/attendance')
      .set('Authorization', `Bearer ${tokenFor(driver)}`);
    expect(res.status).toBe(403);
  });
});
