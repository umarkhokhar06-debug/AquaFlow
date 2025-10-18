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
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {config} from '../config';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const [isTokenChecked, setIsTokenChecked] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('Checking token:', token);

        if (token) {
          const response = await axios.post(`${config.backendUrl}/auth/check-token`, {
            token,
          });

          if (response.status === 200) {
            const { user } = response.data;
            if (user?.userType === 'driver') {
              router.replace('/(driver)/(tabs)');
            } else if (user?.userType === 'user') {
              router.replace('/(main)/(tabs)');
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