import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  Animated,
  Easing
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
  <View className="flex-row bg-[#ffffff] rounded-none p-4 mb-3 items-center">
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
export default function MyListingsScreen() {
  const router = useRouter();
  const [myItems, setMyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      // Small delay for smooth UI transition
      setTimeout(() => setLoading(false), 600);
    }
  };

  const getConditionColor = (condition: string) => {
    const normalized = condition?.toLowerCase() || '';
    if (normalized.includes('new')) return '#16A34A';
    if (normalized.includes('neat')) return '#2563EB';
    if (normalized.includes('fair')) return '#D97706';
    return '#7C3AED';
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageKey = Array.isArray(item.images) && item.images.length > 0 
      ? item.images[0] 
      : item.images;

    const displayImage = imageKey?.startsWith('http') 
      ? imageKey 
      : `https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/listings/${imageKey}`;

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => router.push(`/profile/manage-listing/${item.id}`)}
        className="bg-[#ffffff] flex-row p-4 mb-3 items-center shadow-sm rounded-xl"
      >
        <Image
          source={{ uri: displayImage }}
          style={{ width: 90, height: 90, borderRadius: 12 }}
          contentFit="cover"
          placeholder={{ uri: 'https://via.placeholder.com/90' }}
          transition={200}
        />

        <View className="flex-1 ml-4 h-[90px] justify-between">
          <View>
            <View className="flex-row justify-between items-center">
              <Text className="text-black font-extrabold text-[13px] leading-tight flex-1" numberOfLines={1}>
                {item.title || "Untitled Listing"}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
            </View>
            <Text className="text-gray-600 text-[10px] mt-3 leading-3" numberOfLines={3}>
              {item.description || "No description provided."}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-[#B45F06] font-bold text-[10px] mr-3">
                {item.category || "Category"}
              </Text>
              <Text 
                style={{ color: getConditionColor(item.condition) }}
                className="font-bold text-[10px]"
              >
                {item.condition || "Condition"}
              </Text>
            </View>
            <Text className="text-gray-900 font-black text-[11px]">
               ₦{item.price?.toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="white" translucent={true} />

      {/* SafeArea-aware Header */}
      <View 
        style={{ 
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 55,
        }} 
        className="bg-white border-b border-gray-100 shadow-sm"
      >
        <View className="px-4 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
              className="p-1"
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900 ml-4">My Listings</Text>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/create-listing')}
            className="bg-primary w-9 h-9 rounded-full items-center justify-center shadow-md"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1">
        {loading ? (
          <FlatList
            data={Array(5).fill({})}
            renderItem={() => <ListingRowSkeleton />}
            keyExtractor={(_, index) => `skel-${index}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          />
        ) : (
          <FlatList
            data={myItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ 
              paddingHorizontal: 16, 
              paddingTop: 16, 
              paddingBottom: 40 
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <Ionicons name="list-outline" size={60} color="#d1d5db" />
                <Text className="text-gray-400 mt-4 text-center font-medium">
                  You haven't added any listings yet.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

function MenuLink({ icon, label, onPress, color = "#16a34a" }: { icon: any, label: string, onPress?: () => void, color?: string }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between py-4 border-b border-gray-100">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color={color} />
        <Text className="ml-3 text-gray-800 font-medium">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}