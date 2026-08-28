import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  Trash2
} from 'lucide-react-native';
import { notificationService, Notification } from '@/utils/notificationService';
import { colors, typography } from '@/theme';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    // Load initial notifications
    loadNotifications();
    
    // Listen for notification changes
    const handleNotificationChange = (newNotifications: Notification[]) => {
      setNotifications(newNotifications);
    };

    notificationService.addListener(handleNotificationChange);

    return () => {
      notificationService.removeListener(handleNotificationChange);
    };
  }, []);

  const loadNotifications = () => {
    const allNotifications = notificationService.getNotifications();
    setNotifications(allNotifications);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const clearAll = () => {
    notificationService.clearAll();
  };

  const removeNotification = (id: string) => {
    notificationService.removeNotification(id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color={colors.success[500]} />;
      case 'warning':
        return <AlertTriangle size={20} color={colors.warning[500]} />;
      case 'error':
        return <XCircle size={20} color={colors.danger[500]} />;
      case 'info':
      default:
        return <Info size={20} color={colors.primary[500]} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return colors.success[500];
      case 'warning':
        return colors.warning[500];
      case 'error':
        return colors.danger[500];
      case 'info':
      default:
        return colors.primary[500];
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadNotification
      ]}
      onPress={() => markAsRead(notification.id)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          {getNotificationIcon(notification.type)}
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationTime}>
            {formatTime(notification.timestamp)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeNotification(notification.id)}
        >
          <Trash2 size={16} color={colors.neutral[500]} />
        </TouchableOpacity>
      </View>
      <Text style={styles.notificationMessage}>{notification.message}</Text>
      {!notification.read && (
        <View style={[styles.unreadIndicator, { backgroundColor: getNotificationColor(notification.type) }]} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral[0]} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={markAllAsRead}
              >
                <CheckCircle size={20} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={clearAll}
              >
                <Trash2 size={20} color={colors.danger[500]} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>You don&apos;t have any notifications yet</Text>
          </View>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    textAlign: 'center',
  },
});