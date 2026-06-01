import React, { useEffect, useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Alert, 
  ActivityIndicator, SafeAreaView, StatusBar, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const BUCKET_URL = "https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/listings/";

export default function ManageListing() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListingDetails();
  }, [id]);

  const fetchListingDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setListing(data);
    } catch (err) {
      console.error("Fetch error:", err);
      Alert.alert("Error", "Could not fetch listing details");
    } finally {
      setLoading(false);
    }
  };

  const imageKey = (listing?.images && listing.images.length > 0) ? listing.images[0] : null;
  const imageUrl = imageKey 
    ? (imageKey.startsWith('http') ? imageKey : `${BUCKET_URL}${imageKey}`)
    : 'https://via.placeholder.com/400';

  const handleDelete = () => {
    Alert.alert(
      "Delete Listing",
      "This will permanently remove the item. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.from('listings').delete().eq('id', id);
            if (!error) router.replace('/profile/my-listings');
          } 
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        
        {/* Header */}
        <View className="px-4 py-3 flex-row items-center bg-white border-b border-gray-50">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-4">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Manage Listing</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Image Section */}
          <View className="px-4 mt-4">
            <View className="w-full h-72 rounded-[30px] overflow-hidden bg-gray-50 shadow-sm border border-gray-100">
              <Image 
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={300}
              />
            </View>
          </View>

          <View className="px-6 mt-6">
            {/* Title & Price */}
            <View className="mb-6">
              <Text className="text-2xl font-bold text-gray-900 leading-tight">
                {listing?.title}
              </Text>
              <Text className="text-[#16a34a] text-2xl font-black mt-1">
                ₦{listing?.price?.toLocaleString()}
              </Text>
              <View className="flex-row items-center mt-2">
                <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                <Text className="text-gray-400 text-xs font-bold ml-1 uppercase tracking-tighter">
                  Posted on {formatDate(listing?.created_at)}
                </Text>
              </View>
            </View>

            {/* Performance Insights */}
            {/* Performance Insights */}
          <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Performance</Text>
          <View className="flex-row justify-between mb-8">
            <StatCard 
              icon="eye-outline" 
              label="Views" 
              value="Coming Soon" 
              color="#3b82f6" 
            />
            <StatCard 
              icon="heart-outline" 
              label="Saves" 
              value="Coming Soon" 
              color="#ef4444" 
            />
            <StatCard 
              icon="share-social-outline" 
              label="Shares" 
              value="Coming Soon" 
              color="#16a34a" 
            />
          </View>

            {/* Description Section */}
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Item Description</Text>
            <View className="bg-gray-50 p-5 rounded-[25px] border border-gray-100 mb-8">
              <Text className="text-gray-600 leading-6 text-[14px]">
                {listing?.description || "No description provided."}
              </Text>
            </View>

            {/* Ratings Placeholder */}
            <View className="bg-white p-5 rounded-[25px] border border-gray-100 shadow-sm mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-gray-900 text-sm">Buyer Ratings</Text>
                <Ionicons name="star" size={16} color="#fbbf24" />
              </View>
              <Text className="text-gray-400 text-[11px] italic">No reviews yet for this listing.</Text>
            </View>
          </View>
        </ScrollView>

        {/* STICKY BOTTOM ACTIONS: Side by Side Edit and Delete */}
        <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-4 flex-row items-center space-x-3 pb-8">
          <TouchableOpacity 
            onPress={() => router.push(`/create-listing?editId=${id}`)}
            className="flex-1 h-14 bg-primary rounded-2xl items-center justify-center flex-row shadow-sm"
          >
            <Ionicons name="pencil" size={18} color="white" style={{marginRight: 8}} />
            <Text className="font-bold text-white text-base">Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleDelete} 
            className="w-14 h-14 bg-red-50 rounded-2xl items-center justify-center border border-red-100"
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, label, value, color }: any) => (
  <View className="bg-gray-50 flex-1 mx-1 p-4 rounded-[20px] items-center border border-gray-100">
    <View style={{ backgroundColor: color + '10' }} className="p-2 rounded-full mb-1">
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text 
      numberOfLines={1}
      adjustsFontSizeToFit // 👈 Prevents text from breaking the card layout
      className="text-sm font-black text-gray-900" // Reduced from text-lg to text-sm for better fit
    >
      {value}
    </Text>
    <Text className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{label}</Text>
  </View>
);