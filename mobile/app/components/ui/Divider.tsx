import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/theme';

export default function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: colors.neutral[100],
  },
});
