import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoommateChoice() {
  const router = useRouter();

  const handleSelect = (type: 'has_room' | 'needs_room') => {
    router.push({ 
      pathname: '/roommates/add-roommates', 
      params: { type } 
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header with Back Button */}
      <View className="px-6 py-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 bg-gray-50 items-center justify-center rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-8 justify-center pb-20">
        <View className="mb-12">
          <Text className="text-3xl font-black text-gray-900 text-center">
            Getting Started
          </Text>
          <Text className="text-gray-500 text-center mt-2 text-base">
            Which of these describes your situation?
          </Text>
        </View>

        

      {/* Option 1: I have a room */}
      <TouchableOpacity 
        onPress={() => handleSelect('has_room')}
        className="bg-primary py-6 rounded-[20px] mb-4 items-center shadow-md shadow-green-900/20"
      >
        <Ionicons name="home" size={24} color="white" />
        <Text className="text-white font-black text-sm mt-1">I Have a Room</Text>
        <Text className="text-white/70 text-xs">I'm looking for someone to join me</Text>
      </TouchableOpacity>

      {/* Option 2: I need a room */}
      <TouchableOpacity 
        onPress={() => handleSelect('needs_room')}
        className="bg-gray-100 py-6 rounded-[20px] items-center border border-gray-200"
      >
        <Ionicons name="search" size={24} color="#4b5563" />
        <Text className="text-gray-700 font-black text-sm mt-1">I Need a Room</Text>
        <Text className="text-gray-400 text-xs">I'm looking for a place to stay</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}