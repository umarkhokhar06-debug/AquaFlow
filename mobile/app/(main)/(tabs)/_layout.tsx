import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, MapPin, Droplet, CircleUserRound } from 'lucide-react-native';
import { colors, typography } from '@/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.neutral[0],
          borderTopWidth: 1,
          borderTopColor: colors.neutral[100],
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 20 + insets.bottom : 8 + insets.bottom,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: typography.label.fontFamily,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color, size }) => (
            <MapPin size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tank-monitoring"
        options={{
          title: 'Water Level',
          tabBarIcon: ({ color, size }) => (
            <Droplet size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <CircleUserRound size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
