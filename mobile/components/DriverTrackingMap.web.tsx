import { forwardRef, useImperativeHandle } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Truck } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface DriverTrackingMapProps {
  style: StyleProp<ViewStyle>;
  driverLocation: LatLng;
  deliveryLocation: LatLng;
  routeCoordinates: LatLng[];
  pulseAnim: Animated.Value;
  latitudeDelta: number;
  longitudeDelta: number;
}

// react-native-maps has no web target, so the web build gets this
// stand-in -- it exposes no-op fitToCoordinates/animateCamera so
// native mapRef.current call sites stay safe on web.
const DriverTrackingMap = forwardRef<
  { fitToCoordinates: () => void; animateCamera: () => void },
  DriverTrackingMapProps
>(({ style }, ref) => {
  useImperativeHandle(ref, () => ({
    fitToCoordinates: () => {},
    animateCamera: () => {},
  }));
  return (
    <View style={[style, styles.placeholder]}>
      <Truck size={28} color={colors.primary[500]} />
      <Text style={styles.text}>Live route map is available in the AabRahat mobile app.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    gap: spacing.sm,
  },
  text: { ...typography.caption, color: colors.neutral[500], textAlign: 'center', paddingHorizontal: spacing.lg },
});

export default DriverTrackingMap;
