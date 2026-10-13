import React, { useMemo, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Truck } from 'lucide-react-native';
import { colors as c } from './theme';
import { Txt } from './components';
import type { CityMapProps } from './CityMap.types';
export default function CityMap({
  height = 205,
  point,
  locations = [],
  stops = [],
  onPoint,
  onTruck,
}: CityMapProps) {
  const [width, setWidth] = useState(360);
  const anchor = locations[0] || stops[0] || point;
  const anchorLatitude = Number(anchor?.latitude ?? -23.5554);
  const anchorLongitude = Number(anchor?.longitude ?? -46.6576);
  const base = useMemo(
    () => ({ latitude: anchorLatitude, longitude: anchorLongitude }),
    [anchorLatitude, anchorLongitude],
  );
  const xy = (p: { latitude: number | string; longitude: number | string }) => ({
    x: Math.max(24, Math.min(336, 180 + (Number(p.longitude) - base.longitude) * 12000)),
    y: Math.max(28, Math.min(202, 115 - (Number(p.latitude) - base.latitude) * 12000)),
  });
  const routePoints = [...stops]
    .sort((a, b) => Number(a.sequence) - Number(b.sequence))
    .map((s) => {
      const p = xy(s);
      return `${p.x},${p.y}`;
    })
    .join(' L ');
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, overflow: 'hidden', borderRadius: 20, backgroundColor: '#E6ECDC' }}
    >
      <Pressable
        accessibilityRole={onPoint ? 'button' : 'image'}
        accessibilityLabel={
          onPoint ? 'Escolher ponto no mapa ilustrativo' : 'Mapa ilustrativo das posições'
        }
        onPress={
          onPoint
            ? (e) => {
                const x = (e.nativeEvent.locationX / width) * 360;
                const y = (e.nativeEvent.locationY / height) * 230;
                onPoint({
                  latitude: base.latitude + (115 - y) / 12000,
                  longitude: base.longitude + (x - 180) / 12000,
                });
              }
            : undefined
        }
        style={{ flex: 1 }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 360 230" preserveAspectRatio="none">
          <Rect width="360" height="230" fill="#E8EDDF" />
          <G transform="rotate(-22 180 115)">
            <Rect x="-35" y="45" width="140" height="95" rx="15" fill="#C7D9B7" />
            <Rect x="210" y="120" width="150" height="98" rx="15" fill="#D4DFC4" />
            {Array.from({ length: 7 }, (_, i) => (
              <Path
                key={`h${i}`}
                d={`M-100 ${i * 48 - 28}H500`}
                stroke="#F8FAF1"
                strokeWidth={i === 3 ? 15 : 10}
              />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <Path
                key={`v${i}`}
                d={`M${i * 60 - 28} -100V400`}
                stroke="#F8FAF1"
                strokeWidth={i === 4 ? 15 : 9}
              />
            ))}
            <Rect x="160" y="60" width="43" height="26" rx="4" fill="#D8E0CD" />
            <Rect x="280" y="15" width="40" height="25" rx="4" fill="#D8E0CD" />
            <SvgText x="120" y="126" fill="#9CA991" fontSize="8" fontFamily="sans-serif">
              CENTRO
            </SvgText>
          </G>
          {!!routePoints && (
            <Path
              d={`M ${routePoints}`}
              fill="none"
              stroke={c.green}
              strokeWidth="4"
              strokeDasharray="7 5"
              strokeLinecap="round"
            />
          )}
          {stops.map((s) => {
            const p = xy(s);
            return (
              <G key={s.id}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r="10"
                  fill={s.status === 'Completed' ? '#ADBBA1' : c.white}
                  stroke={c.green}
                  strokeWidth="2"
                />
                <SvgText
                  x={p.x}
                  y={p.y + 3}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={c.green}
                >
                  {s.sequence}
                </SvgText>
              </G>
            );
          })}
          {point && (
            <G>
              <Circle
                {...{ cx: xy(point).x, cy: xy(point).y }}
                r="21"
                fill={c.green}
                opacity=".12"
              />
              <Circle
                {...{ cx: xy(point).x, cy: xy(point).y }}
                r="8"
                fill={c.green}
                stroke="white"
                strokeWidth="3"
              />
            </G>
          )}
        </Svg>
      </Pressable>
      {locations.map((l) => {
        const p = xy(l);
        const markerStyle: ViewStyle = {
          position: 'absolute',
          left: (p.x / 360) * width - 18,
          top: (p.y / 230) * height - 18,
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: l.isOnline ? c.green : c.muted,
          borderWidth: 3,
          borderColor: c.white,
          alignItems: 'center',
          justifyContent: 'center',
        };
        return onTruck ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Caminhão ${l.isOnline ? 'com GPS atualizado' : 'sem GPS recente'}`}
            key={l.truckId}
            onPress={() => onTruck(l.truckId)}
            style={markerStyle}
          >
            <Truck color="white" size={19} />
          </Pressable>
        ) : (
          <View
            key={l.truckId}
            style={markerStyle}
            accessibilityRole="image"
            accessibilityLabel={`Caminhão ${l.isOnline ? 'com GPS recente' : 'sem GPS recente'}`}
          >
            <Truck color="white" size={19} />
          </View>
        );
      })}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 12,
          bottom: 10,
          backgroundColor: '#F8FAF0ED',
          borderRadius: 6,
          paddingHorizontal: 7,
          paddingVertical: 3,
        }}
      >
        <Txt size={9} color={c.muted}>
          Mapa ilustrativo · preview web
        </Txt>
      </View>
    </View>
  );
}
