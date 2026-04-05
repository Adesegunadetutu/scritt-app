import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl, // Added for pull-to-refresh
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { debounce } from 'lodash';
import { WifiOff } from 'lucide-react-native'; // 1. Added context-specific icon
import { useNetworkObserver } from '@/hooks/useNetworkObserver';


const CATEGORIES = ["All", "Single room", "A room self con", "room and parlor", "room & parlor self con", "two bedroom flat", "3 bedroom flat", "others"];

const BUCKET_URL = "https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/accommodation_listings/";

export default function AccommodationsScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  const [selectedCat, setSelectedCat] = useState("All");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // FETCH LOGIC
  const fetchAccommodations = async (showLoading = true, text = searchQuery) => {
    if (!isConnected) return;
  try {
    if (showLoading) setLoading(true);
    let query = supabase
      .from('accommodations')
      .select(` *, profiles:profiles!fk_accommodation_owner (is_verified) `)
      .eq('is_available', true);

    if (selectedCat !== "All") {
      query = query.eq('category', selectedCat);
    }

    // SEARCH FILTER: Logic for title, location, and description
    if (text) {
      query = query.or(`title.ilike.%${text}%,location.ilike.%${text}%,description.ilike.%${text}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    setListings(data || []);
  } catch (err) {
    console.error("Fetch Error:", err);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

// 2. CREATE DEBOUNCED SEARCH
const debouncedSearch = useCallback(
  debounce((text) => fetchAccommodations(false, text), 400),
  [selectedCat, isConnected] // Re-run if category changes
);

const handleSearchChange = (text: string) => {
  setSearchQuery(text);
  debouncedSearch(text);
};

  // 1. REFRESH ON FOCUS: Ensures data is fresh when navigating back from adding a listing
  useFocusEffect(
    useCallback(() => {
      fetchAccommodations(false); 
    }, [selectedCat])
  );

  // 2. REALTIME: Listen for new house listings while on the screen
  useEffect(() => {
    if (!isConnected) return;
    const channel = supabase
      .channel('accommodation-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accommodations' },
        (payload) => {
          const newListing = payload.new;
          // Filter logic: match category and availability
          if (newListing.is_available && (selectedCat === "All" || newListing.category === selectedCat)) {
            setListings((current) => [newListing, ...current]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCat, isConnected]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccommodations();
  }, [selectedCat, isConnected]);

  // --- OFFLINE RENDER ---
  // 4. Full screen blocker with the narrower centered button
  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't load the latest accommodations right now. Please check your internet and try again.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary w-64 py-4 rounded-[24px] items-center self-center shadow-md active:opacity-70"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
  const mainImage = item.images && item.images.length > 0 ? item.images[0] : null;
  
  // Helper to ensure no double slashes //
  const cleanImageName = mainImage?.startsWith('/') ? mainImage.substring(1) : mainImage;
  const imageUrl = mainImage 
    ? `${BUCKET_URL}${cleanImageName}`
    : 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => router.push(`/accommodation/${item.id}`)}
      // Updated to your new 48% grid width
      className="bg-card rounded-[24px] mb-4 w-[48%] overflow-hidden shadow-sm border border-card-border"
    >
      {/* Image Container */}
      <View className="w-full h-36 bg-gray-200">
        <Image
          source={{ uri: imageUrl }}
          // FIX: Use explicit style instead of className for the image itself
          style={{ width: '100%', height: '100%' }} 
          contentFit="cover"
          transition={300}
          cachePolicy="disk"
        />
        
        {/* Verification Badge */}
        {item.profiles?.is_verified && (
          <View className="absolute top-2 right-2 bg-primary-surface/90 px-2 py-1 rounded-full border border-primary/10 flex-row items-center">
            <Ionicons name="checkmark-circle" size={10} color="#005d14" />
            <Text className="ml-1 text-primary text-[8px] font-black uppercase">Verified</Text>
          </View>
        )}
      </View>

      {/* Content Area */}
      <View className="p-3">
        <Text className="text-app-text font-black text-[13px] leading-4" numberOfLines={1}>
          {item.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="location" size={10} color="#ef4444" />
          <Text className="text-app-text-muted text-[10px] ml-1" numberOfLines={1}>
            {item.location || 'Location'}
          </Text>
        </View>
        <View className="mt-3">
          <Text className="text-primary font-black text-sm">
            ₦{item.price?.toLocaleString()}
          </Text>
          <Text className="text-app-text-muted text-[9px] font-bold">/ {item.rent_period}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
        
        {/* Header Section */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
              <Ionicons name="arrow-back" size={26} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-800 ">Accommodations</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/add-accommodation')}
            className="bg-primary p-2 rounded-full shadow-sm"
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
<View className="px-6 mb-6">
  <View className="w-full h-14 bg-neutral-100 rounded-2xl flex-row items-center px-4 border border-card-border">
    <Ionicons name="search-outline" size={20} color="#005d14" />
    <TextInput
      placeholder="Search area, house type..."
      placeholderTextColor="#9ca3af"
      value={searchQuery}
      onChangeText={handleSearchChange}
      className="ml-2 flex-1 text-app-text font-medium text-[15px]"
      autoCapitalize="none"
      selectionColor="#005d14"
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity onPress={() => handleSearchChange("")}>
        <Ionicons name="close-circle" size={18} color="#9ca3af" />
      </TouchableOpacity>
    )}
  </View>
</View>
        
        {/* Filter Categories */}
        <View className="px-6 mb-8 flex-row items-center">
          <TouchableOpacity className="bg-gray-200 p-3 rounded-xl mr-4">
            <Ionicons name="options-outline" size={20} color="black" />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedCat(cat)}
                className={`px-4 py-2.5 rounded-xl mr-2 ${
                  selectedCat === cat ? 'bg-secondary' : 'bg-gray-200'
                }`}
              >
                <Text className={`font-bold text-[11px] ${
                  selectedCat === cat ? 'text-white' : 'text-gray-800'
                }`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#005d14" className="mt-20" />
        ) : (
          <FlatList
            data={listings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            // GRID CHANGES: Added numColumns and columnWrapperStyle
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#005d14" />
            }
            ListEmptyComponent={
              <View className="mt-20 items-center">
                <Ionicons name="home-outline" size={48} color="#ccc" />
                <Text className="text-gray-400 font-medium mt-2">No listings found</Text>
              </View>
            }
          />
        )}
    </SafeAreaView>
  );
}