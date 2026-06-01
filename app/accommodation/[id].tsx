import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Platform, FlatList, Modal, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');
const BUCKET_URL = "https://xaevvkjdcmcioswzalyr.supabase.co/storage/v1/object/public/accommodation_listings/";

export default function AccommodationDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Modal States
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    if (id) fetchItemDetails();
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accommodations')
        .select(` *, profiles:user_id (is_verified) `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setItem(data);
    } catch (err: any) {
      console.error("Error fetching details:", err.message);
      Alert.alert("Error", "Could not load property details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please login to message the agent", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push('/login') }
      ]);
      return;
    }

    if (user.id === item.user_id) {
      Alert.alert("Notice", "You cannot message yourself.");
      return;
    }

    try {
      setIsStartingChat(true);
      const participants = [user.id, item.user_id].sort();
      const conversationId = participants.join('_');

      router.push({
        pathname: `/chat/${conversationId}`,
        params: { 
          prefillTitle: item.title,
          prefillImage: `${BUCKET_URL}${item.images?.[0]}`,
          topic: item.title
        }
      });
    } catch (error: any) {
      Alert.alert("Error", "Could not open chat.");
    } finally {
      setIsStartingChat(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#228B22" />
      </View>
    );
  }

  if (!item) return null;

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
          <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header Section */}
            <View className="px-6 py-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
                  <Ionicons name="arrow-back" size={26} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800 ">Accommodation Details</Text>
              </View>
              
            </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        
        {/* 2. MAIN IMAGE CARD */}
        {/* 2. MAIN IMAGE (Hero Section) */}
<View className="px-4 mt-2"> 
  <TouchableOpacity 
    activeOpacity={0.9}
    onPress={() => {
      setSelectedImage(`${BUCKET_URL}${item.images?.[0]}`);
      setIsPreviewVisible(true);
    }}
    className="w-full rounded-[32px] overflow-hidden bg-gray-100 shadow-sm border border-gray-100"
    style={{ aspectRatio: 1.2 }} // Slightly taller than wide to show more room detail
  >
    <Image
      source={{ uri: `${BUCKET_URL}${item.images?.[0]}` }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      transition={300}
    />
    {/* Image Count Badge */}
    <View className="absolute bottom-4 right-4 bg-black/50 px-3 py-1 rounded-full">
      <Text className="text-white text-[10px] font-bold">1 / {item.images?.length}</Text>
    </View>
  </TouchableOpacity>
</View>

        <View className="px-6 py-6">
          {/* Title & Location */}
          <Text className="text-xl font-medium text-gray-900 tracking-tight">{item.title}</Text>
          <View className="flex-row items-center mt-2 bg-gray-50 self-start px-2 py-1 rounded-lg">
            <Ionicons name="location" size={14} color="#E11D48" />
            <Text className="text-gray-500 text-xs font-medium ml-1">{item.location || "Location not set"}</Text>
          </View>

          {/* Feature Icons */}
          {/* Feature Icons */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-8">
                  <FeatureIcon icon="home-outline" label={item.category} />
                  
                  {/* Security Features */}
                  {item.is_fenced && (
                    <FeatureIcon icon="fence" label="Fenced" isMCI /> 
                  )}
                  {item.is_gated && (
                    <FeatureIcon icon="shield-checkmark-outline" label="Gated" />
                  )}

                  <FeatureIcon icon="water-outline" label={item.water_available ? "Water Inc." : "No Water"} />
                  <FeatureIcon icon="flash-outline" label={item.electricity} />
                  <FeatureIcon icon="people-outline" label={`${item.number_of_tenants} Tenants`} />
                  
                  {/* Furniture Logic */}
                  {item.furniture?.includes("Wardrobe") && (
                    <FeatureIcon icon="wardrobe-outline" label="Wardrobe" isMCI />
                  )}
                  {item.furniture?.includes("Kitchen Cabinets") && (
                    <FeatureIcon icon="countertop-outline" label="Cabinets" isMCI />
                  )}
                </ScrollView>

          {/* Safety Disclaimer & Owner Verification Call-to-Action */}
<View className="mt-6">
  {/* IF THE VIEWER IS THE OWNER AND UNVERIFIED */}
  {user?.id === item.user_id && !item.profiles?.is_verified ? (
    <TouchableOpacity 
      onPress={() => {
        const phoneNumber = '234XXXXXXXXXX'; // Your Admin WhatsApp
        const message = `Hello Admin, I want to verify my accommodation listing: ${item.title}. My User ID: ${user?.id}`;
        const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        
        Linking.canOpenURL(url).then(supported => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
          }
        });
      }}
      activeOpacity={0.8}
      className="bg-red-50 p-4 rounded-2xl border border-red-100 flex-row items-center shadow-sm"
    >
      <View className="bg-red-100 p-2 rounded-full">
        <Ionicons name="shield-outline" size={20} color="#dc2626" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-red-900 font-bold text-sm">Verify your property</Text>
        <Text className="text-red-800 text-xs mt-0.5">Contact admin to build trust and get more booking requests.</Text>
      </View>
      <View className="bg-green-500 p-1.5 rounded-full">
        <Ionicons name="logo-whatsapp" size={14} color="white" />
      </View>
    </TouchableOpacity>
  ) : (
    /* IF THE VIEWER IS A BUYER AND OWNER IS UNVERIFIED */
    !item.profiles?.is_verified && (
      <View className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex-row items-start">
        <Ionicons name="warning" size={20} color="#f97316" />
        <View className="ml-3 flex-1">
          <Text className="text-orange-900 font-bold text-sm uppercase">Safety First</Text>
          <Text className="text-orange-800 text-xs leading-4 mt-1">
            This listing is not verified. Never pay any fee before meeting in person.
          </Text>
        </View>
      </View>
    )
  )}
