import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme';
import { notificationService } from '@/utils/notificationService';

const HeaderComponent = ({ openDrawer, openNotifications }: { openDrawer?: () => void; openNotifications?: () => void }) => {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(notificationService.getUnreadCount());

  useEffect(() => {
    const onChange = () => setUnreadCount(notificationService.getUnreadCount());
    notificationService.addListener(onChange);
    return () => notificationService.removeListener(onChange);
  }, []);

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      {openDrawer ? (
        <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
          <Menu size={24} color={colors.neutral[900]} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
      <Text style={styles.title}>AabRahat</Text>
      {openNotifications ? (
        <TouchableOpacity style={styles.iconButton} onPress={openNotifications}>
          <Bell size={24} color={colors.neutral[900]} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.neutral[900],
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.danger[500],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    color: colors.neutral[0],
  },
});

export default HeaderComponent;
