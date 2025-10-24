import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CircleCheck as CheckCircle, Truck, Droplets, TriangleAlert as AlertTriangle, Settings } from 'lucide-react-native';
import { driverAPI, Notification } from '../../utils/driverAPI';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await driverAPI.getNotifications({ page: 1, limit: 50 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await driverAPI.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await driverAPI.markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return <CheckCircle size={20} color="#28A745" />;
      case 'order_update':
        return <Truck size={20} color="#007AFF" />;
      case 'payment_received':
        return <CheckCircle size={20} color="#10B981" />;
      case 'system_update':
        return <AlertTriangle size={20} color="#FF6B35" />;
      case 'promotion':
        return <Droplets size={20} color="#9333EA" />;
      default:
        return <Bell size={20} color="#6B7280" />;
    }
  };

  const formatTime = (createdAt: string): string => {
    try {
      const date = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Unknown time';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>Notifications</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/(main)/settings')}
            >
              <Settings size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadCount}>{unreadCount} unread</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/(driver)/settings')}
          >
            <Settings size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Mark All Read Button */}
      {unreadCount > 0 && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadCard
            ]}
            onPress={() => markAsRead(notification.id)}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </View>
              <View style={styles.notificationText}>
                <Text style={[
                  styles.notificationTitle,
                  !notification.read && styles.unreadTitle
                ]}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </Text>
              </View>
              {!notification.read && (
                <View style={styles.unreadDot} />
              )}
            </View>
          </TouchableOpacity>
        ))}

        {notifications.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Bell size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  markAllButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  unreadCard: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginBottom: 4,
  },
  unreadTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});