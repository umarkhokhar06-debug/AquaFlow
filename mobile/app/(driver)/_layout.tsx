import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Package, MapPin, Settings, Bell, CircleHelp as HelpCircle, LogOut, X, Truck } from 'lucide-react-native';

function CustomDriverDrawerContent(props: any) {
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/auth/login');
  };

  const closeDrawer = () => {
    props.navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={closeDrawer}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AK</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>Ahmad Khan</Text>
            <Text style={styles.userType}>Driver</Text>
            <Text style={styles.vehicleInfo}>Vehicle: TK-001</Text>
          </View>
        </View>
      </View>

      <View style={styles.drawerSection}>
        <DrawerItem
          label="My Deliveries"
          icon={({ color, size }) => <Package size={size} color={color} />}
          onPress={() => router.push('/(driver)/(tabs)/deliveries')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Settings"
          icon={({ color, size }) => <Settings size={size} color={color} />}
          onPress={() => router.push('/(driver)/settings')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Notifications"
          icon={({ color, size }) => <Bell size={size} color={color} />}
          onPress={() => router.push('/(driver)/notifications')}
          labelStyle={[styles.drawerLabel, { marginLeft: 8 }]}
          activeBackgroundColor="#F0F8FF"
          activeTintColor="#007AFF"
        />
        <DrawerItem
          label="Help & Support"
          icon={({ color, size }) => <HelpCircle size={size} color={color} />}
          onPress={() => router.push('/(driver)/help')}
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

export default function DriverLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={CustomDriverDrawerContent}
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
        <Drawer.Screen name="deliveries" />
        <Drawer.Screen name="vehicle" />
        <Drawer.Screen name="earnings" />
        <Drawer.Screen name="settings" />
        <Drawer.Screen name="notifications" />
        <Drawer.Screen name="help" />
        <Drawer.Screen name="order/[id]" />
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
    marginBottom: 2,
  },
  vehicleInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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