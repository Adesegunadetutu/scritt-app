import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70; // Adjust height if needed
const BUTTON_RADIUS = 35; // Matches your floating button size

// This path draws the "dip" shape
const path = `
  M0,0 
  L${width / 2 - BUTTON_RADIUS - 20},0 
  Q${width / 2 - BUTTON_RADIUS},0 ${width / 2},${BUTTON_RADIUS} 
  Q${width / 2 + BUTTON_RADIUS},0 ${width / 2 + BUTTON_RADIUS + 20},0 
  L${width},0 
  L${width},${TAB_BAR_HEIGHT} 
  L0,${TAB_BAR_HEIGHT} 
  Z
`;

export default function CurvedTabBarBackground() {
  return (
    <View style={{ position: 'absolute', bottom: 0, width: '100%' }}>
      {/* The SVG curve */}
      <Svg width={width} height={TAB_BAR_HEIGHT} style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 }}>
        <Path d={path} fill="#EAA535" />
      </Svg>
    </View>
  );
}