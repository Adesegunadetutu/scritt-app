import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, StatusBar, 
  Platform, TextInput, ScrollView, ActivityIndicator, RefreshControl 
} from 'react-native';
import { supabase } from '@/lib/supabase';
import ListingCard from '@/components/ListingCard';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { ChevronLeft, Search, MapPin, WifiOff } from 'lucide-react-native';
import { useNetworkObserver } from '@/hooks/useNetworkObserver';
import BannerAdComponent from '@/components/BannerAdComponent';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- CONSTANTS ---
const CATEGORIES = ["All", "household", "electronics", "fashion", "services", "furniture", "gadgets", "food", "books"];

export default function FeaturedListingsScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    getUser();
  }, []);

  // 2. Fetch logic (wired like RoommateFeed)
  const fetchFeatured = async (showLoading = true) => {
  if (!isConnected) return;
  
  try {
    if (showLoading) setLoading(true);
    
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles!inner(is_verified)
      `)
      .eq('profiles.is_verified', true) // Look at the profile table for the column
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setItems(data || []);
  } catch (error) {
    console.error("Error fetching featured:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // 3. Realtime Updates
  useEffect(() => {
    if (!isConnected) return;

    const channel = supabase
      .channel('featured-listing-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listings', filter: 'is_featured=eq.true' },
        (payload) => {
          setItems((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConnected]);

  // 4. Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchFeatured(false);
    }, [isConnected])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeatured(false);
  }, [isConnected]);

  // 5. Client-side filtering logic
  useEffect(() => {
    let result = [...items]; 

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "All") {
      result = result.filter(item => {
        const itemCat = item.category?.toLowerCase().trim();
        const selectedCat = selectedCategory.toLowerCase().trim();
        return itemCat === selectedCat;
      });
    }

    setFilteredItems(result);
  }, [searchQuery, selectedCategory, items]);

  // --- OFFLINE BLOCKER (Matches RoommateFeed style) ---
  if (!isConnected && items.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't load the latest featured deals without a connection. Please check your internet.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary w-64 py-4 rounded-[24px] items-center shadow-md active:opacity-70"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F9F9F9]">
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="bg-white"
      >
        <View className="px-4 py-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ChevronLeft size={28} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-gray-900">Featured Items</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 py-2 bg-white border-b border-gray-100">
        <View className="bg-gray-100 rounded-2xl px-4 py-2 flex-row items-center">
          <Search size={18} color="#6b7280" />
          <TextInput
            placeholder="Search deals..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-sm py-1"
          />
          <View className="h-4 w-[1px] bg-gray-300 mx-2" />
          <MapPin size={18} color="#16a34a" />
        </View>
      </View>
       <BannerAdComponent containerClass="mb-2 bg-gray-50" />

      {/* Categories */}
      <View className="py-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`mr-3 px-6 py-2.5 rounded-full border ${
                selectedCategory === cat ? 'bg-primary border-primary' : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`font-bold text-xs capitalize ${selectedCategory === cat ? 'text-white' : 'text-gray-500'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <ActivityIndicator size="large" color="#005d14" className="mt-20" />
      ) : (
        <FlatList
          data={filteredItems}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#005d14" 
            />
          }
          renderItem={({ item }) => (
            <View style={{ flex: 0.5, padding: 6 }}>
              <ListingCard item={item} variant="sponsored" userId={userId || ""} />
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center mt-20 px-10">
              <Ionicons name="filter-outline" size={60} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-center">
                No sponsored items found in "{selectedCategory}".
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}