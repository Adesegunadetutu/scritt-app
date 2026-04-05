import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  FlatList, StatusBar, Platform, ActivityIndicator, RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { debounce } from 'lodash';
import { Unplug } from 'lucide-react-native'; // 1. Using a reliable "offline" icon
import { useNetworkObserver } from '@/hooks/useNetworkObserver';

const CATEGORIES = [
  "All", "Hairdresser", "Plumber", "Fashion Designer", "Chef", 
  "Cleaner", "Mechanic", "Furniture", "Cake and Pasteries", 
  "Adire", "Printing", "Graphic Designer", "Web Designer", "Others"
];

export default function ServicesScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  const [selectedCat, setSelectedCat] = useState("All");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const SERVICE_BUCKET_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service_portfolios`;

  // --- FETCH LOGIC ---
  const fetchServices = async (showLoading = true, text = searchQuery) => {
    if (!isConnected) return;
    try {
      if (showLoading) setLoading(true);
      let query = supabase
        .from('services')
        .select(`*, profiles:profiles!fk_service_owner ( avatar_url )`);

      // Filter by Category
      if (selectedCat !== "All") {
        query = query.eq('category', selectedCat);
      }

      // Filter by Search Text (Modern Practice: Search multiple columns)
    if (text) {
  // Use category::text inside the filter string
  query = query.or(`business_name.ilike.%${text}%,description.ilike.%${text}%`);
}
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- DEBOUNCE SEARCH ---
  // This prevents calling Supabase 5 times if someone types "Plumber" quickly.
  const debouncedSearch = useCallback(
    debounce((text) => fetchServices(false, text), 400),
    [selectedCat, isConnected]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // 1. REFRESH ON FOCUS: Ensures data is fresh when navigating back from "Add Service"
  useFocusEffect(
    useCallback(() => {
      fetchServices(false); // Fetch without the giant loading spinner for a smoother feel
    }, [selectedCat, isConnected])
  );

  // 2. REALTIME: Listens for changes while the user is actively on this screen
  useEffect(() => {
    if (!isConnected) return;
    const channel = supabase
      .channel('services-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'services' },
        (payload) => {
          const newService = payload.new;
          // Logic: Only add to UI if it matches the current category filter
          if (selectedCat === "All" || newService.category === selectedCat) {
            setServices((current) => [newService, ...current]);
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
    fetchServices();
  }, [selectedCat, isConnected]);

  // --- OFFLINE RENDER ---
  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <Unplug size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          Service providers cannot be reached right now. Please check your internet connection and try again.
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
    const serviceImage = (item.images && item.images.length > 0)
      ? `${SERVICE_BUCKET_URL}/${item.images[0]}`
      : (item.profiles?.avatar_url || 'https://via.placeholder.com/150?text=No+Image');

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => router.push(`/services/${item.id}`)}
        className="bg-white rounded-[24px] mb-4 p-4 flex-row items-center shadow-sm border border-gray-100"
      >
        <View className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden">
          <Image
            source={{ uri: serviceImage }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
          />
        </View>

        <View className="flex-1 ml-4">
          <View className="flex-row justify-between items-start">
            <Text className="text-gray-900 font-bold text-base flex-1" numberOfLines={1}>
              {item.business_name}
            </Text>
            <View className="bg-primary px-2 py-0.5 rounded-md ml-2">
               <Text className="text-[8px] font-bold text-white uppercase">{item.category}</Text>
            </View>
          </View>

          <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
            {item.description}
          </Text>
          
          <View className="flex-row items-center mt-3">
            <Ionicons name="location" size={12} color="#ff0000" />
            <Text className="text-gray-400 text-[10px] ml-1 flex-1" numberOfLines={1}>
              {item.location_address || 'Area not specified'}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
        
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
              <Ionicons name="arrow-back" size={26} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-800">Services</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/add-service')}
            className="bg-primary p-1 rounded-full shadow-sm"
          >
            <Ionicons name="add" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* --- ACTUAL SEARCH BAR --- */}
        <View className="px-6 mb-6">
          <View className="w-full h-14 bg-neutral-100 rounded-2xl flex-row items-center px-4 border border-card-border">
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              placeholder="Search for a service..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearchChange}
              className="ml-2 flex-1 text-app-text font-medium"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange("")}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Categories */}
        <View className="px-6 mb-8 flex-row items-center">
          <TouchableOpacity className="bg-gray-200 p-3 rounded-xl mr-5">
            <Ionicons name="options-outline" size={24} color="black" />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedCat(cat)}
                className={`px-5 py-3 rounded-xl mr-3 ${
                  selectedCat === cat ? 'bg-secondary' : 'bg-gray-200'
                }`}
              >
                <Text className={`font-bold text-xs ${
                  selectedCat === cat ? 'text-white' : 'text-gray-800'
                }`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#16a34a" className="mt-20" />
        ) : (
          <FlatList
            data={services}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
            }
            ListEmptyComponent={
              <View className="mt-20 items-center">
                <Ionicons name="construct-outline" size={48} color="#ccc" />
                <Text className="text-gray-400 font-medium mt-2">No service providers found</Text>
              </View>
            }
          />
        )}
      
    </SafeAreaView>
  );
}