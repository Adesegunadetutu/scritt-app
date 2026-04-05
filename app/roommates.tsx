import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, Image, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { WifiOff } from 'lucide-react-native'; // Standardized offline icon
import { useNetworkObserver } from '@/hooks/useNetworkObserver';

export default function RoommateFeed() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isConnected } = useNetworkObserver();
  const router = useRouter();

  const fetchRequests = async (showLoading = true) => {
    if (!isConnected) return;
    
    try {
      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from('roommate_requests')
        .select(`
          *,
          profiles (
            avatar_url,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchRequests(false);
    }, [isConnected])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests(false);
  }, [isConnected]);

  // 1. Add Realtime Listener
useEffect(() => {
  if (!isConnected) return;

  const channel = supabase
    .channel('roommate-feed-updates')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'roommate_requests' },
      async (payload) => {
        const newListing = payload.new;

        // Since the payload only contains the raw 'roommate_requests' row,
        // we fetch the profile data (avatar/name) to match our UI needs.
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', newListing.user_id)
          .single();

        const listingWithProfile = {
          ...newListing,
          profiles: profileData
        };

        setRequests((current) => [listingWithProfile, ...current]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [isConnected]);

  // --- OFFLINE BLOCKER ---
  if (!isConnected) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't find roommates without a connection. Please check your internet and try again.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary w-64 py-4 rounded-[24px] items-center self-center shadow-md active:opacity-70"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => { 
    const isOwner = item.request_type === 'has_room';
    const avatarUrl = item.profiles?.avatar_url;

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/roommates/${item.id}`)}
        className="bg-card rounded-[28px] mb-4 w-[48%] border border-card-border shadow-sm overflow-hidden"
      >
        <View className="bg-gray-100 h-40">
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Text className="text-app-text-muted text-[10px] font-medium">No Image</Text>
            </View>
          )}
        </View>

        <View className="p-3">
          <Text className="font-black text-[11px] text-app-text leading-4" numberOfLines={1}>
            {item.title}
          </Text>
          
          <Text className="text-[9px] text-primary font-medium mt-0.5 mb-3">
            {isOwner ? "Has a room" : "Needs a room"}
          </Text>

          <View className="space-y-1">
            <View className="flex-row justify-between items-center">
              <Text className="text-[9px] text-app-text-muted">
                {isOwner ? "Shared Rent:" : "Preferred Loc:"}
              </Text>
              <Text className="text-[9px] font-black text-app-text" numberOfLines={1}>
                {isOwner ? `₦${item.price?.toLocaleString()}` : (item.location || "Camp")}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-[9px] text-app-text-muted">
                {isOwner ? "Move in Date:" : "Budget:"}
              </Text>
              <Text className="text-[9px] font-bold text-app-text-muted" numberOfLines={1}>
                {isOwner 
                  ? (item.move_in_date || "TBD") 
                  : `₦${item.price?.toLocaleString()}/year`
                }
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#F9F9F9] px-5 pt-14">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header Area */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">Find a Roommate</Text>
        <TouchableOpacity 
          onPress={() => router.push('/roommates/choice')}
          className="bg-primary w-8 h-8 rounded-full items-center justify-center"
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <Text className="text-gray-500 text-sm font-medium mb-4">Find Your Next Roommate</Text>

      {/* Search Bar */}
      <View className="bg-gray-200/60 flex-row items-center px-4 py-3 rounded-2xl mb-8">
        <Ionicons name="search" size={18} color="#666" />
        <TextInput 
          placeholder="Search" 
          placeholderTextColor="#999"
          className="ml-2 flex-1 text-gray-800" 
        />
        <TouchableOpacity>
           <Ionicons name="close" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Section Title */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="font-black text-gray-900 text-base">Latest Roommates Listings</Text>
        <TouchableOpacity>
          <Ionicons name="arrow-forward" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#005d14" className="mt-20" />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#005d14" 
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text className="text-gray-400 font-medium mt-2">No listings yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}