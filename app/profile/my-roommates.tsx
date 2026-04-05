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
  <View className="flex-row bg-[#ffffff] rounded-xl p-4 mb-3 items-center border border-gray-50">
    <ShimmerEffect width={80} height={80} className="rounded-2xl" />
    <View className="flex-1 ml-4 h-[80px] justify-between">
      <View>
        <ShimmerEffect width="60%" height={16} className="rounded" />
        <ShimmerEffect width="40%" height={10} className="rounded mt-2" />
      </View>
      <View className="flex-row justify-between items-center">
        <ShimmerEffect width={70} height={12} className="rounded" />
        <ShimmerEffect width={50} height={20} className="rounded" />
      </View>
    </View>
  </View>
);

// --- MAIN SCREEN ---
export default function MyRoommatesScreen() {
  const router = useRouter();
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      "Are you sure you want to delete this roommate listing?",
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

  const renderItem = ({ item }: { item: any }) => {
    const imageKey = Array.isArray(item.images) && item.images.length > 0 
      ? item.images[0] 
      : null;

    const displayImage = imageKey 
      ? `https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/roommate-listings/${imageKey}`
      : null;

    return (
      <View className="bg-white flex-row p-4 mb-3 items-center shadow-sm rounded-2xl border border-gray-50">
        
        {/* Navigation Wrapper for Content */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/roommates/${item.id}`)}
          className="flex-row flex-1 items-center"
        >
          <Image
            source={displayImage ? { uri: displayImage } : require("../../assets/profile.png")}
            style={{ width: 80, height: 80, borderRadius: 16 }}
            contentFit="cover"
            transition={200}
          />

          <View className="flex-1 ml-4 h-[80px] justify-between">
            <View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 font-bold text-base flex-1" numberOfLines={1}>
                  {item.title || "Roommate Request"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </View>
              
              {/* Request Type Badge */}
              <View className={`self-start px-2 py-0.5 rounded mt-1 ${item.request_type === 'has_room' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${item.request_type === 'has_room' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {item.request_type === 'has_room' ? 'Has Room' : 'Needs Room'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
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

        {/* Delete Button */}
        <TouchableOpacity 
          onPress={() => handleDeleteRequest(item.id)}
          className="ml-2 p-2 bg-red-50 rounded-full"
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

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
          onPress={() => router.push('/add-roommate')}
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
            contentContainerStyle={{ paddingTop: 20 }}
          />
        ) : (
          <FlatList
            data={myRequests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
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
                  onPress={() => router.push('/add-roommate')}
                  className="mt-6 border border-primary px-6 py-2 rounded-full"
                >
                  <Text className="text-primary font-bold">Post Roommate Request</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}