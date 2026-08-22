import { forwardRef, useImperativeHandle } from 'react';
import { StyleProp, ViewStyle, View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';

interface AddressMapProps {
  style: StyleProp<ViewStyle>;
  latitude: number;
  longitude: number;
  address: string;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}

// react-native-maps has no web target, so the web build gets this
// stand-in -- it exposes a no-op animateToRegion so the native
// mapRef.current.animateToRegion(...) call site stays safe on web.
const AddressMap = forwardRef<{ animateToRegion: () => void }, AddressMapProps>(
  ({ style, latitude, longitude }, ref) => {
    useImperativeHandle(ref, () => ({ animateToRegion: () => {} }));
    return (
      <View style={[style, styles.placeholder]}>
        <MapPin size={28} color={colors.primary[500]} />
        <Text style={styles.text}>
          Map view is available in the AabRahat mobile app.
        </Text>
        <Text style={styles.coords}>
          Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
        </Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    gap: spacing.sm,
  },
  text: { ...typography.caption, color: colors.neutral[500], textAlign: 'center', paddingHorizontal: spacing.lg },
  coords: { ...typography.caption, color: colors.neutral[400] },
});

export default AddressMap;
