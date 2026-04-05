import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import ListingCard from '@/components/ListingCard';
import { ChevronLeft, ShoppingBag, MessageCircle, WifiOff } from 'lucide-react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNetworkObserver } from '@/hooks/useNetworkObserver';
import { useCacheStore } from '@/stores/useCacheStore';

const SkeletonCard = () => (
  <View style={{ width: '48.5%' }} className="mb-4">
    <View className="w-full h-44 bg-neutral-100 rounded-[24px]" />
    <View className="mt-3 h-4 w-3/4 bg-neutral-100 rounded-md" />
    <View className="mt-2 h-3 w-1/2 bg-neutral-100 rounded-md" />
  </View>
);

export default function FavoritesScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver(); 
  const { setHasCachedData } = useCacheStore(); // Global banner control
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // --- 1. Fetch Favorites Logic ---
  const fetchFavorites = useCallback(async (userId: string) => {
    if (!isConnected) {
      setLoading(false); 
      // If we already have items in state, allow the banner to show
      setHasCachedData(favorites.length > 0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`listing_id, listings (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        const items = data.map((f: any) => f.listings).filter(Boolean);
        setFavorites(items);
        // Smart Banner: Only true if there are actually items
        setHasCachedData(items.length > 0);
      }
    } catch (e) {
      console.error('Error fetching favorites:', e);
    } finally {
      setLoading(false);
    }
  }, [isConnected, favorites.length, setHasCachedData]);

  // --- 2. Instant/Optimistic Unfavorite Logic ---
  const handleRemoveInstant = async (listingId: string) => {
    if (!isConnected) {
      Alert.alert("Offline", "You cannot remove favorites while offline.");
      return;
    }

    if (!currentUserId) {
      Alert.alert("Session Expired", "Please log in again.");
      return;
    }

    const previousFavorites = [...favorites];
    const updatedFavorites = favorites.filter(item => item.id !== listingId);
    setFavorites(updatedFavorites);
    
    // Immediately update banner: if list becomes empty, hide banner
    setHasCachedData(updatedFavorites.length > 0);

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', currentUserId)
      .eq('listing_id', listingId);

    if (error) {
      setFavorites(previousFavorites); 
      setHasCachedData(previousFavorites.length > 0);
      Alert.alert("Error", "Could not remove from favorites.");
    }
  };

  // --- 3. Focus & Auth Listener ---
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setCurrentUserId(session.user.id);
          fetchFavorites(session.user.id);
        } else {
          setLoading(false);
        }
      };

      getInitialSession();

      return () => { 
        isMounted = false; 
        // Reset banner state when leaving screen to prevent ghost banners on next page
        setHasCachedData(false);
      };
    }, [fetchFavorites, setHasCachedData])
  );

  // --- 4. OFFLINE BLOCKER ---
  // Only show if offline AND we have absolutely no cached data to display
  if (!isConnected && favorites.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't access your wishlist right now. Please check your internet connection.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary w-64 py-4 rounded-[24px] items-center self-center"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-neutral-50">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
            className="mr-3 p-2 rounded-full"
          >
            <ChevronLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-neutral-900">Favorites</Text>
        </View>
  
        <TouchableOpacity onPress={() => router.push('/messages')} className="p-2 bg-neutral-50 rounded-full relative">
          <MessageCircle size={22} color="#111827" />
          <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-white" />
        </TouchableOpacity>
      </View>

      {/* List logic */}
      {loading ? (
        <FlatList
          data={Array(6).fill({})}
          keyExtractor={(_, index) => `skeleton-${index}`}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={() => <SkeletonCard />}
        />
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id?.toString()}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }: { item: any }) => (
            <View style={{ width: '48.5%', marginBottom: 16 }}>
              <ListingCard 
                item={item} 
                userId={currentUserId || ''} 
                onUnfavorite={() => handleRemoveInstant(item.id)} 
              />
            </View>
          )}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-10">
          <View className="w-24 h-24 bg-primary-surface rounded-full items-center justify-center mb-6">
            <ShoppingBag size={40} color="#005d14" strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 text-center">Wishlist is empty</Text>
          <Text className="text-neutral-500 text-center mt-3 leading-6">
            Tap the heart on any item to save it here for later.
          </Text>
          <TouchableOpacity 
            className="mt-10 bg-primary w-full py-4 rounded-2xl shadow-xl shadow-primary/20"
            onPress={() => router.push('/')}
          >
            <Text className="text-white font-bold text-center text-lg">Browse Listings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}