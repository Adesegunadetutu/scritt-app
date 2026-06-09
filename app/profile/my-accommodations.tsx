import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  Animated,
  Easing,
  Alert,
  ActivityIndicator
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
  <View className="bg-white p-4 mb-3 shadow-sm rounded-2xl border border-gray-50">
    
    {/* Top Section Mirror: Media & Metadata Info Row */}
    <View className="flex-row items-center pb-3.5 border-b border-gray-50/80">
      {/* Thumbnail Box */}
      <ShimmerEffect width={85} height={85} className="rounded-xl" />
      
      {/* Content Meta Column */}
      <View className="flex-1 ml-4 h-[85px] justify-between">
        <View>
          <View className="flex-row justify-between items-center">
            {/* Title Line */}
            <ShimmerEffect width="65%" height={14} className="rounded" />
            {/* Chevron Cue */}
            <ShimmerEffect width={12} height={12} className="rounded-full" />
          </View>
          {/* Location Line */}
          <ShimmerEffect width="40%" height={10} className="rounded mt-2" />
        </View>

        <View className="flex-row items-center justify-between">
          {/* Category Tag */}
          <ShimmerEffect width={55} height={16} className="rounded" />
          {/* Price Tag */}
          <ShimmerEffect width={75} height={14} className="rounded" />
        </View>
      </View>
    </View>

    {/* Bottom Section Mirror: Inline Actions Shelf */}
    <View className="flex-row items-center justify-between mt-3">
      {/* Toggle Button Container */}
      <ShimmerEffect width="72%" height={40} className="rounded-xl" />
      {/* Trash Button Container */}
      <ShimmerEffect width="22%" height={40} className="rounded-xl" />
    </View>

  </View>
);

// --- MAIN SCREEN ---
export default function MyAccommodationsScreen() {
  const router = useRouter();
  const [myItems, setMyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const toggleRentedStatus = async (id: string, currentStatus: string) => {
    const isRented = currentStatus?.toLowerCase() === 'rented';
    const newStatus = isRented ? 'active' : 'rented';
    
    try {
      setUpdatingId(id);
      const { error } = await supabase
        .from('accommodations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setMyItems((prev) => 
        prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
      );
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert("Error", "Could not update availability status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // --- MEMOIZED RENDER ITEM COMPONENT ---
  const renderItem = useCallback(({ item }: { item: any }) => {
    const imageKey = Array.isArray(item.images) && item.images.length > 0 
      ? item.images[0] 
      : item.images;

    const displayImage = imageKey 
      ? `https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/accommodation_listings/${imageKey}`
      : null;

    const isRented = item.status?.toLowerCase() === 'rented';
    const isCurrentlyUpdating = updatingId === item.id;

    return (
      <View className="bg-white p-4 mb-3 shadow-sm rounded-2xl border border-gray-50">
        
        {/* Top Info Section (Navigates to Full Page / Edit Mode) */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/accommodation/${item.id}`)}
          className="flex-row items-center pb-3.5 border-b border-gray-50/80"
        >
          <View style={{ width: 85, height: 85, position: 'relative' }}>
            <Image
              source={displayImage ? { uri: displayImage } : require("../../assets/profile.png")}
              style={{ width: 85, height: 85, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
            {isRented && (
              <View className="absolute bottom-0 left-0 right-0 bg-orange-50 py-0.5 rounded-b-[12px] items-center border-t border-white/20">
                <Text className="text-orange-600 font-black text-[8px] uppercase tracking-wider">
                  Rented
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1 ml-4 h-[85px] justify-between">
            <View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 font-extrabold text-[14px] flex-1" numberOfLines={1}>
                  {item.title || "Untitled Property"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </View>
              <Text className="text-gray-500 text-[11px] mt-0.5" numberOfLines={1}>
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
                ₦{item.price?.toLocaleString()}
                <Text className="text-[10px] font-medium text-gray-500">
                  {item.rent_period ? ` / ${item.rent_period.toLowerCase()}` : ''}
                </Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Inline Actions Shelf (Sits Cleanly Below Title & Price) */}
        <View className="flex-row items-center justify-between mt-3">
          <TouchableOpacity
            disabled={isCurrentlyUpdating}
            onPress={() => toggleRentedStatus(item.id, item.status)}
            activeOpacity={0.7}
            className={`flex-1 mr-3 h-10 rounded-xl flex-row items-center justify-center border ${
              isRented 
                ? 'bg-orange-50/60 border-orange-100' 
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            {isCurrentlyUpdating ? (
              <ActivityIndicator size="small" color={isRented ? '#ea580c' : '#4b5563'} />
            ) : (
              <>
                <Ionicons 
                  name={isRented ? "refresh-circle-outline" : "checkmark-circle-outline"} 
                  size={16} 
                  color={isRented ? '#ea580c' : '#4b5563'} 
                  style={{ marginRight: 5 }}
                />
                <Text className={`font-bold text-xs ${isRented ? 'text-orange-700' : 'text-gray-600'}`}>
                  {isRented ? 'Mark Available' : 'Mark Rented'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleDelete(item.id)}
            className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center border border-red-100"
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>

      </View>
    );
  }, [updatingId]);

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="bg-white border-b border-gray-50 px-4 py-4 flex-row items-center justify-between"
      >
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
          className="bg-primary w-9 h-9 rounded-full items-center justify-center shadow-md"
        >
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16 }}
          />
        ) : (
          <FlatList
            data={myItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
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