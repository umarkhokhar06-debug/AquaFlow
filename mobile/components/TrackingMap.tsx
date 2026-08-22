import { forwardRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MapPin, Truck } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface TrackingMapProps {
  style: StyleProp<ViewStyle>;
  driverLocation: LatLng;
  customerLocation: LatLng;
  isDriverOnline: boolean;
  pulseAnim: Animated.Value;
  latitudeDelta: number;
  longitudeDelta: number;
}

const TrackingMap = forwardRef<MapView, TrackingMapProps>(
  ({ style, driverLocation, customerLocation, isDriverOnline, pulseAnim, latitudeDelta, longitudeDelta }, ref) => (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={style}
      initialRegion={{
        latitude: (driverLocation.latitude + customerLocation.latitude) / 2,
        longitude: (driverLocation.longitude + customerLocation.longitude) / 2,
        latitudeDelta,
        longitudeDelta,
      }}
    >
      {isDriverOnline && (
        <Polyline
          coordinates={[driverLocation, customerLocation]}
          strokeColor="#087EA4"
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
      )}

      {isDriverOnline && (
        <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <Animated.View style={[styles.driverMarkerContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.driverMarkerPulse} />
          </Animated.View>
          <View style={styles.driverMarker}>
            <Truck size={18} color="#FFFFFF" />
          </View>
        </Marker>
      )}

      <Marker coordinate={customerLocation} anchor={{ x: 0.5, y: 1 }}>
        <View style={styles.customerMarker}>
          <MapPin size={24} color="#EF4444" />
        </View>
      </Marker>
    </MapView>
  )
);

const styles = StyleSheet.create({
  driverMarkerContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#087EA4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TrackingMap;
