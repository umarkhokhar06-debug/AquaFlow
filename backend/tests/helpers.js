const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

let counter = 0;

function tokenFor(user) {
  return jwt.sign(
    { id: user._id, email: user.email, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function createUser(overrides = {}) {
  counter += 1;
  const userType = overrides.userType || 'customer';
  const base = {
    userType,
    name: 'Test User',
    email: `user${Date.now()}${counter}@test.com`,
    password: 'Password123!'
  };
  if (userType === 'customer') {
    Object.assign(base, {
      fullName: 'Test Customer',
      houseNumber: '12',
      portion: 'upper',
      address: '123 Test Street'
    });
  }
  return User.create({ ...base, ...overrides });
}

function validDeliveryAddress(overrides = {}) {
  return {
    fullName: 'Test Customer',
    houseNumber: '12',
    portion: 'upper',
    address: '123 Test Street',
    phoneNumber: '03001234567',
    latitude: 24.8607,
    longitude: 67.0011,
    ...overrides
  };
}

module.exports = { tokenFor, createUser, validDeliveryAddress };
