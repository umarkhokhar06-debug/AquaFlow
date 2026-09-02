import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleService } from '@/utils/scheduleService';
import { authAPI } from '@/utils/auth';
import { registerForPushNotificationsAsync } from '@/utils/pushNotifications';
import ErrorBoundary from '@/app/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded] = useFonts({
    'Sora-Regular': Sora_400Regular,
    'Sora-Medium': Sora_500Medium,
    'Sora-SemiBold': Sora_600SemiBold,
    'Sora-Bold': Sora_700Bold,
    'Sora-ExtraBold': Sora_800ExtraBold,
  });

  const [isTokenChecked, setIsTokenChecked] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        // Initialize schedule service on app start
        await scheduleService.loadSchedules();
        scheduleService.startMonitoring(60); // Check every 60 seconds

        const token = await AsyncStorage.getItem('token');

        if (token) {
          // There is no /auth/check-token endpoint on the backend -- this
          // used to call one that doesn't exist, so every app relaunch
          // silently failed and force-logged the user out. getProfile hits
          // the real, already-authenticated route and doubles as the
          // token-validity check.
          const response = await authAPI.getProfile(token);
          if (response.success && response.user) {
            registerForPushNotificationsAsync(token);
            if (response.user.userType === 'driver') {
              router.replace('/(driver)/(tabs)');
            } else if (response.user.userType === 'installer') {
              router.replace('/(installer)');
            } else if (response.user.userType === 'customer') {
              router.replace('/(main)/(tabs)');
            } else {
              await AsyncStorage.removeItem('token');
            }
          } else {
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Token check failed:', error);
        await AsyncStorage.removeItem('token');
      } finally {
        setIsTokenChecked(true);
      }
    };

    checkToken();

    // Safety net: never leave the app on a permanent blank screen if
    // checkToken hangs for an unforeseen reason. axios.defaults.timeout
    // covers the known case (a stuck getProfile call); this covers any
    // other one by forcing the gate open after a hard ceiling.
    const failSafe = setTimeout(() => setIsTokenChecked(true), 20000);

    return () => clearTimeout(failSafe);
  }, []);

  useEffect(() => {
    if (fontsLoaded && isTokenChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isTokenChecked]);

  // Wait until both fonts and token check are complete
  if (!fontsLoaded || !isTokenChecked) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(installer)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}