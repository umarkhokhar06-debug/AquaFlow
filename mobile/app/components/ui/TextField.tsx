import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  labelColor?: string;
  error?: string;
  icon?: LucideIcon;
  secureToggle?: boolean;
}

export default function TextField({ label, labelColor, error, icon: Icon, secureToggle, secureTextEntry, style, ...rest }: TextFieldProps) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {Icon ? <Icon size={18} color={colors.neutral[400]} style={styles.leftIcon} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor={colors.neutral[400]}
          style={[styles.input, style]}
        />
        {secureToggle ? (
          <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={8}>
            {hidden ? <Eye size={18} color={colors.neutral[400]} /> : <EyeOff size={18} color={colors.neutral[400]} />}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputRowError: {
    borderColor: colors.danger[500],
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.neutral[900],
  },
  error: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.danger[500],
    marginTop: spacing.xs,
  },
});
