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
import * as Updates from 'expo-updates';
import { scheduleService } from '@/utils/scheduleService';
import { authAPI, storage } from '@/utils/auth';
import { registerForPushNotificationsAsync } from '@/utils/pushNotifications';
import { reportCrash } from '@/utils/crashReport';
import ErrorBoundary from '@/app/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

// Catches JS errors ErrorBoundary structurally cannot: anything thrown
// outside the React render tree (module-evaluation time, a native-bridge
// callback, a timer). Without this, that class of error just kills the JS
// thread in a release build and leaves the screen permanently blank with
// zero record of what happened -- which is exactly what's been reported
// and, so far, impossible to diagnose without this in place. Chains to the
// engine's own default handler afterward so a genuinely fatal error still
// behaves the way the platform expects (dev redbox, native crash logging).
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportCrash(error, { isFatal, screen: 'global' });
    defaultHandler(error, isFatal);
  });
}

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
  const [redirectTo, setRedirectTo] = useState<
    '/(driver)/(tabs)' | '/(installer)' | '/(main)/(tabs)' | null
  >(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        // Initialize schedule service on app start
        await scheduleService.loadSchedules();
        scheduleService.startMonitoring(60); // Check every 60 seconds

        // storage.saveUserData() (used by every login/signup path) writes
        // the session under the 'userData' key, not a bare 'token' key --
        // reading AsyncStorage.getItem('token') directly here always
        // returned null, so a returning user was never auto-logged-in and
        // had to sign in again on every app relaunch.
        const stored = await storage.getUserData();
        const token = stored?.token;

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
              setRedirectTo('/(driver)/(tabs)');
            } else if (response.user.userType === 'installer') {
              setRedirectTo('/(installer)');
            } else if (response.user.userType === 'customer') {
              setRedirectTo('/(main)/(tabs)');
            } else {
              await storage.clearUserData();
            }
          } else {
            await storage.clearUserData();
          }
        }
      } catch (error) {
        console.error('Token check failed:', error);
        reportCrash(error, { isFatal: false, screen: 'checkToken' });
        await storage.clearUserData();
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

  // Only navigate once isTokenChecked is true -- which is also the exact
  // condition gating the Stack below from rendering at all. Calling
  // router.replace() directly inside checkToken() (as this used to) fires
  // it before the Stack/navigator has ever mounted, racing its own initial-
  // route resolution: the replace can be silently dropped, then index.tsx's
  // own splash timer fires 3s later and navigates again, so a returning
  // logged-in user briefly lands on their dashboard and then gets yanked
  // back to the onboarding/choice screen. Deferring the actual navigation
  // to its own effect guarantees the Stack has already mounted first.
  useEffect(() => {
    if (isTokenChecked && redirectTo) {
      router.replace(redirectTo);
    }
  }, [isTokenChecked, redirectTo]);

  useEffect(() => {
    if (fontsLoaded && isTokenChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isTokenChecked]);

  // app.json sets updates.checkAutomatically to "NEVER", so this is the
  // only thing that makes an EAS OTA update actually reach an installed
  // app -- runs once per launch, in the background, and never blocks the
  // splash screen. Silent no-op in dev / whenever expo-updates isn't
  // running under a real update-enabled build.
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.error('OTA update check failed:', error);
      }
    })();
  }, []);

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