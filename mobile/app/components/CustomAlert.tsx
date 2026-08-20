import { Modal, View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import Button from './ui/Button';

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function CustomAlert({ visible, title, message, onClose }: CustomAlertProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button label="OK" onPress={onClose} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: 320,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xxl,
    ...shadow.raised,
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    marginBottom: spacing.md,
    color: colors.neutral[900],
    textAlign: 'center',
  },
  message: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.neutral[700],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    alignSelf: 'center',
    minWidth: 120,
  },
});
