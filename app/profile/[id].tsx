import React, { useEffect, useState } from 'react';
import { 
  View, Text, Image, ScrollView, TouchableOpacity, SafeAreaView, 
  ActivityIndicator, Alert, Dimensions, Platform, StatusBar,
  Modal, TextInput, KeyboardAvoidingView
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, MapPin, MessageCircle, Share2, Flag, X } from 'lucide-react-native';
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

  // --- Reporting System States ---
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportingSubmit, setReportingSubmit] = useState(false);

  const primaryColor = "#166534"; 
  const secondaryColor = "#f97316"; 

  const reportCategories = [
    { label: "Fraud / Scam Operations", value: "scam" },
    { label: "Harassment / Abusive Interaction", value: "offensive" },
    { label: "Selling Counterfeits / Fake Items", value: "wrong_info" },
    { label: "Unresponsive / Inactive Vendor", value: "unavailable" },
    { label: "Spam / Multi-posting Abuse", value: "spam" },
  ];

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

  const handleReportSubmit = async () => {
    if (!currentUserId) {
      Alert.alert("Authentication Required", "Please log in to flag this user.");
      return;
    }
    if (!selectedReason) {
      Alert.alert("Reason Required", "Please select a reason category before submitting.");
      return;
    }

    setReportingSubmit(true);
    try {
      // Direct user report submission mapped to standard profile tracking tables
      const { error } = await supabase
        .from('user_reports') 
        .insert({
          reporter_id: currentUserId,
          reported_user_id: id,
          reason_category: selectedReason,
          additional_details: reportDetails.trim() || null
        });

      if (error) throw error;

      Alert.alert(
        "Report Received", 
        "Thank you. This vendor profile has been logged for systemic structural moderation verification.",
        [{ text: "OK", onPress: () => {
           setIsReportModalVisible(false);
           setSelectedReason(null);
           setReportDetails("");
        }}]
      );
    } catch (err: any) {
      console.error("Profile Reporting Error:", err.message);
      Alert.alert("Submission Failed", "We couldn't submit your flag at this time.");
    } finally {
      setReportingSubmit(false);
    }
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
          
          {/* Dynamically configured flag action layout element */}
          {!loading && currentUserId !== id ? (
            <TouchableOpacity 
              onPress={() => setIsReportModalVisible(true)} 
              className="p-2 bg-gray-50 rounded-full active:bg-gray-100"
            >
              <Flag size={20} color="#dc2626" />
            </TouchableOpacity>
          ) : (
            <View className="w-9 h-9" /> // Structural placeholder spacing element 
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View className="items-center mt-2 px-4">
            
            {/* Avatar with Gradient Stroke */}
            <View style={{ width: avatarSize, height: avatarSize }}>
              <Svg width={avatarSize} height={avatarSize}>
                <Defs>
                  <SvgLinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={primaryColor} />
                    <Stop offset="100%" stopColor={secondaryColor} />
                  </SvgLinearGradient>
                  
                  <ClipPath id="clip">
                    <Circle cx={center} cy={center} r={imageSize / 2} />
                  </ClipPath>
                </Defs>
                
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="url(#grad)"
                  strokeWidth={strokeWidth}
                  fill="white"
                />
                
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
              <MapPin size={14} color="#ef4444" />
              <Text className="text-gray-500 ml-1 font-bold text-xs uppercase tracking-tighter">{profile?.location || "Abeokuta"}</Text>
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
          <View className="flex-row justify-around mt-4 border-y border-gray-50 py-6 bg-gray-50/30">
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

      {/* VENDOR INTERGRITY AUDITING SHEET OVERLAY */}
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
                <Text className="text-xl font-black text-gray-900 tracking-tight">Report Account Profile</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Help protect our student community ecosystem</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsReportModalVisible(false)} 
                className="bg-gray-100 p-2 rounded-full"
              >
                <X size={18} color="#4b5563" />
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

              <Text className="text-gray-900 font-bold text-xs mt-4 mb-2 ml-1">Additional Explanations (Optional)</Text>
              <TextInput
                placeholder="Provide details about payment tracking scams, fake profiles or abusive platform behavior..."
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
                    <Flag size={16} color="white" style={{ marginRight: 6 }} />
                    <Text className="text-white font-extrabold text-sm tracking-wide">Submit Profile Infraction</Text>
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