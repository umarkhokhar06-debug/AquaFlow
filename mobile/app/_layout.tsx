import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleService } from '@/utils/scheduleService';
import { authAPI } from '@/utils/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
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
            if (response.user.userType === 'driver') {
              router.replace('/(driver)/(tabs)');
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
        if (fontsLoaded) {
          await SplashScreen.hideAsync();
        }
      }
    };

    checkToken();
  }, [fontsLoaded]);

  // Wait until both fonts and token check are complete
  if (!fontsLoaded || !isTokenChecked) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}