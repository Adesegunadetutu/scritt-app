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
  ActivityIndicator,
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
export default function MyServicesScreen() {
  const router = useRouter();
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyServices();
  }, []);

  const fetchMyServices = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyServices(data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleDeleteService = async (id: string) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service listing? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

              if (error) throw error;
              setMyServices((prev) => prev.filter((service) => service.id !== id));
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert("Error", "Failed to delete service.");
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
      ? `https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/service_portfolios/${imageKey}`
      : null;

    return (
      // Changed from TouchableOpacity to View
      <View className="bg-white flex-row p-4 mb-3 items-center shadow-sm rounded-2xl border border-gray-50">
        
        {/* Navigation Wrapper for Content */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/services/${item.id}`)}
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
                  {item.business_name || "Service Provider"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </View>
              <Text className="text-[#16a34a] font-bold text-[10px] uppercase tracking-widest">
                {item.category}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className={`px-2 py-0.5 rounded ${item.is_verified ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <Text className={`text-[9px] font-bold ${item.is_verified ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.is_verified ? 'VERIFIED' : 'Not verified'}
                  </Text>
                </View>
                {item.home_service && (
                  <Text className="ml-3 text-gray-400 text-[10px] font-medium italic">Home Service</Text>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity 
          onPress={() => handleDeleteService(item.id)}
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
          <Text className="text-lg font-black text-gray-900 ml-2">My Services</Text>
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/add-services')}
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
            data={myServices}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <View className="bg-gray-50 p-6 rounded-full">
                  <Ionicons name="construct-outline" size={50} color="#d1d5db" />
                </View>
                <Text className="text-gray-400 mt-4 text-center font-medium">
                  You haven't listed any services yet. Reach more customers by adding your business!
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/add-services')}
                  className="mt-6 border border-green-600 px-6 py-2 rounded-full"
                >
                  <Text className="text-green-600 font-bold">Add Your First Service</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}