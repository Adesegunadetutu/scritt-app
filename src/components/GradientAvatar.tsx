import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Image } from 'expo-image';

interface GradientAvatarProps {
  uri: string | null;
  size?: number;
  strokeWidth?: number;
   idSuffix: string;
}

export const GradientAvatar = ({ uri, size = 45, strokeWidth = 3 }: GradientAvatarProps) => {
  const primaryColor = "#166534";
  const secondaryColor = "#f97316";

  const center = size / 2;
  const imageSize = size - strokeWidth * 2;

  const gradId = useMemo(
    () => `avatar-grad-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Gradient Ring */}
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
          fill="#f3f4f6"   // outer light gray
        />
      </Svg>

      {/* Inner Avatar */}
      <View
        style={{
          width: imageSize,
          height: imageSize,
          borderRadius: imageSize / 2,
          overflow: 'hidden',
          backgroundColor: uri ? '#e5e7eb' : '#f3f4f6', // ash fallback
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="disk"
            priority="high"
          />
        ) : (
          // empty state → just a clean background (NO ICON)
          <View
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
            }}
          />
        )}
      </View>
    </View>
  );
};