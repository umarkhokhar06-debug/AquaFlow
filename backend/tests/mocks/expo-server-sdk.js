// expo-server-sdk ships an ESM-only build that Jest's CJS transform can't
// parse (`import` at the top of its entry file). The real SDK is only ever
// exercised when a user actually has an expoPushToken saved, which no test
// fixture sets -- so a minimal stub covering the shape notificationDeliveryService
// touches is enough; no test should be asserting real Expo delivery behavior.
class Expo {
  static isExpoPushToken() {
    return true;
  }

  async sendPushNotificationsAsync() {
    return [{ status: 'ok' }];
  }

  chunkPushNotifications(messages) {
    return [messages];
  }
}

module.exports = { Expo };
