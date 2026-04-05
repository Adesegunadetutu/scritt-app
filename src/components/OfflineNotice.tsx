import React from 'react';
import { View, Text, StatusBar, Platform } from 'react-native';
import { useListingsStore } from '@/stores/useListingsStore';
import { Ionicons } from '@expo/vector-icons';

export default function OfflineNotice() {
  const isOffline = useListingsStore((state) => state.isOffline);

  if (!isOffline) {
    return <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />;
  }

  return (
    <View 
      className="bg-primary items-center justify-center" 
      style={{ 
        // Handles status bar height for Android and iOS
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 54,
        paddingBottom: 12
      }}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Container changed to column to put icon above text */}
      <View className="items-center justify-center mb-4">
        <Ionicons name="cloud-offline" size={24} color="white" />
        <Text className="text-white text-[13px] font-medium tracking-wider mt-1">
          Please Check Your Internet Connection
        </Text>
      </View>
    </View>
  );
}