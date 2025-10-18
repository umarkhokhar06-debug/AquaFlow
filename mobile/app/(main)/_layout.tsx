import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  MapPin,
  CreditCard,
  Droplets,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  X,
} from 'lucide-react-native';

function CustomDrawerContent(props: any) {
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/auth/login');
  };

  const closeDrawer = () => {
    props.navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContent}
    >
      <View style={styles.drawerHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={closeDrawer}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.userInfo} onPress={() => router.push('/(main)/profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userType}>Customer</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.drawerSection}>
        <DrawerItem
          label="Saved Addresses"
          icon={({ color, size }) => (
            <View style={{ width: 28, alignItems: 'center' }}>
              <MapPin size={size} color={color} />
            </View>
          )}
          onPress={() => router.push('/(main)/addresses')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Payment Methods"
          icon={({ color, size }) => (
            <View style={{ width: 28, alignItems: 'center' }}>
              <CreditCard size={size} color={color} />
            </View>
          )}
          onPress={() => router.push('/(main)/payments')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Settings"
          icon={({ color, size }) => (
            <View style={{ width: 28, alignItems: 'center' }}>
              <Settings size={size} color={color} />
            </View>
          )}
          onPress={() => router.push('/(main)/settings')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Notifications"
          icon={({ color, size }) => (
            <View style={{ width: 28, alignItems: 'center' }}>
              <Bell size={size} color={color} />
            </View>
          )}
          onPress={() => router.push('/(main)/notifications')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Help & Support"
          icon={({ color, size }) => (
            <View style={{ width: 28, alignItems: 'center' }}>
              <HelpCircle size={size} color={color} />
            </View>
          )}
          onPress={() => router.push('/(main)/help')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function MainLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={CustomDrawerContent}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: '#FFFFFF',
            width: 320,
          },
          drawerType: 'slide',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <Drawer.Screen name="(tabs)" />
        <Drawer.Screen name="addresses" />
        <Drawer.Screen name="payments" />
        {/* <Drawer.Screen name="tank-monitoring" /> */}
        <Drawer.Screen name="profile" />
        <Drawer.Screen name="settings" />
        <Drawer.Screen name="notifications" />
        <Drawer.Screen name="help" />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  userType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  drawerSection: {
    flex: 1,
    paddingTop: 8,
  },
  drawerLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginLeft: -16,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 12,
  },
});
