import { Stack } from 'expo-router';

// No bottom tab bar -- index is the sole home screen, and tracking/
// tank-monitoring/account are reached contextually (tap the active order's
// "Track live" button, tap the tank widget, tap the hamburger menu) rather
// than living behind persistent tabs. Every destination Account used to
// link to is still registered here as a plain stack screen so
// router.push() from Account (and everywhere else) keeps working exactly
// as before.
export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="tank-monitoring" />
      <Stack.Screen name="account" />
      <Stack.Screen name="order-history" />
      <Stack.Screen name="order" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="help" />
      <Stack.Screen name="add-edit-address" />
      <Stack.Screen name="calibration-settings" />
      <Stack.Screen name="manage-device-access" />
      <Stack.Screen name="scan-invite" />
      <Stack.Screen name="order-details/[id]" />
    </Stack>
  );
}