</View>

          {/* Description */}
          <View className="mt-8">
            <Text className="text-lg font-bold text-gray-900 mb-2">Description</Text>
            <Text className="text-gray-500 leading-6 text-[15px]">{item.description}</Text>
          </View>

          {/* Photo Gallery Slide */}
          {/* Photo Gallery (Smaller Preview) */}
<View className="mt-10">
  <View className="flex-row justify-between items-center mb-4 px-1">
    <Text className="text-lg font-black text-gray-900 tracking-tight">Property Gallery</Text>
    <Text className="text-primary font-bold text-xs">{item.images?.length} Photos</Text>
  </View>
  
  <FlatList
    data={item.images}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyExtractor={(_, index) => index.toString()}
    renderItem={({ item: img }) => (
      <TouchableOpacity 
        onPress={() => {
          setSelectedImage(`${BUCKET_URL}${img}`);
          setIsPreviewVisible(true);
        }}
        className="mr-3 shadow-sm"
      >
        <Image 
          source={{ uri: `${BUCKET_URL}${img}` }} 
          // Making these smaller and square for a "grid-like" feel in a row
          style={{ width: 120, height: 120, borderRadius: 20 }} 
          contentFit="cover" 
        />
      </TouchableOpacity>
    )}
  />
</View>
        </View>
        <View className="h-32" />
      </ScrollView>

      {/* 3. BOTTOM PRICE BAR */}
      <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-6 flex-row justify-between items-center">
        <View>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Total Price</Text>
          <View className="flex-row items-baseline">
            <Text className="text-2xl font-black text-gray-900">₦{item.price?.toLocaleString()}</Text>
            <Text className="text-gray-400 font-bold text-xs"> / {item.rent_period}</Text>
          </View>
        </View>

        {user?.id === item.user_id ? (
          <View className="bg-gray-100 px-6 py-3 rounded-2xl">
            <Text className="text-gray-500 font-bold">Your Listing</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={handleSendMessage} disabled={isStartingChat} className="bg-primary px-8 py-4 rounded-2xl shadow-lg shadow-green-200">
            {isStartingChat ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-bold text-base">Chat Agent</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* 4. IMAGE PREVIEW MODAL */}
      {/* 4. IMAGE PREVIEW MODAL */}
<Modal 
  visible={isPreviewVisible} 
  transparent={true} 
  animationType="fade" 
  onRequestClose={() => setIsPreviewVisible(false)}
>
  <View className="flex-1 bg-black/95 justify-center items-center">
    {/* Close Button */}
    <TouchableOpacity 
      onPress={() => setIsPreviewVisible(false)} 
      className="absolute top-14 right-6 z-20 bg-white/10 p-2 rounded-full"
    >
      <Ionicons name="close" size={32} color="white" />
    </TouchableOpacity>

    {/* Image Wrapper */}
    <View style={{ width: width, height: '100%' }} className="justify-center items-center">
      <Image 
        source={{ uri: selectedImage }} 
        // Using explicit width and height from Dimensions 
        // ensures the component has a physical area to render into.
        style={{ width: width, height: '85%' }} 
        // 'contain' ensures the image is never cropped and stays 
        // within the bounds regardless of device aspect ratio.
        contentFit="contain" 
        transition={200}
      />
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const FeatureIcon = ({ icon, label, isMCI = false }: any) => (
  <View className="items-center mr-6">
    <View className="bg-gray-50 border border-gray-100 w-14 h-14 rounded-2xl items-center justify-center mb-2">
      {isMCI ? <MaterialCommunityIcons name={icon} size={24} color="#228B22" /> : <Ionicons name={icon} size={22} color="#228B22" />}
    </View>
    <Text className="text-[10px] text-gray-400 font-bold text-center w-16" numberOfLines={1}>{label}</Text>
  </View>
);