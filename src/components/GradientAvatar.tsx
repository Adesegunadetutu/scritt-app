import React, { useMemo } from 'react'; // Added useMemo
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Image } from 'expo-image';

const GUEST_ICON = require('../../assets/profile.png');

interface GradientAvatarProps {
  uri: string | null; // Handle nulls safely
  size?: number;
  strokeWidth?: number;
  idSuffix: string;
}

export const GradientAvatar = ({ uri, size = 45, strokeWidth = 3 }: GradientAvatarProps) => {
  const primaryColor = "#166534"; 
  const secondaryColor = "#f97316"; 
  
  const center = size / 2;
  const imageSize = size - (strokeWidth * 2);

  // 1. UNIQUE GRADIENT ID: This prevents SVG glitching in lists
  const gradId = useMemo(() => `avatar-grad-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* The Gradient Ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={primaryColor} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={(size - strokeWidth) / 2}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="#f3f4f6" // Light gray fill while image loads
        />
      </Svg>

      {/* The Actual Image */}
      <View 
        style={{ 
          width: imageSize, 
          height: imageSize, 
          borderRadius: imageSize / 2, 
          overflow: 'hidden',
          backgroundColor: '#e5e7eb' // Inner placeholder background
        }}
      >
        <Image
          // Switch: If uri exists, use it. If not, use the local icon as the primary source.
          source={uri ? { uri } : GUEST_ICON} 
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="disk"
          transition={300}
          priority="high"
          // Keep this as a backup for while the remote image is actually downloading
          placeholder={GUEST_ICON}
          placeholderContentFit="contain" 
        />
      </View>
    </View>
  );
};