import { forwardRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface AddressMapProps {
  style: StyleProp<ViewStyle>;
  latitude: number;
  longitude: number;
  address: string;
  onPress: (coords: { latitude: number; longitude: number }) => void;
}

const AddressMap = forwardRef<MapView, AddressMapProps>(
  ({ style, latitude, longitude, address, onPress }, ref) => (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={style}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onPress={(e) => onPress(e.nativeEvent.coordinate)}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        title="Delivery Location"
        description={address || 'Tap on map to set location'}
        pinColor="#087EA4"
      />
    </MapView>
  )
);

export default AddressMap;
