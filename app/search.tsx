import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar 
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { FlashList } from '@shopify/flash-list';
import ListingCard from '@/components/ListingCard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSupabaseImage } from '@/utils/getSupabaseImage';

const TRENDING = ['iPhone', 'Hostel', 'Lab Coat', 'Calculus', 'Laptops', 'Fans'];
const ACCOMMODATION_TRENDING = ['Hostel', 'Self-Contained', 'Flat', 'Abeokuta', 'Camp', 'Oshiele'];

export default function Search() {
  const router = useRouter();
  const { filter } = useLocalSearchParams(); 
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- SEARCH LOGIC ---
  const handleSearch = async (text: string) => {
  if (text.trim().length < 2) {
    setResults([]);
    return;
  }

  setLoading(true);
  const searchStr = `%${text.trim()}%`;

  try {
    // We just select '*' now because is_verified is part of the view!
    let query = supabase
      .from('universal_search')
      .select('*'); 

    query = query.or(`title.ilike.${searchStr},location.ilike.${searchStr},description.ilike.${searchStr}`);

    if (filter === 'accommodation') {
      query = query.eq('origin_table', 'accommodation');
    }

    const { data, error } = await query.limit(25);

    if (error) throw error;
    setResults(data || []);
  } catch (err) {
    console.error("Search failed:", err);
  } finally {
    setLoading(false);
  }
};
  // --- DEBOUNCE EFFECT ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeTrending = filter === 'accommodation' ? ACCOMMODATION_TRENDING : TRENDING;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View className="px-4 mb-6 mt-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-3xl font-black text-gray-900">
            {filter === 'accommodation' ? 'Find a Home' : 'Search'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={15}>
            <Text className="text-[#16a34a] font-bold text-base">Cancel</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-1 border border-gray-50">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput 
            placeholder={filter === 'accommodation' ? "Search area, hostel name..." : "Search listings..."}
            className="flex-1 py-4 ml-2 text-lg text-gray-800"
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
            placeholderTextColor="#9ca3af"
          />
          {loading && <ActivityIndicator size="small" color="#16a34a" className="ml-2" />}
        </View>
      </View>

      {searchQuery.length > 0 ? (
        <View className="flex-1 px-2">
          {results.length === 0 && !loading ? (
            <View className="flex-1 items-center justify-center pb-40">
              <View className="bg-gray-50 p-6 rounded-full mb-4">
                <Ionicons name="search-outline" size={60} color="#d1d5db" />
              </View>
              <Text className="text-gray-400 font-semibold text-lg">No results for "{searchQuery}"</Text>
              <Text className="text-gray-300 text-sm mt-1">Try searching a different area</Text>
            </View>
          ) : (
            <FlashList
              data={results}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item }) => (
                <View style={{ padding: 6 }}>
                  <ListingCard item={item} />
                </View>
              )}
              numColumns={2}
           
              contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 10 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">
            Trending Searches
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {activeTrending.map((item) => (
              <TouchableOpacity 
                key={item} 
                onPress={() => setSearchQuery(item)}
                className="bg-white border border-gray-100 px-5 py-3 rounded-2xl shadow-sm"
              >
                <Text className="text-gray-700 font-bold text-[13px]">{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mt-10 bg-[#f0fdf4] p-6 rounded-[32px] border border-[#dcfce7]">
            <View className="bg-white w-12 h-12 rounded-2xl items-center justify-center mb-4 shadow-sm">
              <Ionicons name={filter === 'accommodation' ? "home" : "flash"} size={24} color="#16a34a" />
            </View>
            <Text className="text-[#14532d] font-black text-xl mb-1">
              {filter === 'accommodation' ? 'Looking for a Hostel?' : 'Campus Marketplace'}
            </Text>
            <Text className="text-[#166534] opacity-80 mb-6 leading-5">
              Search by location (e.g. "Camp") to find the best deals close to you.
            </Text>
            <TouchableOpacity 
               className="bg-[#16a34a] py-4 rounded-2xl items-center shadow-md shadow-green-200"
               onPress={() => setSearchQuery(filter === 'accommodation' ? 'Camp' : 'Laptops')}
            >
              <Text className="text-white font-bold">Quick Search</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}