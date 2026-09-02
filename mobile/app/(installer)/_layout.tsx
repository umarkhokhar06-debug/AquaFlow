import { Stack } from 'expo-router';

export default function InstallerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="job/[id]" />
    </Stack>
  );
}
