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
    {/* Top Section Info Row */}
    <View className="flex-row items-center pb-3.5 border-b border-gray-50/80">
      <ShimmerEffect width={80} height={80} className="rounded-2xl" />
      <View className="flex-1 ml-4 h-[80px] justify-between">
        <View>
          <View className="flex-row justify-between items-center">
            <ShimmerEffect width="65%" height={14} className="rounded" />
            <ShimmerEffect width={12} height={12} className="rounded-full" />
          </View>
          <ShimmerEffect width="35%" height={12} className="rounded mt-2" />
        </View>
        <View className="flex-row justify-between items-center">
          <ShimmerEffect width={80} height={12} className="rounded" />
          <ShimmerEffect width={60} height={14} className="rounded" />
        </View>
      </View>
    </View>
    {/* Bottom Actions Shelf */}
    <View className="flex-row items-center justify-between mt-3">
      <ShimmerEffect width="72%" height={40} className="rounded-xl" />
      <ShimmerEffect width="22%" height={40} className="rounded-xl" />
    </View>
  </View>
);

// --- MAIN SCREEN ---
export default function MyRoommatesScreen() {
  const router = useRouter();
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRoommateRequests();
  }, []);

  const fetchMyRoommateRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('roommate_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching roommate requests:', error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    Alert.alert(
      "Delete Request",
      "Are you sure you want to delete this roommate listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('roommate_requests')
                .delete()
                .eq('id', id);

              if (error) throw error;
              setMyRequests((prev) => prev.filter((item) => item.id !== id));
            } catch (error) {
              Alert.alert("Error", "Failed to delete request.");
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
        .from('roommate_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setMyRequests((prev) => 
        prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
      );
    } catch (error) {
      console.error('Error toggling roommate status:', error);
      Alert.alert("Error", "Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // --- MEMOIZED RENDER ITEM COMPONENT ---
  // --- MEMOIZED RENDER ITEM COMPONENT ---
  const renderItem = useCallback(({ item }: { item: any }) => {
    // 1. Get the raw string out of the array or string field
    const imageKey = Array.isArray(item.images) && item.images.length > 0 
      ? item.images[0] 
      : (typeof item.images === 'string' ? item.images : null);

    // 2. Smart routing: If it's already a full web URL, use it directly. Otherwise, build it.
    const displayImage = imageKey
      ? (imageKey.startsWith('http://') || imageKey.startsWith('https://')
          ? imageKey
          : `https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/roommate-listings/${imageKey}`)
      : null;

    const isRented = item.status?.toLowerCase() === 'rented';
    const isCurrentlyUpdating = updatingId === item.id;

    return (
      <View className="bg-white p-4 mb-3 shadow-sm rounded-2xl border border-gray-50">
        
        {/* Top Info Section (Card Click Navigation) */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/roommates/${item.id}`)}
          className="flex-row items-center pb-3.5 border-b border-gray-50/80"
        >
          <View style={{ width: 80, height: 80, position: 'relative' }}>
            <Image
              source={displayImage ? { uri: displayImage } : require("../../assets/profile.png")}
              style={{ width: 80, height: 80, borderRadius: 16 }}
              contentFit="cover"
              transition={200}
            />
            {isRented && (
              <View className="absolute bottom-0 left-0 right-0 bg-orange-50 py-0.5 rounded-b-[16px] items-center border-t border-white/20">
                <Text className="text-orange-600 font-black text-[8px] uppercase tracking-wider">
                  Filled
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1 ml-4 h-[80px] justify-between">
            <View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 font-extrabold text-[15px] flex-1" numberOfLines={1}>
                  {item.title || "Roommate Request"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </View>
              
              <View className={`self-start px-2 py-0.5 rounded mt-0.5 ${item.request_type === 'has_room' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${item.request_type === 'has_room' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {item.request_type === 'has_room' ? 'Has Room' : 'Needs Room'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="location-outline" size={12} color="#9ca3af" />
                <Text className="text-gray-400 text-[11px] ml-1" numberOfLines={1}>
                  {item.location || "Location not set"}
                </Text>
              </View>
              <Text className="text-primary font-black text-[13px]">
                ₦{item.price?.toLocaleString()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Horizontal Actions Shelf */}
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
                  {isRented ? 'Mark Available' : 'Mark as Filled'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleDeleteRequest(item.id)}
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
          <Text className="text-lg font-black text-gray-900 ml-2">My Roommates</Text>
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/roommates/choice')}
          className="bg-primary w-9 h-9 rounded-full items-center justify-center shadow-md active:opacity-80"
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
            contentContainerStyle={{ paddingTop: 20 }}
          />
        ) : (
          <FlatList
            data={myRequests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <View className="bg-gray-50 p-6 rounded-full">
                  <Ionicons name="people-outline" size={50} color="#d1d5db" />
                </View>
                <Text className="text-gray-400 mt-4 text-center font-medium">
                  Looking for a roommate? Post a request to find someone to share a space with!
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/roommates/choice')}
                  className="mt-6 bg-primary px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-bold">Post Roommate Request</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}