// Native implementation. Metro picks CityMap.web.tsx for the browser preview.
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Truck } from 'lucide-react-native';
import { colors as c } from './theme';
import type { CityMapProps } from './CityMap.types';
const coordinate = (point: { latitude: number | string; longitude: number | string }) => ({
  latitude: Number(point.latitude),
  longitude: Number(point.longitude),
});
export default function CityMap({
  height = 205,
  point,
  locations = [],
  stops = [],
  onPoint,
  onTruck,
  interactive = false,
}: CityMapProps) {
  const mapRef = useRef<MapView>(null);
  const allPoints = [...locations, ...stops, ...(point ? [point] : [])]
    .map(coordinate)
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  const center = allPoints[0] || { latitude: -23.5554, longitude: -46.6576 };
  const coordinatesJson = JSON.stringify(allPoints);
  useEffect(() => {
    const points = JSON.parse(coordinatesJson) as { latitude: number; longitude: number }[];
    if (points.length)
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 55, right: 55, bottom: 55, left: 55 },
        animated: true,
      });
  }, [coordinatesJson]);
  return (
    <View
      pointerEvents={interactive || onPoint || onTruck ? 'auto' : 'none'}
      style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: c.sage }}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ ...center, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsCompass={false}
        onPress={onPoint ? (event) => onPoint(event.nativeEvent.coordinate) : undefined}
      >
        {stops.length > 1 && (
          <Polyline
            coordinates={[...stops]
              .sort((a, b) => Number(a.sequence) - Number(b.sequence))
              .map(coordinate)}
            strokeColor={c.green}
            strokeWidth={4}
            lineDashPattern={[7, 6]}
          />
        )}
        {stops.map((s) => (
          <Marker
            key={s.id}
            coordinate={coordinate(s)}
            title={s.address || `Parada ${s.sequence}`}
            description={s.status === 'Completed' ? 'Coletada' : 'Parada planejada'}
            pinColor={s.status === 'Completed' ? '#9FAFA1' : c.green}
          />
        ))}
        {locations.map((l, i) => (
          <Marker
            key={l.truckId}
            coordinate={coordinate(l)}
            title={`Caminhão ${i + 1}`}
            description={l.isOnline ? 'GPS atualizado' : 'Última posição'}
            onPress={() => onTruck?.(l.truckId)}
          >
            <View
              style={{
                backgroundColor: l.isOnline ? c.green : c.muted,
                width: 38,
                height: 38,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: c.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={20} color={c.white} />
            </View>
          </Marker>
        ))}
        {point && (
          <Marker coordinate={coordinate(point)} title="Ponto de coleta" pinColor={c.green} />
        )}
      </MapView>
    </View>
  );
}
