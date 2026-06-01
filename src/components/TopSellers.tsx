import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface TopSellersProps {
  sellers: any[];
  loading: boolean;
}

export default function TopSellers({ sellers, loading }: TopSellersProps) {
  const router = useRouter();

  // 1. Show spinner ONLY while actively loading and we don't have any cached data yet
  if (loading && (!sellers || sellers.length === 0)) {
    return (
      <View className="py-6 justify-center items-center bg-white">
        <ActivityIndicator color="#005d14" size="small" />
      </View>
    );
  }

  // 2. Hide completely if it's done loading and there truly are no verified sellers
  if (!loading && (!sellers || sellers.length === 0)) {
    return null;
  }

  // 3. Render the premium white list smoothly when data is present
  return (
    <View className="bg-white py-4">
      {/* Premium Header Row */}
      <View className="px-5 flex-row justify-between items-center mb-2">
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="fire" size={24} color="#FF5252" />
          <Text className="text-black text-lg font-black tracking-tight ml-2">
            Top Sellers
          </Text>
        </View>
        <TouchableOpacity className="flex-row items-center">
          <Text className="text-[#3A7B66] text-xs font-bold">
            {sellers.length} active stores
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#3A7B66" className="ml-0.5" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Scroll Premium Card Viewport */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {sellers.map((seller) => {
          const displayName = seller.business_name || seller.first_name || "Store";
          const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
          const displayCategory = seller.seller_category || "General Store";

          return (
            <TouchableOpacity
              key={seller.id}
              activeOpacity={0.9}
              onPress={() => router.push(`/profile/${seller.id}`)}
              className="bg-white border border-gray-100 rounded-[24px] py-5 px-4 mr-3 w-[130px] items-center"
              style={{
                // Premium soft drop shadow matching your reference design
                elevation: 3,
                shadowColor: '#AAB8C2',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
              }}
            >
              
              {/* Central Premium Profile Avatar with verification badge */}
              <View className="w-[70px] h-[70px] rounded-full p-[2px] border-2 border-secondary justify-center items-center relative mb-3">
                <View className="w-full h-full rounded-full overflow-hidden bg-gray-50 border border-gray-100">
                  <Image
                    source={{ uri: seller.avatar_url || fallbackAvatar }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
                  />
                </View>

                {/* Absolute Positioned Verification Checkmark Badge */}
                <View className="absolute bottom-0 right-0 bg-[#0081f1] w-[22px] h-[22px] rounded-full items-center justify-center border-4 border-white shadow-sm">
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              </View>

              {/* Vendor Label Stack */}
              <Text 
                className="text-black text-base font-black text-center w-full mb-1" 
                numberOfLines={1}
              >
                {displayName}
              </Text>

             

              {/* Premium "Visit Store" Action Button */}
             {/* Refined Capsule Action Button */}
                        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/profile/${seller.id}`)}
          // Downsized to h-[26px], added border stroke, and changed layout to flex-row for the micro-chevron
          className="bg-primary border border-[#00871E] px-3 h-[26px] rounded-full flex-row items-center justify-center shadow-sm"
          style={{ elevation: 2 }}
        >
          <Text className="text-white text-[8px] font-black tracking-wider">
            Visit Store
          </Text>
          <Ionicons name="chevron-forward" size={10} color="#ffffff" className="ml-0.5" />
        </TouchableOpacity>

            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}