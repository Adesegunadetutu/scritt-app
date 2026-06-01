import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { debounce } from 'lodash';
import { WifiOff } from 'lucide-react-native';
import { useNetworkObserver } from '@/hooks/useNetworkObserver';
import BannerAdComponent from '@/components/BannerAdComponent';
import MarqueeAnnouncement from '@/components/MarqueeAnnouncement'; 
import { getSmartFeed } from '@/utils/feedLogic';

// Vehicle Categories based on condition states expected by the check constraints
const CATEGORIES = ["All", "Tokunbo", "Locally Used", "Brand New"];

export default function VehiclesScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  const [selectedCat, setSelectedCat] = useState("All");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // FETCH VEHICLES LOGIC
  const fetchVehicles = async (showLoading = true, text = searchQuery) => {
    if (!isConnected) return;
    try {
      if (showLoading) setLoading(true);
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          profiles:profiles!fk_vehicles_profile_id (
            business_name,
            full_name,
            is_verified_dealer
          )
        `)
        .eq('is_available', true);

      // Handle category filtering by mapping to database constraints
      if (selectedCat !== "All") {
        const dbCategoryValue = selectedCat.toLowerCase().replace(' ', '_');
        query = query.eq('condition', dbCategoryValue);
      }

      // SEARCH FILTER
      if (text) {
        query = query.or(`make.ilike.%${text}%,model.ilike.%${text}%,description.ilike.%${text}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      // Balancing inventory view with smart feed logic
      const smartData = getSmartFeed(data || [], 3); 
      setVehicles(smartData);
    } catch (err) {
      console.error("Fetch Vehicles Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Safe debouncing using useRef to match existing optimization parameters
  const debouncedSearchRef = useRef(
    debounce((text: string) => {
      fetchVehicles(false, text);
    }, 400)
  );

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearchRef.current(text);
  };

  // REFRESH ON SCREEN FOCUS
  useFocusEffect(
    useCallback(() => {
      fetchVehicles(false); 
    }, [selectedCat])
  );

  // REALTIME POSTGRES SUBSCRIPTION
  useEffect(() => {
    if (!isConnected) return;

    const channelId = `veh-updates-${selectedCat}-${Date.now()}`;
    const channel = supabase.channel(channelId);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vehicles' },
        (payload) => {
          const newVehicle = payload.new;
          const mappedCat = selectedCat.toLowerCase().replace(' ', '_');
          
          if (newVehicle.is_available && (selectedCat === "All" || newVehicle.condition === mappedCat)) {
            setVehicles((current) => {
              const updatedRawList = [newVehicle, ...current];
              return getSmartFeed(updatedRawList, 3);
            });
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
    fetchVehicles();
  }, [selectedCat, isConnected, searchQuery]);

  // OFFLINE RENDER SCREEN
  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't load the marketplace listings right now. Please check your data connection and try again.
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
    const mainImage = item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : null;
    const imageUrl = mainImage || 'https://via.placeholder.com/400x300?text=No+Image';
    const dealerName = item.profiles?.business_name || item.profiles?.full_name || "Dealer";

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => router.push(`/vehicles/${item.id}`)}
        className="bg-card rounded-[24px] mb-4 w-[48%] overflow-hidden shadow-sm border border-card-border"
      >
        <View className="w-full h-36 bg-gray-200 relative">
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }} 
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
          />
          
          {/* Transmission Badge */}
          <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md">
            <Text className="text-white text-[9px] font-bold capitalize">{item.transmission}</Text>
          </View>

          {item.profiles?.is_verified_dealer && (
            <View className="absolute top-2 right-2 bg-primary-surface/90 px-2 py-1 rounded-full border border-primary/10 flex-row items-center">
              <Ionicons name="checkmark-circle" size={10} color="#005d14" />
              <Text className="ml-1 text-primary text-[8px] font-black uppercase">Dealer</Text>
            </View>
          )}
        </View>

        <View className="p-3">
          <Text className="text-app-text font-black text-[13px] leading-4" numberOfLines={1}>
            {item.make} {item.model}
          </Text>
          
          <View className="flex-row items-center mt-1">
            <Text className="text-app-text-muted text-[10px] font-bold">
              {item.year_of_manufacture} • {item.mileage_km ? `${item.mileage_km.toLocaleString()} km` : '0 km'}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center gap-1 mt-2 h-4 overflow-hidden">
            {item.is_first_body && <Text className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">First Body</Text>}
            {item.is_ac_chilling && <Text className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-bold">A/C Cold</Text>}
          </View>

          <View className="mt-2 pt-1 border-t border-gray-50 flex-row justify-between items-center">
            <Text className="text-primary font-black text-sm" numberOfLines={1}>
              ₦{item.price?.toLocaleString()}
            </Text>
          </View>
          
          <Text className="text-app-text-muted text-[9px] font-semibold mt-0.5 truncate" numberOfLines={1}>
            By: {dealerName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
        
      {/* Header Section */}
      <View className="px-6 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
            <Ionicons name="arrow-back" size={26} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 ">Vehicles</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => router.push('/vehicles/add-vehicle')}
          className="bg-primary p-2 rounded-full shadow-sm"
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View className="px-6 mb-2">
        <View className="w-full h-14 bg-gray-200 rounded-2xl flex-row items-center px-4 border border-card-border">
          <Ionicons name="search-outline" size={20} color="#005d14" />
          <TextInput
            placeholder="Search brand, model variants..."
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

      {/* Anti-Fraud Notice Marquee */}
      <MarqueeAnnouncement 
        text="Disclaimer: Verify documents, inspect engine status, test drive, and verify custom clearing state before closing deals."
        duration={15000}
      />

      {/* Monetization Placeholder */}
      <BannerAdComponent containerClass="mb-2 bg-gray-50" />
        
      {/* Category Tabs Selector */}
      <View className="px-6 mb-4 flex-row items-center">
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

      {/* Premium "Become a Verified Dealer" CTA Card */}
      <View 
        //activeOpacity={0.95}
        //onPress={() => router.push('/vehicles/verify-dealer')}
        className="mx-6 mb-5 bg-white border border-[#005d14]/20 p-4 rounded-[22px] flex-row items-center justify-between"
        style={{
          elevation: 3,
          shadowColor: '#005d14',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }}
      >
        <View className="flex-row items-center flex-1 pr-3">
          <View className="bg-[#005d14] w-10 h-10 rounded-xl items-center justify-center mr-3 shadow-sm">
            <MaterialCommunityIcons name="shield-check-outline" size={22} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-black font-black text-[13px] tracking-tight mb-0.5">
              Become a Verified Dealer
            </Text>
            <Text className="text-gray-500 font-semibold text-[10px] leading-3">
              Gain exclusive visibility, trust badges, and unlock unlimited listings.
            </Text>
          </View>
        </View>
        
        <View className="bg-gray-50 border border-gray-100 w-8 h-8 rounded-full items-center justify-center">
          <Ionicons name="arrow-forward" size={16} color="#005d14" />
        </View>
      </View>

      {/* Listing Grid */}
      {loading ? (
        <View className="flex-row flex-wrap justify-between px-5">
          {[1, 2, 3, 4].map((item) => (
            <View 
              key={`skeleton-${item}`} 
              className="bg-white rounded-[24px] mb-4 w-[48%] overflow-hidden border border-gray-100 p-3 h-[230px]"
              style={{
                elevation: 1,
                shadowColor: '#AAB8C2',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
              }}
            >
              {/* Media Block Skeleton */}
              <View className="w-full h-32 bg-gray-100 rounded-[18px] mb-2.5 items-center justify-center opacity-60">
                <Ionicons name="car-outline" size={28} color="#d1d5db" />
              </View>
              {/* Text Layout Lines */}
              <View className="w-3/4 h-3 bg-gray-100 rounded-md mb-2 opacity-80" />
              <View className="w-1/2 h-2.5 bg-gray-50 rounded-md mb-3 opacity-80" />
              <View className="w-2/3 h-4 bg-gray-100/80 rounded-lg opacity-70" />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#005d14" />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Ionicons name="car-outline" size={48} color="#ccc" />
              <Text className="text-gray-400 font-medium mt-2">No vehicles found matching criteria</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}