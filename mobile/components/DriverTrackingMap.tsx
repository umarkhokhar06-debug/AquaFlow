import { forwardRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MapPin, Truck } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

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

const DriverTrackingMap = forwardRef<MapView, DriverTrackingMapProps>(
  ({ style, driverLocation, deliveryLocation, routeCoordinates, pulseAnim, latitudeDelta, longitudeDelta }, ref) => (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={style}
      initialRegion={{
        latitude: (driverLocation.latitude + deliveryLocation.latitude) / 2,
        longitude: (driverLocation.longitude + deliveryLocation.longitude) / 2,
        latitudeDelta,
        longitudeDelta,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {routeCoordinates.length > 0 && (
        <Polyline coordinates={routeCoordinates} strokeColor="#087EA4" strokeWidth={4} />
      )}

      <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
        <Animated.View style={[styles.driverMarkerContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.driverMarkerPulse} />
        </Animated.View>
        <View style={styles.driverMarker}>
          <Truck size={20} color="#FFFFFF" />
        </View>
      </Marker>

      <Marker coordinate={deliveryLocation} anchor={{ x: 0.5, y: 1 }}>
        <View style={styles.customerMarker}>
          <MapPin size={28} color="#EF4444" />
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#087EA4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    width: 32,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DriverTrackingMap;
