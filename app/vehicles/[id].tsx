import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Modal, Linking, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

export default function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Image Preview Modal States
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  // --- Reporting System States ---
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportingSubmit, setReportingSubmit] = useState(false);

  const reportCategories = [
    { label: "Fraudulent Dealer / Fake Listing", value: "scam" },
    { label: "Stolen Vehicle / Documentation Discrepancy", value: "stolen_property" },
    { label: "Inaccurate Condition / Tampered Mileage", value: "wrong_info" },
    { label: "Vehicle Already Sold / Unavailable", value: "unavailable" },
    { label: "Spam or Offensive Listing Particulars", value: "spam" },
  ];

  useEffect(() => {
    if (id) fetchVehicleDetails();
  }, [id]);

  const fetchVehicleDetails = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        profiles!fk_vehicles_profile_id (
          business_name,
          full_name,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    setItem(data);
  } catch (err: any) {
    console.error("Error fetching vehicle details:", err.message);
    Alert.alert("Error", "Could not load vehicle details.");
  } finally {
    setLoading(false);
  }
};

  const handleSendMessage = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please login to message the dealer", [
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
      const itemTitle = `${item.make} ${item.model} (${item.year_of_manufacture})`;

      router.push({
        pathname: `/chat/${conversationId}`,
        params: { 
          prefillTitle: itemTitle,
          prefillImage: item.image_urls?.[0] || '',
          topic: itemTitle
        }
      });
    } catch (error: any) {
      Alert.alert("Error", "Could not initialize chat session.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please log in to submit a verification audit request.");
      return;
    }
    if (!selectedReason) {
      Alert.alert("Reason Missing", "Please pick a matching categorization flag for your report.");
      return;
    }

    setReportingSubmit(true);
    try {
      const { error } = await supabase
        .from('listing_reports')
        .insert({
          reporter_id: user.id,
          listing_id: id,
          listing_type: 'vehicles', // Routes specifically into the vehicle auditing category
          reason_category: selectedReason,
          additional_details: reportDetails.trim() || null
        });

      if (error) throw error;

      Alert.alert(
        "Report Submitted", 
        "Thank you. This vehicle listing has been queued for comprehensive administrative title evaluation.",
        [{ text: "Understood", onPress: () => {
           setIsReportModalVisible(false);
           setSelectedReason(null);
           setReportDetails("");
        }}]
      );
    } catch (err: any) {
      console.error("Vehicle Audit Submission Error:", err.message);
      Alert.alert("Error", "We couldn't log the report at this moment. Please double check network status.");
    } finally {
      setReportingSubmit(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#005d14" />
      </View>
    );
  }

  if (!item) return null;

  const vehicleTitle = `${item.make} ${item.model} ${item.year_of_manufacture}`;
  const dealerName = item.profiles?.business_name || item.profiles?.full_name || "Verified Dealer";
  const mainImage = item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
          
      {/* Header Bar */}
      {/* Header Bar */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
            <Ionicons name="arrow-back" size={26} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Vehicle Details</Text>
        </View>

        {/* Flag reporting entry point */}
        {!loading && item && user?.id !== item.user_id && (
          <TouchableOpacity 
            onPress={() => setIsReportModalVisible(true)}
            className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full active:bg-gray-100"
          >
            <Ionicons name="flag-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        
        {/* Hero Image Showcase */}
        <View className="px-4 mt-2"> 
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => {
              setSelectedImage(mainImage);
              setIsPreviewVisible(true);
            }}
            className="w-full rounded-[32px] overflow-hidden bg-gray-100 shadow-sm border border-gray-100"
            style={{ aspectRatio: 1.4 }}
          >
            <Image
              source={{ uri: mainImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={300}
            />
            
            {/* Image Array Count Overlay */}
            <View className="absolute bottom-4 right-4 bg-black/50 px-3 py-1 rounded-full">
              <Text className="text-white text-[10px] font-bold">1 / {item.image_urls?.length || 1}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="px-6 py-6">
          {/* Brand/Model Metadata Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black text-gray-900 tracking-tight flex-1 mr-2">{vehicleTitle}</Text>
            {item.profiles?.role === 'vendor' && (
              <View className="bg-green-50 px-2.5 py-1 rounded-full border border-green-100 flex-row items-center">
                <Ionicons name="checkmark-circle" size={12} color="#005d14" />
                <Text className="ml-1 text-[#005d14] text-[10px] font-bold uppercase">Vendor</Text>
              </View>
            )}
          </View>
          
          <View className="flex-row items-center mt-2 bg-gray-50 self-start px-2.5 py-1 rounded-lg">
            <Ionicons name="car-sport" size={14} color="#005d14" />
            <Text className="text-gray-500 text-xs font-medium ml-1.5 capitalize">{item.condition?.replace('_', ' ')}</Text>
          </View>

          {/* Core Automotive Spec Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-6">
            <FeatureIcon icon="speedometer-outline" label={item.mileage_km ? `${item.mileage_km.toLocaleString()} km` : '0 km'} />
            <FeatureIcon icon="cog-outline" label={item.transmission} />
            <FeatureIcon icon="color-palette-outline" label={item.body_color || "N/A"} />
            <FeatureIcon icon="calendar-outline" label={item.year_of_manufacture?.toString()} />
            
            {item.is_first_body && (
              <FeatureIcon icon="shield-checkmark-outline" label="First Body" />
            )}
            {item.is_ac_chilling && (
              <FeatureIcon icon="snow-outline" label="Chilling A/C" />
            )}
          </ScrollView>

          {/* Verification Actions & Safety Banners */}
          <View className="mt-6">
            {user?.id === item.user_id && item.profiles?.role !== 'vendor' ? (
              <TouchableOpacity 
                onPress={() => {
                  const phoneNumber = '234XXXXXXXXXX'; // Admin Hotline Token
                  const message = `Hello Admin, I want to upgrade my profile to Vendor account for item: ${vehicleTitle}. Profile ID: ${user?.id}`;
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
                  <Ionicons name="ribbon-outline" size={20} color="#dc2626" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-red-900 font-bold text-sm">Upgrade to Vendor Status</Text>
                  <Text className="text-red-800 text-xs mt-0.5">Unlock professional storefront badges to attract more vehicle buyers.</Text>
                </View>
                <View className="bg-green-500 p-1.5 rounded-full">
                  <Ionicons name="logo-whatsapp" size={14} color="white" />
                </View>
              </TouchableOpacity>
            ) : (
              item.profiles?.role !== 'vendor' && (
                <View className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex-row items-start">
                  <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#f97316" />
                  <View className="ml-3 flex-1">
                    <Text className="text-orange-900 font-bold text-sm uppercase tracking-wide">Secure Transaction Notice</Text>
                    <Text className="text-orange-800 text-xs leading-4 mt-1">
                      This account is not a registered vendor. Always physically check mechanical components, engine health, and custom validation tags before handling downpayments.
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>

          {/* Description Section */}
          <View className="mt-8">
            <Text className="text-lg font-bold text-gray-900 mb-2">Dealer Notes & Remarks</Text>
            <Text className="text-gray-500 leading-6 text-[15px]">{item.description || "No supplemental details provided."}</Text>
          </View>

          {/* Media Multi-Image Row Viewport */}
          {item.image_urls && item.image_urls.length > 1 && (
            <View className="mt-10">
              <View className="flex-row justify-between items-center mb-4 px-1">
                <Text className="text-lg font-black text-gray-900 tracking-tight">Vehicle Showroom</Text>
                <Text className="text-primary font-bold text-xs">{item.image_urls.length} Images</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.image_urls.map((img: string, index: number) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => {
                      setSelectedImage(img);
                      setIsPreviewVisible(true);
                    }}
                    className="mr-3 shadow-sm"
                  >
                    <Image 
                      source={{ uri: img }} 
                      style={{ width: 120, height: 120, borderRadius: 20 }} 
                      contentFit="cover" 
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <View className="h-32" />
      </ScrollView>

      {/* Bottom Payment Processing and Conversational Triggers */}
      <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-6 flex-row justify-between items-center">
        <View className="flex-1 mr-4">
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Outright Price</Text>
          <Text className="text-2xl font-black text-gray-900" numberOfLines={1}>
            ₦{item.price?.toLocaleString()}
          </Text>
          <Text className="text-app-text-muted text-[10px] font-bold" numberOfLines={1}>Listed by: {dealerName}</Text>
        </View>

        {user?.id === item.user_id ? (
          <View className="bg-gray-100 px-6 py-4 rounded-2xl">
            <Text className="text-gray-500 font-bold text-sm">Your Listing</Text>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handleSendMessage} 
            disabled={isStartingChat} 
            className="bg-primary px-8 py-4 rounded-2xl shadow-lg shadow-green-100"
          >
            {isStartingChat ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-bold text-base">Contact Dealer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Dedicated Context-Safe Image Lightbox Preview Modal */}
      <Modal 
        visible={isPreviewVisible} 
        transparent={true} 
        animationType="fade" 
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <TouchableOpacity 
            onPress={() => setIsPreviewVisible(false)} 
            className="absolute top-14 right-6 z-20 bg-white/10 p-2 rounded-full"
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          <View style={{ width: width, height: '100%' }} className="justify-center items-center">
            <Image 
              source={{ uri: selectedImage }} 
              style={{ width: width, height: '85%' }} 
              contentFit="contain" 
              transition={200}
            />
          </View>
        </View>
      </Modal>
      {/* AUDITING & REPORTING PRESENTATION OVERLAY */}
      <Modal
        visible={isReportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          className="flex-1 justify-end bg-black/40"
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setIsReportModalVisible(false)} 
            className="flex-1" 
          />
          
          <View className="bg-white rounded-t-[32px] px-6 pt-6 pb-8 border-t border-gray-100 shadow-2xl max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-xl font-black text-gray-900 tracking-tight">Report Vehicle Posting</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Flag potentially fraudulent automobile listings</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsReportModalVisible(false)} 
                className="bg-gray-100 p-2 rounded-full"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-2">
              {reportCategories.map((cat) => {
                const isSelected = selectedReason === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    activeOpacity={0.75}
                    onPress={() => setSelectedReason(cat.value)}
                    className={`flex-row items-center justify-between p-4 mb-2.5 rounded-[18px] border ${
                      isSelected ? 'bg-green-50/60 border-green-200' : 'bg-gray-50/50 border-gray-100/80'
                    }`}
                  >
                    <Text className={`text-[14px] font-bold ${isSelected ? 'text-green-800' : 'text-gray-700'}`}>
                      {cat.label}
                    </Text>
                    <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                      isSelected ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text className="text-gray-900 font-bold text-xs mt-4 mb-2 ml-1">Additional Observations (Optional)</Text>
              <TextInput
                placeholder="Provide engine tags, suspect pricing inconsistencies, or fake contact data patterns..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                value={reportDetails}
                onChangeText={setReportDetails}
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-800 font-medium text-xs h-20"
              />

              <TouchableOpacity
                onPress={handleReportSubmit}
                disabled={reportingSubmit}
                activeOpacity={0.8}
                className="bg-red-600 h-12 rounded-full flex-row items-center justify-center mt-6 shadow-sm"
              >
                {reportingSubmit ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="alert-circle-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text className="text-white font-extrabold text-sm tracking-wide">Submit Listing For Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const FeatureIcon = ({ icon, label }: { icon: string; label: string }) => (
  <View className="items-center mr-6">
    <View className="bg-gray-50 border border-gray-100 w-14 h-14 rounded-2xl items-center justify-center mb-2">
      <Ionicons name={icon as any} size={22} color="#005d14" />
    </View>
    <Text className="text-[10px] text-gray-400 font-bold text-center w-16" numberOfLines={1}>{label}</Text>
  </View>
);