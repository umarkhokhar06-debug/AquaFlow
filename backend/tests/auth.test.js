process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { connect, disconnect, clear } = require('./testDb');
const { createUser, tokenFor } = require('./helpers');

let app;
let AuditLog;
let User;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  AuditLog = require('../src/models/AuditLog');
  User = require('../src/models/User');
});

afterEach(async () => {
  await clear();
});

afterAll(async () => {
  await disconnect();
});

describe('POST /api/auth/register', () => {
  it('registers a new customer', async () => {
    const res = await request(app).post('/api/auth/register').send({
      userType: 'customer',
      name: 'Jane Doe',
      email: 'jane@test.com',
      password: 'Password123!',
      fullName: 'Jane Doe',
      houseNumber: '5',
      portion: 'lower',
      address: '5 Water Lane'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('rejects staff self-registration (drivers/admins are admin-created only)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      userType: 'admin',
      name: 'Fake Admin',
      email: 'fakeadmin@test.com',
      password: 'Password123!'
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await createUser({ email: 'login1@test.com', password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login1@test.com', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password and records a LOGIN_FAILED audit entry', async () => {
    await createUser({ email: 'login2@test.com', password: 'Password123!' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@test.com', password: 'WrongPassword!' });
    expect(res.status).toBe(401);

    const logs = await AuditLog.find({ action: 'LOGIN_FAILED', 'changes.email': 'login2@test.com' });
    expect(logs.length).toBe(1);
    expect(logs[0].changes.reason).toBe('invalid_password');
  });

  it('rejects login for a blocked account', async () => {
    await createUser({ email: 'blocked@test.com', password: 'Password123!', status: 'blocked' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'blocked@test.com', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/blocked/i);
  });

  it('records a LOGIN_FAILED entry with no actor for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doesnotexist@test.com', password: 'whatever' });
    expect(res.status).toBe(401);

    const logs = await AuditLog.find({ action: 'LOGIN_FAILED', 'changes.email': 'doesnotexist@test.com' });
    expect(logs.length).toBe(1);
    expect(logs[0].actor).toBeNull();
    expect(logs[0].actorSnapshot.email).toBe('doesnotexist@test.com');
  });
});

describe('DELETE /api/auth/account (self-service deletion)', () => {
  it('deletes the account when the password is correct', async () => {
    const customer = await createUser({ email: 'deleteme@test.com', password: 'Password123!' });

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${tokenFor(customer)}`)
      .send({ password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(await User.findById(customer._id)).toBeNull();
  });

  it('rejects deletion with the wrong password, and the account survives', async () => {
    const customer = await createUser({ email: 'staysafe@test.com', password: 'Password123!' });

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${tokenFor(customer)}`)
      .send({ password: 'wrong-password' });

    expect(res.status).toBe(400);
    expect(await User.findById(customer._id)).not.toBeNull();
  });

  it('rejects self-deletion for non-customer accounts', async () => {
    const driver = await createUser({ userType: 'driver', email: 'notcustomer@test.com', password: 'Password123!' });

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${tokenFor(driver)}`)
      .send({ password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(await User.findById(driver._id)).not.toBeNull();
  });
});

describe('Role-restricted endpoints reject unauthorized access', () => {
  it('rejects a driver placing a customer order', async () => {
    const driver = await createUser({ userType: 'driver', email: 'driver1@test.com' });
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(driver)}`)
      .send({ items: [{ type: 'small_tanker', quantity: 1 }], deliveryAddress: {}, paymentMethod: 'cash' });
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated access entirely', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});
