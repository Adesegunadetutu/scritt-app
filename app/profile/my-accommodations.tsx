import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  Animated,
  Easing,
  Alert
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from 'expo-router';
import { Image } from "expo-image";

// --- SKELETON / SHIMMER COMPONENTS ---
const ShimmerEffect = ({ width, height, className }: { width: any, height: number, className?: string }) => {
  const shimmerValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerValue]);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [typeof width === 'number' ? -width : -400, typeof width === 'number' ? width : 400], 
  });

  return (
    <View 
      style={{ width, height, overflow: 'hidden', backgroundColor: '#E5E7EB' }} 
      className={className}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        }}
      />
    </View>
  );
};

const ListingRowSkeleton = () => (
  <View className="flex-row bg-app-bg rounded-xl p-4 mb-3 items-center border border-gray-50">
    <ShimmerEffect width={90} height={90} className="rounded-xl" />
    <View className="flex-1 ml-4 h-[90px] justify-between">
      <View>
        <ShimmerEffect width="75%" height={16} className="rounded" />
        <ShimmerEffect width="100%" height={12} className="rounded mt-2" />
      </View>
      <View className="flex-row justify-between items-center">
        <ShimmerEffect width={80} height={12} className="rounded" />
        <ShimmerEffect width={60} height={28} className="rounded" />
      </View>
    </View>
  </View>
);

// --- MAIN SCREEN ---
export default function MyAccommodationsScreen() {
  const router = useRouter();
  const [myItems, setMyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAccommodations();
  }, []);

  const fetchMyAccommodations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('accommodations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching accommodations:', error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to remove this accommodation? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('accommodations')
                .delete()
                .eq('id', id);

              if (error) throw error;

              // Update local state to remove the item immediately
              setMyItems((prev) => prev.filter((item) => item.id !== id));
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert("Error", "Could not delete this item.");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageKey = Array.isArray(item.images) && item.images.length > 0 
      ? item.images[0] 
      : item.images;

    const displayImage = imageKey 
      ? `https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/accommodation_listings/${imageKey}`
      : null;

    return (
      // Changed outer wrapper to View to stop entire card from dimming
      <View className="bg-white flex-row p-4 mb-3 items-center shadow-sm rounded-2xl border border-gray-50">
        
        {/* Navigation Area: User clicks this to edit */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/accommodation/${item.id}`)}
          className="flex-row flex-1 items-center"
        >
          <Image
            source={displayImage ? { uri: displayImage } : require("../../assets/profile.png")}
            style={{ width: 90, height: 90, borderRadius: 12 }}
            contentFit="cover"
            transition={200}
          />

          <View className="flex-1 ml-4 h-[90px] justify-between">
            <View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 font-bold text-[14px] flex-1" numberOfLines={1}>
                  {item.title || "Untitled Property"}
                </Text>
                {/* Visual cue that the card is still interactive for editing */}
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </View>
              <Text className="text-gray-500 text-[11px] mt-1" numberOfLines={2}>
                {item.location || "Location not specified"}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="bg-green-50 px-2 py-0.5 rounded">
                <Text className="text-primary font-bold text-[10px] uppercase">
                  {item.category || "Housing"}
                </Text>
              </View>
              <Text className="text-gray-900 font-black text-[12px]">
                ₦{item.price?.toLocaleString()}<Text className="text-[10px] font-medium text-gray-500">{item.rent_period ? ` / ${item.rent_period.toLowerCase()}` : ''}</Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Delete Action Button */}
        <TouchableOpacity 
          onPress={() => handleDelete(item.id)}
          className="ml-2 p-2 bg-red-50 rounded-full"
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
            className="bg-white border-b border-gray-50 px-4 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="p-1"
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-black text-gray-900 ml-2">My Accommodations</Text>
        </View>

        <TouchableOpacity 
            onPress={() => router.push('/add-accommodation')}
            className="bg-primary w-9 h-9 rounded-full items-center justify-center shadow-md">
            <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 px-4">
        {loading ? (
          <FlatList
            data={Array(5).fill({})}
            renderItem={() => <ListingRowSkeleton />}
            keyExtractor={(_, index) => `skel-${index}`}
            contentContainerStyle={{ paddingTop: 16 }}
          />
        ) : (
          <FlatList
            data={myItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <View className="bg-gray-50 p-6 rounded-full">
                  <Ionicons name="home-outline" size={50} color="#d1d5db" />
                </View>
                <Text className="text-gray-400 mt-4 text-center font-medium">
                  You haven't listed any accommodations yet.
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/add-accommodation')}
                  className="mt-6 bg-primary px-8 py-3 rounded-full"
                >
                  <Text className="text-white font-bold">Post an Apartment</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}