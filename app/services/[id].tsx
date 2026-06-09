import React, { useEffect, useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, 
  ActivityIndicator, Dimensions, Linking, StatusBar, 
  Alert, Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ServiceDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  // --- Reporting States ---
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportingSubmit, setReportingSubmit] = useState(false);

  const reportCategories = [
    { label: "Scam / Fraudulent Service Provider", value: "scam" },
    { label: "Misleading Prices or Fake Portfolios", value: "wrong_info" },
    { label: "Unresponsive / Out of Business", value: "unavailable" },
    { label: "Spam / Duplicate Service Posting", value: "spam" },
    { label: "Inappropriate or Abusive Content", value: "offensive" },
  ];
  

  useEffect(() => { fetchInitialData(); }, [id]);

  const fetchInitialData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      const { data, error } = await supabase
        .from('services')
        .select('*, profiles:provider_id (full_name, avatar_url, phone, is_verified)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setService(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to remove this service? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          // Replace your handleDelete's onPress with this:
onPress: async () => {
  try {
    const { error } = await supabase.from('services').delete().eq('id', id);
    
    if (error) throw error;

    // 1. Immediately null out the service state to stop rendering details
    setService(null); 
    
    // 2. Navigate away
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/services');
    }
  } catch (error) {
    Alert.alert("Error", "Could not delete service. Please try again.");
    console.error(error);
  }
}
        }
      ]
    );
  };

  const handleMessagePress = () => {
    if (!user || !service || !service.id) return;

    // Create the sorted alphabetical ID to match ChatRoom logic
    const participants = [user.id, service.provider_id].sort();
    const convId = participants.join('_');

    const SERVICE_BUCKET = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service_portfolios/`;
    
    router.push({
      pathname: `/chat/${convId}`,
      params: { 
        prefillTitle: service.business_name,
        prefillImage: `${SERVICE_BUCKET}${service.images?.[0]}`,
        table: 'service',
        topic: service.category
      }
    });
  };

  const handleReportSubmit = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please login to report this service provider.");
      return;
    }
    if (!selectedReason) {
      Alert.alert("Hold on", "Please select a reason for reporting this service listing.");
      return;
    }

    setReportingSubmit(true);
    try {
      const { error } = await supabase
        .from('listing_reports')
        .insert({
          reporter_id: user.id,
          listing_id: id,
          listing_type: 'services', // Explicitly tags polymorphic relation to your services table
          reason_category: selectedReason,
          additional_details: reportDetails.trim() || null
        });

      if (error) throw error;

      Alert.alert(
        "Report Logged", 
        "Thank you! Our system administrators will review this provider's listing immediately.",
        [{ text: "OK", onPress: () => {
           setIsReportModalVisible(false);
           setSelectedReason(null);
           setReportDetails("");
        }}]
      );
    } catch (err: any) {
      console.error("Reporting Error:", err.message);
      Alert.alert("Submission Failed", "Something went wrong while sending your report. Please try again.");
    } finally {
      setReportingSubmit(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}${diffInHours === 1 ? 'hr' : 'hrs'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
};

  if (loading || !service) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator size="large" color="#000" /></View>;

  const isOwner = user?.id === service?.provider_id;
  const serviceBucketUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service_portfolios`;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- 1. NEW TOP HEADER (ARROW ABOVE IMAGE) --- */}
      {/* --- 1. TOP HEADER --- */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-gray-900 ml-2">Service Details</Text>
        </View>

        {/* Report Button (Hidden from owners or if loading has not completed) */}
        {!loading && service && !isOwner && (
          <TouchableOpacity 
            onPress={() => setIsReportModalVisible(true)}
            className="w-9 h-9 items-center justify-center bg-gray-50 rounded-full active:bg-gray-100"
          >
            <Ionicons name="flag-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* --- 2. IMAGE HERO SECTION (CARD STYLE) --- */}
        {/* --- 2. IMAGE HERO SECTION (CARD STYLE) --- */}
<View className="px-5 mt-2"> 
  <View className="w-full h-96 rounded-[30px] overflow-hidden bg-gray-200 shadow-sm">
    <ScrollView 
      horizontal 
      pagingEnabled 
      // This ensures we snap exactly to the width of the container
      onScroll={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / (width - 40)))}
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      // Remove any default padding that might exist
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      {service?.images?.map((img: string, i: number) => (
        <Image 
          key={i} 
          source={{ uri: `${serviceBucketUrl}/${img}` }}
          // width - 40 is correct because px-5 on both sides = 40px total margin
          style={{ width: width - 40, height: 384 }} 
          contentFit="fill" 
          transition={200}
        />
      ))}
    </ScrollView>

    {/* Pagination Dots */}
    <View className="absolute bottom-5 w-full flex-row justify-center space-x-1.5">
      {service?.images?.map((_: any, i: number) => (
        <View 
          key={i} 
          className={`h-1.5 rounded-full ${activeImg === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} 
        />
      ))}
    </View>
  </View>
</View>

        {/* --- REST OF THE CONTENT (Badges, Description, Gallery) --- */}
        <View className="px-5 py-4">
          {/* Metadata Badges */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row space-x-">
              <View className="bg-primary-surface px-3 py-1.5 rounded-md">
                  <Text className="text-[10px] font-bold text-gray-600">
                    posted: {formatRelativeTime(service.created_at)}
                  </Text>
                </View>
              {/* Only show "New" badge if created within the last 24 hours */}
                  {(new Date().getTime() - new Date(service.created_at).getTime()) < 86400000 && (
                    <View className="bg-secondary-soft px-3 py-1.5 rounded-md">
                      <Text className="text-[10px] font-bold text-gray-600">New</Text>
                    </View>
                  )}
            </View>
            <View className="flex-row items-center">
              <Ionicons name="location-sharp" size={12} color="#ff0000" style={{ marginRight: 4 }} />
              <Text className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                {service.location_address || 'Location_address'}
              </Text>
            </View>
          </View>

          {/* Business Name & Description */}
          <Text className="text-lg font-bold text-primary mb-4">{service.business_name}</Text>
          <Text className="text-sm font-bold text-gray-900 mb-3">Description</Text>
          
          <View className="flex-row items-center mb-4">
            {/* Change the className approach to explicit style for the avatar */}
              <View className="flex-row items-center mb-6">
  {/* Explicit style handles the phone rendering, mr-4 handles the gap */}
          <Image 
            source={{ uri: service.profiles?.avatar_url }} 
            style={{ width: 52, height: 52, borderRadius: 26, marginRight: 16 }} 
            className="bg-gray-100"
            contentFit="cover"
            transition={200}
          />
          <View className="flex-1 justify-center">
                {/* Full Name */}
                <Text className="text-[12px] font-bold text-gray-400 leading-tight">
                  {service.profiles?.full_name}
                </Text>

                {/* Category */}
                <Text className="text-[12px] text-secondary font-bold lowercase mt-0.5">
                  {service.category}
                </Text>

                {/* Phone Number (Now in its own tag) */}
                <Text className="text-[10px] font-medium text-gray-900 leading-tight mt-0.5">
                  {service.profiles?.phone}
                </Text>
              </View>
        </View>
      </View>

          <Text className="text-gray-600 text-[13px] leading-5 mb-4 ">{service.description}</Text>

          
            {/* 1. If it's NOT my listing AND not verified -> Show Safety Disclaimer */}
                    {!isOwner && !service.profiles?.is_verified &&(
                      <View className="bg-orange-50 mt-2 p-4 rounded-2xl mb-6 border border-orange-100 flex-row items-start">
                        <View className="bg-orange-100 p-2 rounded-full">
                          <Ionicons name="warning" size={20} color="#f97316" />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-orange-900 font-black text-sm uppercase tracking-tight">Safety First</Text>
                          <Text className="text-orange-800 text-xs leading-5 mt-1 opacity-80">
                            This listing is not verified. To avoid scams, never pay any fee before meeting the provider in person.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* If it IS my listing AND not verified -> Show "Get Verified" Call to Action */}
                    {isOwner && !service.profiles?.is_verified && (
                      <TouchableOpacity 
                        onPress={() => {
                          const phoneNumber = '2349032483056'; // Replace with your actual WhatsApp number (include country code)
                          const message = `Hello, I'd like to verify my service: ${service.business_name} (ID: ${service.id})`;
                          const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
                          
                          Linking.canOpenURL(url).then(supported => {
                            if (supported) {
                              Linking.openURL(url);
                            } else {
                              // Fallback to web link if WhatsApp app isn't installed
                              Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
                            }
                          });
                        }}
                        className="bg-[#005D14]/5 mt-2 p-4 rounded-2xl mb-6 border border-[#005D14]/10 flex-row items-center"
                      >
                        <View className="bg-primary p-2.5 rounded-full">
                          <Ionicons name="ribbon" size={20} color="white" />
                        </View>
                        <View className="ml-4 flex-1">
                          <Text className="text-primary font-black text-sm uppercase tracking-tight">
                            Get Verified Badge
                          </Text>
                          <Text className="text-primary/70 text-[11px] leading-4 mt-0.5">
                            Chat with us on WhatsApp and verify your business For Free
                          </Text>
                        </View>
                        <Ionicons name="logo-whatsapp" size={20} color="#005D14" style={{ opacity: 0.6 }} />
                      </TouchableOpacity>
                    )}

          

          {/* --- Gallery Section Header --- */}
              <View className="flex-row items-center justify-between mb-4 mt-4">
                <View>
                  <Text className="text-sm font-bold text-gray-900">Portfolio Gallery</Text>
                  
                </View>
                
                <View className="flex-row space-x-2">
                  {service.home_service && (
                    <View className="bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                      <Text className="text-[8px] font-bold text-primary uppercase">Home Service</Text>
                    </View>
                  )}
                  {service.weekend_availability && (
                    <View className="bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      <Text className="text-[8px] font-bold text-blue-700 uppercase">Opens Weekend</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* --- Horizontal Scroll Gallery --- */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }} // Prevents the last image from hitting the screen edge
                decelerationRate="fast"
                snapToInterval={172} // Image width (160) + margin (12) for a "snapping" feel
              >
                {service?.images?.map((img: string, i: number) => (
                <TouchableOpacity 
                  key={i} 
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedImage(`${serviceBucketUrl}/${img}`);
                    setIsPreviewVisible(true);
                  }}
                  // Use style for margin to ensure consistency across OS
                  style={{ marginRight: 12 }} 
                >
                  <View 
                    className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                    style={{ width: 100, height: 100 }} // Fixed box size
                  >
                    {service?.images?.map((img: string, i: number) => (
  <TouchableOpacity
    key={i}
    activeOpacity={0.9}
    onPress={() => {
      setSelectedImage(`${serviceBucketUrl}/${img}`);
      setIsPreviewVisible(true);
    }}
  >
    <Image 
      source={{ uri: `${serviceBucketUrl}/${img}` }}
      style={{ width: width - 40, height: 384 }} 
      contentFit="fill" 
      transition={200}
    />
  </TouchableOpacity>
))}
                  </View>
                </TouchableOpacity>
              ))}
              </ScrollView>
        </View>

        <View className="h-32" />
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-5 py-4 flex-row items-center space-x-3 pb-8">
        {isOwner ? (
          <>
            <TouchableOpacity 
              onPress={() => router.push(`/add-service?editId=${service.id}`)}
              className="flex-1 h-12 bg-primary rounded-xl items-center justify-center flex-row"
            >
              <Ionicons name="create-outline" size={18} color="white" style={{marginRight: 8}} />
              <Text className="font-bold text-white">Edit Service</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleDelete} 
              className="w-12 h-12 bg-red-50 rounded-xl items-center justify-center border border-red-100"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              onPress={handleMessagePress}
              className="flex-1 h-12 bg-primary rounded-xl items-center justify-center flex-row"
            >
              <Ionicons name="mail-outline" size={18} color="white" style={{marginRight: 8}} />
              <Text className="font-bold text-white">Send Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => Linking.openURL(`tel:${service.profiles?.phone}`)} 
              className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="call-outline" size={18} color="black" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* --- FULLSCREEN IMAGE MODAL PREVIEW --- */}
      <Modal
        visible={isPreviewVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black justify-between" edges={['top', 'bottom']}>
          <StatusBar barStyle="light-content" backgroundColor="black" />
          
          {/* Top Close Bar */}
          <View className="px-5 py-3 flex-row justify-start">
            <TouchableOpacity 
              onPress={() => setIsPreviewVisible(false)} 
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Centered Target Image */}
          <View className="flex-1 justify-center items-center">
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: width, aspectRatio: 1 }}
                contentFit="contain"
              />
            ) : null}
          </View>

          {/* Bottom Details Information Bar */}
          <View className="p-6 bg-black/60 border-t border-white/10 pb-10">
            <Text className="text-white text-lg font-black tracking-tight" numberOfLines={2}>
              {service?.business_name}
            </Text>
            <Text className="text-gray-400 text-xs lowercase font-bold mt-1">
              {service?.category}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* REPORTING BOTTOM SHEET MODAL */}
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
          
          <View className="bg-white rounded-t-[32px] px-5 pt-6 pb-8 border-t border-gray-100 shadow-2xl max-h-[80%]">
            {/* Header elements */}
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-xl font-black text-gray-900 tracking-tight">Report Business Listing</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Help protect our student ecosystem</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsReportModalVisible(false)} 
                className="bg-gray-100 p-1.5 rounded-full"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-2">
              {/* Mapping categories options */}
              {reportCategories.map((cat) => {
                const isSelected = selectedReason === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    activeOpacity={0.7}
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

              <Text className="text-gray-900 font-bold text-xs mt-4 mb-2 ml-1">Additional Details (Optional)</Text>
              <TextInput
                placeholder="Provide details about why this service provider should be audited..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                value={reportDetails}
                onChangeText={setReportDetails}
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-800 font-medium text-xs h-20"
              />

              {/* Red warning submission handler */}
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
                    <Text className="text-white font-extrabold text-sm tracking-wide">Submit Verification Review</Text>
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