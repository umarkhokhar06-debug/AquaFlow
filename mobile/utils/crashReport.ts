import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Fire-and-forget crash reporting to the backend, so a real device's crash
// is visible remotely without needing Play Console vitals or adb logcat --
// both of which have been a dead end trying to diagnose reported crashes.
// Must never itself throw or block whatever called it.
export function reportCrash(
  error: unknown,
  extra: { isFatal?: boolean; screen?: string } = {}
): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Lazy require so a bad import here can never be the thing that breaks
    // app startup -- this module gets pulled in from the very top of the
    // app (the global error handler in app/_layout.tsx).
    const { config } = require('../config');

    fetch(`${config.apiUrl}/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack,
        isFatal: !!extra.isFatal,
        screen: extra.screen,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version,
      }),
    }).catch(() => {});
  } catch {
    // Never let crash reporting be the thing that crashes the app.
  }
}
