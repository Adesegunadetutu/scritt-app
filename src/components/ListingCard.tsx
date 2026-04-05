import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { CheckCircle2, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getSupabaseImage } from '@/utils/getSupabaseImage';
import { useFavorites } from '@/context/FavoritesContext';

interface ListingCardProps {
  item: any;
  variant?: 'default' | 'sponsored';
  userId: string | null;
  onUnfavorite?: () => void;
}

export default function ListingCard({ item, variant = 'default', userId, onUnfavorite }: ListingCardProps) {
  const router = useRouter();
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  
  // 1. GLOBAL STATE: We use the context as our "Source of Truth"
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  // 2. LOGIC: Check if this item exists in the global favorites array
  const isFavorited = favorites.includes(item.id);

  if (!item) return null;

  const isSponsored = variant === 'sponsored';

  const toggleFavorite = async (e: any) => {
    e.stopPropagation();

    if (!userId) {
      Alert.alert("Login Required", "You need to be logged in to save favorites.");
      return;
    }

    setLoadingFavorite(true);

    // We store the current state to allow for a rollback if the database fails
    const wasFavorited = isFavorited;

    try {
      if (wasFavorited) {
        // --- OPTIMISTIC UI: Remove instantly from Global State ---
        removeFavorite(item.id);

        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', item.id);

        if (error) throw error;

        // Callback for specific pages (like Favorites screen) to refresh their list
        if (onUnfavorite) onUnfavorite();

      } else {
        // --- OPTIMISTIC UI: Add instantly to Global State ---
        addFavorite(item.id);

        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: userId, listing_id: item.id }]);

        if (error) {
          // If the error is a "Conflict" (already exists), we ignore it and keep the heart red
          if (error.code !== '23505') throw error;
        }
      }
    } catch (error: any) {
      console.error("Favorite toggle error:", error.message);
      
      // ROLLBACK: If database fails, return the heart to its previous state
      if (wasFavorited) {
        addFavorite(item.id);
      } else {
        removeFavorite(item.id);
      }
      
      Alert.alert("Connection Error", "Could not update favorites. Please try again.");
    } finally {
      setLoadingFavorite(false);
    }
  };

  // --- 3. IMAGE & UI LOGIC ---
  const tableMap: { [key: string]: string } = {
    'accommodation': 'accommodations',
    'listing': 'listings',
    'service': 'services'
  };

  const rawTable = item.origin_table || 'listings';
  const targetTable = tableMap[rawTable] || rawTable;
  const path = item.thumbnail || (item.images?.[0]) || item.image_url;
  const imageUrl = getSupabaseImage(path, targetTable);
  const isVerified = !!(item.profiles?.is_verified || item.is_verified || item.verified);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      className="bg-white rounded-[24px] overflow-hidden border border-gray-100 mb-2 shadow-sm"
      onPress={() => {
        const rawTable = item.origin_table || 'listing';
        let routePath = rawTable === 'accommodation' ? `/accommodation/${item.id}` : 
                        rawTable === 'service' ? `/services/${item.id}` : `/listing/${item.id}`;
        router.push({ pathname: routePath, params: { table: rawTable } });
      }}
    >
      <View className="relative">
        <Image source={{ uri: imageUrl }} className={`w-full ${isSponsored ? 'h-48' : 'h-40'} bg-gray-100 `} resizeMode="cover" />
        
        <TouchableOpacity 
          onPress={toggleFavorite}
          disabled={loadingFavorite}
          className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-sm"
        >
          <Ionicons 
            name={isFavorited ? "heart" : "heart-outline"} 
            size={18} 
            color={isFavorited ? "#ef4444" : "#1f2937"} 
          />
        </TouchableOpacity>

        <View className="absolute top-3 left-3 bg-white/95 px-2.5 py-1.5 rounded-xl flex-row items-center shadow-sm">
          <Ionicons name="location" size={12} color="#ef4444" />
          <Text className="text-[10px] font-black ml-1 text-gray-800 uppercase tracking-tighter">
            {item.location || 'CAMP'}
          </Text>
        </View>

        {isSponsored && isVerified && (
          <View className="absolute bottom-3 right-3 bg-white rounded-full p-0.5 shadow-sm">
            <CheckCircle2 size={20} color="#16a34a" fill="white" />
          </View>
        )}
      </View>

      <View className="p-3">
        <Text className={`${isSponsored ? 'text-gray-500 text-[12px]' : 'text-gray-900 text-[14px] font-bold'} mb-1.5`} numberOfLines={1}>
          {item.title}
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-baseline">
            <Text className={`${isSponsored ? 'text-black font-black' : 'text-secondary font-black'} text-base`}>
              ₦{item.price ? item.price.toLocaleString() : '0'}
            </Text>
            {item.rent_period && <Text className="text-gray-400 text-[10px] ml-1">/{item.rent_period}</Text>}
          </View>

          <View className="flex-row items-center">
            {isVerified && (
              <View className="mr-2"> 
                <CheckCircle2 size={16} color="#16a34a" fill="#f0fdf4" />
              </View>
            )}
            {isSponsored && (
              <View className="bg-primary rounded-full p-1.5 shadow-sm">
                <ArrowRight size={14} color="white" />
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}