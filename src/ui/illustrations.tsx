import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
export function TruckArt({ size = 170 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 240 174">
      <Circle cx="124" cy="78" r="67" fill="#315D45" />
      <Circle cx="124" cy="78" r="52" fill="none" stroke="#588064" strokeDasharray="4 8" />
      <Ellipse cx="126" cy="145" rx="94" ry="8" fill="#113927" opacity=".3" />
      <Path d="M29 117V64Q29 59 35 59H151V122H29Z" fill="#A9CC8A" />
      <Path d="M34 64H144V109H34Z" fill="#94B879" />
      <Path d="M151 82H182L207 108V128H151Z" fill="#E3EFCC" />
      <Path d="M160 87H179L194 106H160Z" fill="#315D45" />
      <Rect x="27" y="118" width="182" height="12" rx="3" fill="#D0DFBC" />
      <Rect x="194" y="111" width="12" height="6" rx="2" fill="#E6C586" />
      <G stroke="#638A56" strokeWidth="2.5" fill="none">
        <Path d="M60 70V105M75 70V105M90 70V105M105 70V105M120 70V105M135 70V105" />
      </G>
      <Circle cx="65" cy="132" r="16" fill="#173929" />
      <Circle cx="65" cy="132" r="7" fill="#99B887" />
      <Circle cx="178" cy="132" r="16" fill="#173929" />
      <Circle cx="178" cy="132" r="7" fill="#99B887" />
      <Path
        d="M89 84L98 74L108 89H99L97 84M105 94L108 102H91L94 94M86 96L79 89L87 77L92 84"
        fill="none"
        stroke="#DDEDCA"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M19 97Q2 93 7 73Q24 73 19 97Z" fill="#C8E59A" />
      <Path d="M18 106L15 81" stroke="#97BA78" strokeWidth="2" />
      <Path d="M224 67Q202 60 212 41Q233 47 224 67Z" fill="#C8E59A" />
      <Path d="M222 78L218 53" stroke="#97BA78" strokeWidth="2" />
      <Circle cx="181" cy="40" r="4" fill="#D8ED9B" />
      <Circle cx="45" cy="40" r="2" fill="#D8ED9B" />
    </Svg>
  );
}
