import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StatusBar, Platform, 
  TextInput, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { Search, MapPin, WifiOff, ChevronLeft, SlidersHorizontal } from 'lucide-react-native';

// Internal Imports
import { useListingsStore } from '@/stores/useListingsStore';
import { useNetworkObserver } from '@/hooks/useNetworkObserver';
import ListingCard from '@/components/ListingCard';
import BannerAdComponent from '@/components/BannerAdComponent';
import { calculateDistance } from '@/utils/geo'; 

const CATEGORIES = ["All", "household", "electronics", "fashion", "services", "furniture", "gadgets", "food", "books"];

const DISTANCE_OPTIONS = [
  { label: "All", value: null },
  { label: "1km", value: 1 },
  { label: "5km", value: 5 },
  { label: "10km", value: 10 },
  { label: "25km+", value: 25 },
];

export default function RecentListingsScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  
  // Store Data
  const { listings, loading, fetchListings } = useListingsStore();

  // Local UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  
  // Distance Filter State
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);

  // NOTE: Replace these with your actual user location logic (e.g., from a store or hook)
  const userLat = 6.465427; 
  const userLng = 3.406448;

  // 1. Sync & Filter Logic
  useEffect(() => {
    let result = [...listings]; 

    // Filter by Search Query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      );
    }

    // Filter by Category
    if (selectedCategory !== "All") {
      result = result.filter(item => {
        const itemCat = item.category?.toLowerCase().trim();
        const selectedCat = selectedCategory.toLowerCase().trim();
        return itemCat === selectedCat;
      });
    }

    // Filter by Distance
    if (selectedDistance !== null) {
      result = result.filter(item => {
        // Use your geo util to get distance string
        const distStr = calculateDistance(userLat, userLng, item.lat, item.lng);
        
        // Handle "Under 1km away" logic
        if (distStr.includes("Under 1km")) return true;
        
        // Parse numeric value from string (e.g., "1.5km away" -> 1.5)
        const numericDist = parseFloat(distStr.replace(/[^\d.]/g, ''));
        return numericDist <= selectedDistance;
      });
    }

    setFilteredItems(result);
  }, [searchQuery, selectedCategory, selectedDistance, listings]);

  // 2. Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, []);

  // 3. Offline Blocker
  if (!isConnected && listings.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <div className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </div>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          Check your internet to see the latest fresh finds.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-[#005d14] w-64 py-4 rounded-[24px] items-center shadow-md"
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
      
      {/* --- HEADER --- */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="bg-white"
      >
        <View className="px-4 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <ChevronLeft size={28} color="#1f2937" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-black text-gray-900">Recent Listings</Text>
              <Text className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Fresh finds for you</Text>
            </View>
          </View>

          {/* Filter Trigger Button 
          <TouchableOpacity 
            onPress={() => setShowDistanceFilter(!showDistanceFilter)}
            className={`p-2.5 rounded-2xl ${selectedDistance ? 'bg-primary' : 'bg-gray-100'}`}
          >
            <SlidersHorizontal size={20} color={selectedDistance ? "#FFFFFF" : "#4b5563"} />
          </TouchableOpacity>*/}
        </View>
      </View>

      {/* --- DISTANCE SELECTOR (Toggleable) --- */}
      {showDistanceFilter && (
        <View className="bg-white pb-4 px-4 border-b border-gray-100">
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Search Radius</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DISTANCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => setSelectedDistance(opt.value)}
                className={`mr-2 px-5 py-2 rounded-xl border ${
                  selectedDistance === opt.value ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-bold ${selectedDistance === opt.value ? 'text-green-700' : 'text-gray-500'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View className="px-4 py-2 bg-white border-b border-gray-100">
        <View className="bg-gray-100 rounded-2xl px-4 py-2 flex-row items-center">
          <Search size={18} color="#6b7280" />
          <TextInput
            placeholder="Search recent deals..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-sm py-1"
          />
          <View className="h-4 w-[1px] bg-gray-300 mx-2" />
          <MapPin size={18} color="#16a34a" />
        </View>
      </View>

      <BannerAdComponent containerClass="bg-gray-50" />

      {/* --- CATEGORY SCROLLER --- */}
      <View className="py-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`mr-3 px-6 py-2.5 rounded-full border ${
                selectedCategory === cat ? 'bg-[#005d14] border-[#005d14]' : 'bg-white border-gray-200'
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
      {loading && filteredItems.length === 0 ? (
        <ActivityIndicator size="large" color="#005d14" className="mt-20" />
      ) : (
        <FlashList
          data={filteredItems}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 40 }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <View style={{ flex: 1, padding: 6 }}>
              <ListingCard item={item} userId={null} />
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center mt-20 px-10">
              <Ionicons name="filter-outline" size={60} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-center">
                No recent items found with these filters.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}