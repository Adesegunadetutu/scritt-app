import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  Dimensions, 
  Platform, 
  StyleSheet,
  Easing
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MarqueeAnnouncementProps {
  text: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  duration?: number;
  bgClassName?: string;
  textClassName?: string;
}

export default function MarqueeAnnouncement({
  text,
  iconName = "warning-outline",
  iconColor = "#d97706",
  duration = 14000, 
  bgClassName = "bg-amber-50 border-y border-amber-100 py-2",
  textClassName = "text-amber-800 text-xs font-semibold tracking-wide"
}: MarqueeAnnouncementProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    if (textWidth === 0) return;

    animatedValue.setValue(0);
    
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -textWidth, // Move left exactly by the length of ONE text instance
        duration: duration,
        easing: Easing.linear, 
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    
    animation.start();
    return () => animation.stop();
  }, [animatedValue, duration, textWidth]);

  return (
    <View className={`${bgClassName} overflow-hidden flex-row`} style={styles.outerContainer}>
      <Animated.View 
        style={[
          styles.marqueeTrack,
          { transform: [{ translateX: animatedValue }] }
        ]}
      >
        {/* TRACK 1: First instance of Icon + Text */}
        <View 
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            if (width > 0) setTextWidth(width);
          }}
          style={styles.singleItemTrack}
        >
          {iconName && (
            <Ionicons 
              name={iconName} 
              size={16} 
              color={iconColor} 
              style={styles.iconStyle} 
            />
          )}
          <Text numberOfLines={1} style={styles.textStyle} className={textClassName}>
            {text}
          </Text>
          {/* Breathing space separation between the two loops */}
          <View style={styles.spacer} />
        </View>

        {/* TRACK 2: Exact Duplicate to catch the tail and eliminate breaks/blank space */}
        {textWidth > 0 && (
          <View style={styles.singleItemTrack}>
            {iconName && (
              <Ionicons 
                name={iconName} 
                size={16} 
                color={iconColor} 
                style={styles.iconStyle} 
              />
            )}
            <Text numberOfLines={1} style={styles.textStyle} className={textClassName}>
              {text}
            </Text>
            <View style={styles.spacer} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: SCREEN_WIDTH,
  },
  marqueeTrack: {
    flexDirection: 'row',
    // CRITICAL: Tells the animated view to expand horizontally past screen limits smoothly
    width: 'auto', 
  },
  singleItemTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconStyle: {
    marginRight: 6,
  },
  textStyle: {
    // Force the native engine to treat this as an un-wrappable canvas string
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  spacer: {
    width: 64, // The padding gap distance before the warning repeats itself
  }
});