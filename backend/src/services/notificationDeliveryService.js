const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// SRS §18: "Critical notifications may support SMS as a secondary channel
// if configured." Push covers every type; SMS is reserved for the
// time-sensitive/actionable ones so customers aren't spammed by text for
// promos or routine updates.
const CRITICAL_SMS_TYPES = new Set(['order_assigned', 'payment_failed', 'emergency', 'order_cancelled']);

class NotificationDeliveryService {
  // Best-effort push + (conditionally) SMS delivery for one notification.
  // Never throws -- a delivery-provider outage must not break notification
  // creation or whatever order/payment flow triggered it.
  async deliver(notification) {
    const user = await User.findById(notification.recipient)
      .select('expoPushToken phoneNumber notificationPreferences');
    if (!user) return;

    const [pushStatus, smsStatus] = await Promise.all([
      this._sendPush(user, notification),
      this._sendSms(user, notification)
    ]);

    notification.deliveryStatus = { push: pushStatus, sms: smsStatus };
    await notification.save();
  }

  async _sendPush(user, notification) {
    if (!user.notificationPreferences?.push || !user.expoPushToken) return 'not_attempted';
    if (!Expo.isExpoPushToken(user.expoPushToken)) return 'failed';

    try {
      const [ticket] = await expo.sendPushNotificationsAsync([{
        to: user.expoPushToken,
        title: notification.title,
        body: notification.message,
        data: { notificationId: notification._id.toString(), type: notification.type, ...notification.data },
        priority: notification.priority === 'urgent' || notification.priority === 'high' ? 'high' : 'default'
      }]);
      return ticket.status === 'ok' ? 'sent' : 'failed';
    } catch (error) {
      console.error('Expo push send failed:', error.message);
      return 'failed';
    }
  }

  async _sendSms(user, notification) {
    if (!CRITICAL_SMS_TYPES.has(notification.type)) return 'not_attempted';
    if (!user.notificationPreferences?.sms || !user.phoneNumber) return 'skipped';
    if (!twilioClient || !process.env.TWILIO_FROM_NUMBER) return 'skipped';

    try {
      await twilioClient.messages.create({
        body: `${notification.title}: ${notification.message}`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: user.phoneNumber
      });
      return 'sent';
    } catch (error) {
      console.error('Twilio SMS send failed:', error.message);
      return 'failed';
    }
  }
}

module.exports = new NotificationDeliveryService();
