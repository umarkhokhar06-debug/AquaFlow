import { Stack } from 'expo-router';

// The former drawer menu is now the Account tab
// ((tabs)/account.tsx) -- every destination it used to link to is still
// registered here as a plain stack screen so router.push() from Account
// (and everywhere else) keeps working exactly as before.
export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
