import React, { useEffect, useState } from 'react';
import { 
  View, Text, Image, ScrollView, TouchableOpacity, SafeAreaView, 
  ActivityIndicator, Alert, Dimensions, Platform, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, MapPin, MessageCircle, Share2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, ClipPath, Image as SvgImage } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

export default function PublicProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const primaryColor = "#166534"; 
  const secondaryColor = "#f97316"; 

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        const { data: listingData } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (profileData) setProfile(profileData);
        if (listingData) setListings(listingData || []);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, [id]);

  const handleMessageSeller = () => {
    if (!currentUserId) {
      Alert.alert("Login Required", "Please log in to message sellers.");
      return;
    }
    if (currentUserId === id) return;

    const participants = [currentUserId, id].sort();
    const uniqueConvId = participants.join('_');

    router.push({
      pathname: `/chat/${uniqueConvId}`,
      params: { 
        sellerName: profile?.full_name,
        sellerAvatar: profile?.avatar_url 
      }
    });
  };

  if (loading) return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color={primaryColor} />
    </View>
  );

  // --- SVG Layout Calculations ---
  const avatarSize = 100; 
  const strokeWidth = 4;
  const center = avatarSize / 2;
  const radius = (avatarSize - strokeWidth) / 2;
  // The image should be smaller than the stroke circle to sit inside it
  const imageSize = avatarSize - (strokeWidth * 2); 

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Main Container with Status Bar Padding */}
      <View 
        style={{ 
          flex: 1, 
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
        }}
      >
        {/* Header */}
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-50">
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-50 rounded-full">
            <ChevronLeft size={22} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-black text-gray-800 tracking-tight">Seller Profile</Text>
          <TouchableOpacity onPress={() => router.push('/messages')} className="p-2 bg-gray-50 rounded-full active:bg-gray-100">
            <MessageCircle size={20} color="black" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View className="items-center mt-8 px-4">
            
            {/* Avatar with Gradient Stroke */}
            <View style={{ width: avatarSize, height: avatarSize }}>
              <Svg width={avatarSize} height={avatarSize}>
                <Defs>
                  <SvgLinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={primaryColor} />
                    <Stop offset="100%" stopColor={secondaryColor} />
                  </SvgLinearGradient>
                  
                  <ClipPath id="clip">
                    {/* The clip radius must match the image area */}
                    <Circle cx={center} cy={center} r={imageSize / 2} />
                  </ClipPath>
                </Defs>
                
                {/* Background/Stroke Circle */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="url(#grad)"
                  strokeWidth={strokeWidth}
                  fill="white"
                />
                
                {/* Image correctly offset to center inside the stroke */}
                <SvgImage
                  href={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
                  x={strokeWidth}
                  y={strokeWidth}
                  width={imageSize}
                  height={imageSize}
                  clipPath="url(#clip)"
                  preserveAspectRatio="xMidYMid slice"
                />
              </Svg>
            </View>

            <Text className="text-2xl font-black mt-4 text-gray-900 tracking-tight">{profile?.full_name}</Text>
            
            <View className="flex-row items-center mt-1">
              <MapPin size={14} color="#6b7280" />
              <Text className="text-gray-500 ml-1 font-bold text-xs uppercase tracking-tighter">Funaab, Abeokuta</Text>
            </View>

            {currentUserId !== id && (
              <TouchableOpacity 
                className="mt-6 px-10 py-4 bg-primary rounded-full flex-row items-center shadow-md active:scale-95"
                
                onPress={handleMessageSeller}
              >
                <MessageCircle size={18} color="white" />
                <Text className="text-white font-black ml-2 text-base">Message Seller</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Row */}
          <View className="flex-row justify-around mt-10 border-y border-gray-50 py-6 bg-gray-50/30">
            <View className="items-center">
              <Text className="text-xl font-black text-gray-900">{listings.length}</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Items</Text>
            </View>
            <View className="items-center border-x border-gray-100 px-10">
              <Text className="text-xl font-black text-gray-900">0.0</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Rating</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-black text-gray-900">0</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Reviews</Text>
            </View>
          </View>

          {/* Listings Grid */}
          <View className="px-4 mt-8 pb-10">
            <Text className="text-xl font-black text-gray-900 mb-5 tracking-tight">Active Listings</Text>
            
            <View className="flex-row flex-wrap justify-between">
              {listings.map((item, index) => (
                <TouchableOpacity 
                  key={`${item.id}-${index}`} 
                  className="w-[48%] mb-5 bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm"
                  onPress={() => router.push(`/listing/${item.id}`)}
                >
                  <Image 
                    source={{ uri: item.images?.[0] || item.thumbnail || 'https://via.placeholder.com/150' }} 
                    className="w-full h-44 bg-gray-100"
                    resizeMode="cover"
                  />
                  <View className="p-3">
                    <Text className="font-bold text-gray-800 text-[11px]" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-[#166534] font-black text-sm mt-1" style={{ color: primaryColor }}>₦{item.price?.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}