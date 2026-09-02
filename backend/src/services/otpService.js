const crypto = require('crypto');
const Otp = require('../models/Otp');

// Same conditional-construction pattern as notificationDeliveryService.js --
// fully wired, but inert until real Twilio credentials are configured.
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const OTP_TTL_MS = 10 * 60 * 1000;
const RECENT_VERIFICATION_WINDOW_MS = 30 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function requireSmsConfigured() {
  if (!twilioClient || !process.env.TWILIO_FROM_NUMBER) {
    const err = new Error('Phone verification is not configured on this server');
    err.status = 503;
    throw err;
  }
}

class OtpService {
  async sendOtp(phoneNumber, purpose = 'signup') {
    requireSmsConfigured();

    const code = crypto.randomInt(100000, 999999).toString();
    await Otp.create({
      phoneNumber,
      code,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    });

    await twilioClient.messages.create({
      body: `Your AabRahat verification code is ${code}. It expires in 10 minutes.`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phoneNumber
    });

    return { success: true, message: 'Verification code sent' };
  }

  async verifyOtp(phoneNumber, code, purpose = 'signup') {
    const otp = await Otp.findOne({ phoneNumber, purpose, verifiedAt: null }).sort({ createdAt: -1 });
    if (!otp) {
      const err = new Error('No verification code was requested for this number');
      err.status = 404;
      throw err;
    }
    if (otp.expiresAt < new Date()) {
      const err = new Error('Verification code has expired');
      err.status = 400;
      throw err;
    }
    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      const err = new Error('Too many incorrect attempts. Request a new code.');
      err.status = 429;
      throw err;
    }
    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      const err = new Error('Incorrect verification code');
      err.status = 400;
      throw err;
    }

    otp.verifiedAt = new Date();
    await otp.save();
    return { success: true, verified: true };
  }

  // Used by authService.registerUser: a phone counts as verified for signup
  // if there's a verified code for it from the last 30 minutes -- long
  // enough to finish filling out the rest of the signup form, short enough
  // that a stale verification can't be replayed against a different signup.
  async isPhoneRecentlyVerified(phoneNumber, purpose = 'signup') {
    if (!phoneNumber) return false;
    const otp = await Otp.findOne({
      phoneNumber,
      purpose,
      verifiedAt: { $gte: new Date(Date.now() - RECENT_VERIFICATION_WINDOW_MS) }
    }).sort({ verifiedAt: -1 });
    return !!otp;
  }
}

module.exports = new OtpService();
