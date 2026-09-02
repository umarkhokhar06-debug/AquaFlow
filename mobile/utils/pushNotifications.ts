import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { config } from '../config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests permission, gets this device's Expo push token, and registers it
// with the backend for the currently logged-in user. Called on login and on
// every app-open (see app/_layout.tsx and app/auth/login.tsx) -- cheap and
// idempotent, so calling it repeatedly is fine.
export async function registerForPushNotificationsAsync(authToken: string): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators/web don't have real push tokens

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await axios.put(
      `${config.apiUrl}/auth/push-token`,
      { expoPushToken },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch (error) {
    // Never let push registration failures block login/app-open.
    console.error('Push notification registration failed:', error);
  }
}

// Called on logout so a signed-out device stops being a delivery target.
export async function clearPushToken(authToken: string): Promise<void> {
  try {
    await axios.put(
      `${config.apiUrl}/auth/push-token`,
      { expoPushToken: null },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch (error) {
    console.error('Clearing push token failed:', error);
  }
}
