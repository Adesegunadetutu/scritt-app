import React, { useEffect, useState } from 'react';
import { 
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar, Platform, Dimensions, Alert,
  Linking, FlatList
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, CloudOff, Send, Settings } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { calculateDistance } from '@/utils/geo'; 
import { Ionicons } from "@expo/vector-icons";
import { getSupabaseImage } from '@/utils/getSupabaseImage';
import { useNetworkObserver } from '@/hooks/useNetworkObserver';

const { width: screenWidth } = Dimensions.get('window');

// --- SKELETON LOADING ---
const SkeletonItem = () => (
  <View className="px-4">
    <View className="w-full h-72 rounded-[30px] bg-gray-200 animate-pulse" />
    <View className="flex-row justify-between mt-4">
      <View className="h-4 w-32 bg-gray-200 rounded" />
      <View className="h-4 w-24 bg-gray-200 rounded" />
    </View>
    <View className="h-8 w-3/4 bg-gray-200 rounded mt-6" />
    <View className="h-6 w-1/4 bg-gray-200 rounded mt-2" />
    <View className="h-20 w-full bg-gray-200 rounded mt-4" />
  </View>
);

export default function ListingDetails() {
  const { id, table } = useLocalSearchParams(); 
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  
  // --- States ---
  const [user, setUser] = useState<any>(null); 
  const [listing, setListing] = useState<any>(null);
  const [otherListings, setOtherListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [distanceText, setDistanceText] = useState<string>("Calculating...");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Table Mapping Logic
  const rawTable = (table as string) || 'listings';
  const tableMap: { [key: string]: string } = {
    'accommodation': 'accommodations',
    'listing': 'listings',
    'service': 'services'
  };
  const targetTable = tableMap[rawTable] || rawTable;

  useEffect(() => {
    if (!isConnected) return;
    async function getDetails() {
      try {
        setLoading(true);
        
        // 1. Get Auth User
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser); 
        const viewerId = authUser?.id || null;
        setCurrentUserId(viewerId);

        // 2. Determine owner field and the correct named relationship
        const ownerField = targetTable === 'services' ? 'provider_id' : 'user_id';
        
        const relationMap: { [key: string]: string } = {
          'accommodations': 'fk_accommodation_owner',
          'listings': 'fk_listing_owner',
          'services': 'fk_service_owner'
        };
        const relationName = relationMap[targetTable] || ownerField;

        // 3. Fetch Listing + Owner Profile using explicit relationship
        const { data, error } = await supabase
          .from(targetTable)
          .select(`*, profiles:${relationName} (full_name, avatar_url, lat, lng, is_verified)`)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
  // 1. Tell TypeScript to treat 'data' as a flexible object to bypass the ParserError
  const d = data as any; 

  const normalizedData = {
    ...d,
    // 2. Use 'd' for everything to avoid property access errors
    user_id: d[ownerField],
    profiles: d.profiles || d[relationName], 
    slider_images: d.images && d.images.length > 0 ? d.images : [d.thumbnail]
  };
  
  setListing(normalizedData);

          // 4. Distance Calculation
          if (viewerId === normalizedData.user_id) {
            setDistanceText("Your Listing");
          } else if (viewerId && normalizedData.profiles?.lat) {
            const { data: viewerProf } = await supabase.from('profiles').select('lat, lng').eq('id', viewerId).single();
            if (viewerProf?.lat) {
              const dist = calculateDistance(viewerProf.lat, viewerProf.lng, normalizedData.profiles.lat, normalizedData.profiles.lng);
              setDistanceText(dist);
            }
          }

          // 5. Fetch Other Items from Seller using explicit relationship
          const { data: otherData } = await supabase
            .from(targetTable)
            .select(`*, profiles:${relationName} (is_verified)`)
            .eq(ownerField, normalizedData.user_id)
            .neq('id', id)
            .limit(6);
          
          setOtherListings(otherData || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    getDetails();
  }, [id, targetTable, isConnected]);

  // --- OFFLINE RENDER ---
  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <CloudOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't load the listing details right now. Please check your internet and try again.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary px-12 py-4 rounded-[24px] self-center shadow-md"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sellerName = listing?.profiles?.full_name || "Unknown Seller";
  const sellerAvatar = listing?.profiles?.avatar_url || 'https://via.placeholder.com/40';
  const isOwner = user?.id === listing?.user_id;

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUserId || !listing) return;
    setSending(true);
    try {
      const participants = [currentUserId, listing.user_id].sort();
      const uniqueConvId = participants.join('_');
      router.push({
        pathname: `/chat/${uniqueConvId}`,
        params: { 
          topic: listing.title, 
          listingId: listing.id, 
          prefillTitle: listing.title,
          prefillImage: listing.slider_images[0],
          initialMessage: message.trim()
        }
      });
      setMessage("");
    } catch (err) {
      Alert.alert("Error", "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const renderImageItem = ({ item }: { item: string }) => (
    <View style={{ width: screenWidth - 32, marginRight: 16}}>
      <Image
        source={{ uri: getSupabaseImage(item, targetTable) }}
        style={{ width: '100%', height: 250 }}
        className="rounded-[24px]"
        resizeMode="cover"
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Navbar */}
        <View className="px-4 py-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full ">
            <ChevronLeft size={22} color="black" />
          </TouchableOpacity>

          {!loading && (
            <TouchableOpacity 
              onPress={() => router.push(`/profile/${listing?.user_id}`)} 
              className="flex-row items-center bg-accent py-1.5 px-3 rounded-full shadow-sm border border-gray-100"
            >
              <Text className="text-[13px] font-bold text-gray-800 mr-2">Posted by:  {sellerName}</Text>
              <View className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden">
                <Image source={{ uri: sellerAvatar }} className="w-full h-full" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {loading ? <SkeletonItem /> : (
            <View className="px-4 mt-2">
              
              {/* IMAGE SLIDER */}
              <View>
                <FlatList
                  data={listing?.slider_images || []}
                  renderItem={renderImageItem}
                  horizontal
                  snapToInterval={screenWidth - 16} 
                  snapToAlignment="start" 
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 16 }} 
                  onScroll={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    setActiveImageIndex(Math.round(offset / (screenWidth - 32)));
                  }}
                  keyExtractor={(_, index) => index.toString()}
                />
                
                {listing?.slider_images?.length > 1 && (
                  <View className="flex-row justify-center mt-4">
                    {listing.slider_images.map((_: any, i: number) => (
                      <View 
                        key={i} 
                        className={`h-1.5 rounded-full mx-1 transition-all ${activeImageIndex === i ? 'w-6 bg-[#166534]' : 'w-2 bg-gray-300'}`} 
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* INFO SECTION */}
              <View className="flex-row justify-between mt-6 items-center">
                <View className="flex-row items-center px-3 py-1 bg-accent rounded-full border border-gray-100">
                  <Ionicons name="location-sharp" size={14} color="#ef4444" />
                  <Text className="text-gray-500 text-[11px] font-bold ml-1">{listing?.location || 'Abeokuta'}</Text>
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 text-[10px] font-black uppercase tracking-tighter">{distanceText}</Text>
                </View>
              </View>

              <View className="mt-5">
                <View className="flex-row justify-between items-start">
                  <Text className="text-base font-black text-gray-900 flex-1 mr-4 tracking-tight">{listing?.title}</Text>
                  <View className="bg-card-honey px-2 py-1 rounded-lg">
                      <Text className="text-secondary font-bold text-[10px] uppercase">{listing?.category}</Text>
                  </View>
                </View>
                <Text className="text-2xl font-black text-primary mt-1">₦{listing?.price?.toLocaleString()}</Text>
                
                <Text className="text-gray-500 mt-6 leading-6 text-[14px]">
                  {listing?.description || "No description provided."}
                </Text>
              </View>

              {/* SAFETY CARD */}
              {!isOwner && !listing.profiles?.is_verified && (
                <View className="bg-amber-50 mt-8 p-4 rounded-[24px] border border-amber-100 flex-row items-center">
                  <View className="bg-amber-500/10 p-2 rounded-full">
                    <Ionicons name="shield-checkmark" size={18} color="#d97706" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-amber-800 font-bold text-xs">Safe Shopping Tip</Text>
                    <Text className="text-amber-700 text-[10px] mt-0.5">Meet in public & verify items before payment.</Text>
                  </View>
                </View>
              )}

              {/* ACTION AREA */}
              {!isOwner ? (
                <View className="bg-white border border-gray-200 rounded-[24px] flex-row items-center mt-8 px-4 py-1.5 shadow-sm">
                  <TextInput 
                    placeholder={`Reply to ${sellerName.split(' ')[0]}...`} 
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 text-gray-800 h-12 font-medium"
                    value={message}
                    onChangeText={setMessage}
                    editable={!sending}
                  />
                  <TouchableOpacity 
                    onPress={handleSendMessage} 
                    disabled={sending || !message.trim()}
                    className={`p-2 rounded-full ${message.trim() ? 'bg-primary' : 'bg-gray-100'}`}
                  >
                    <Send size={18} color={message.trim() ? "white" : "#9ca3af"} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => router.push(`/profile/my-listings`)}
                  className="bg-primary rounded-[24px] p-4 flex-row items-center mt-8 justify-center shadow-lg"
                >
                  <Settings size={20} color="white" />
                  <Text className="text-white font-bold ml-3 text-lg">Manage Listing</Text>
                </TouchableOpacity>
              )}

              {/* MORE FROM SELLER */}
              <View className="mt-12 mb-10">
                <Text className="text-xl font-black text-gray-900 mb-4 tracking-tight">More from this seller</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                  {otherListings.map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      className="mr-4 w-44"
                      onPress={() => router.push({ pathname: `/listing/${item.id}`, params: { table } })}
                    >
                      <Image 
                        source={{ uri: getSupabaseImage(item.thumbnail || item.images?.[0], targetTable) }} 
                        className="w-44 h-44 rounded-[28px] bg-gray-200"
                      />
                      <Text className="text-gray-900 font-bold mt-2 px-1" numberOfLines={1}>{item.title}</Text>
                      <Text className="text-[#166534] font-black px-1">₦{item.price?.toLocaleString()}</Text>
                    </TouchableOpacity>
                  ))}
                  {otherListings.length === 0 && (
                    <Text className="text-gray-400 italic">No other listings yet.</Text>
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
  );
}