process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { connect, disconnect, clear } = require('./testDb');
const { createUser, tokenFor, validDeliveryAddress } = require('./helpers');

let app;
let Notification;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  Notification = require('../src/models/Notification');
});

afterEach(async () => {
  await clear();
});

afterAll(async () => {
  await disconnect();
});

async function placeOrder(customer) {
  return request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${tokenFor(customer)}`)
    .send({
      items: [{ type: 'small_tanker', quantity: 1 }],
      deliveryAddress: validDeliveryAddress(),
      paymentMethod: 'cash'
    });
}

describe('Order creation reaches dispatch', () => {
  it('a valid customer order lands in the dispatch "new" queue', async () => {
    const customer = await createUser({ email: 'cust1@test.com' });
    const admin = await createUser({ userType: 'admin', email: 'admin1@test.com' });

    const orderRes = await placeOrder(customer);
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.order.status).toBe('pending');

    const queueRes = await request(app)
      .get('/api/dispatch/queue')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(queueRes.status).toBe(200);
    const ids = queueRes.body.queue.new.map(o => o._id || o.id);
    expect(ids).toContain(orderRes.body.order.id);
  });

  it('persists a booking-confirmation notification for the customer', async () => {
    const customer = await createUser({ email: 'cust2@test.com' });
    const orderRes = await placeOrder(customer);
    expect(orderRes.status).toBe(201);

    const notifications = await Notification.find({ recipient: customer._id, type: 'order_placed' });
    expect(notifications.length).toBe(1);
  });
});

describe('Delivery OTP', () => {
  async function placeAndAssign() {
    const customer = await createUser({ email: 'cust3@test.com' });
    const driver = await createUser({ userType: 'driver', email: 'driver2@test.com', driverStatus: 'free' });
    const admin = await createUser({ userType: 'admin', email: 'admin2@test.com' });

    const orderRes = await placeOrder(customer);
    const orderId = orderRes.body.order.id;

    const assignRes = await request(app)
      .put(`/api/dispatch/orders/${orderId}/assign`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ driverId: driver._id.toString() });
    expect(assignRes.status).toBe(200);

    return { customer, driver, orderId };
  }

  it('rejects delivery completion with a wrong OTP', async () => {
    const { driver, orderId } = await placeAndAssign();

    const res = await request(app)
      .put(`/api/driver/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenFor(driver)}`)
      .send({ status: 'delivered', otp: '0000' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/otp/i);
  });

  it('completes delivery only with the correct OTP, and notifies the customer', async () => {
    const { customer, driver, orderId } = await placeAndAssign();

    // The real OTP is select:false on the Order model -- fetch it the same
    // way the customer app does, via the dedicated endpoint.
    const otpRes = await request(app)
      .get(`/api/orders/${orderId}/delivery-otp`)
      .set('Authorization', `Bearer ${tokenFor(customer)}`);
    expect(otpRes.status).toBe(200);
    const realOtp = otpRes.body.otp || otpRes.body.deliveryOtp;
    expect(realOtp).toBeTruthy();

    const completeRes = await request(app)
      .put(`/api/driver/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenFor(driver)}`)
      .send({ status: 'delivered', otp: realOtp });

    expect(completeRes.status).toBe(200);

    const deliveredNotifications = await Notification.find({ recipient: customer._id, type: 'order_delivered' });
    expect(deliveredNotifications.length).toBe(1);
  });
});
