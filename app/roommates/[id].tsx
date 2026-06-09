import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Alert, Platform, StatusBar, KeyboardAvoidingView, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';


const { width } = Dimensions.get('window');

export default function RoommateDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // --- Reporting System States ---
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportingSubmit, setReportingSubmit] = useState(false);

  const reportCategories = [
    { label: "Scam / Fake Hostel or Price", value: "scam" },
    { label: "Inappropriate / Offensive Host Behavior", value: "offensive" },
    { label: "Misleading Preferences / False Profiling", value: "wrong_info" },
    { label: "Room No Longer Available / Filled", value: "unavailable" },
    { label: "Spam / Duplicate Request Listing", value: "spam" },
  ];

  useEffect(() => { 
    if (id && id !== 'undefined') {
      fetchRoommateDetails(); 
    }
  }, [id]);

  const fetchRoommateDetails = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from('roommate_requests')
        .select(`*, profiles:user_id (full_name, avatar_url, education_or_job)`)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setItem(data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

    const getRelativeTime = (dateString: string) => {
  if (!dateString) return "";
  
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just Now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;

  // Fallback to a standard date format if it's older than a week
  return postDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

  const handleSendMessage = () => {
    if (!currentUserId || !item) return;
    if (currentUserId === item.user_id) {
      return Alert.alert("Notice", "This is your own post.");
    }

    const participants = [currentUserId, item.user_id].sort();
    const conversationId = participants.join('_');

    router.push({ 
      pathname: `/chat/${conversationId}`,
      params: { 
        topic: item.title,
        prefillTitle: `Hi, I'm interested in your roommate request: ${item.title}`,
        prefillImage: item.images?.[0] || '' 
      }
    });
  };


  const handleDelete = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to remove this roommate request? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase
              .from('roommate_requests')
              .delete()
              .eq('id', id);
            
            if (!error) {
              router.back();
            } else {
              Alert.alert("Error", "Could not delete the post. Please try again.");
            }
          } 
        }
      ]
    );
  };

  const handleReportSubmit = async () => {
    if (!currentUserId) {
      Alert.alert("Authentication Required", "Please log in to flag this roommate posting.");
      return;
    }
    if (!selectedReason) {
      Alert.alert("Reason Required", "Please tap a reason category before submitting.");
      return;
    }

    setReportingSubmit(true);
    try {
      const { error } = await supabase
        .from('listing_reports')
        .insert({
          reporter_id: currentUserId,
          listing_id: id,
          listing_type: 'roommates', // Targets our polymorphic table category correctly
          reason_category: selectedReason,
          additional_details: reportDetails.trim() || null
        });

      if (error) throw error;

      Alert.alert(
        "Report Received", 
        "Thank you. This community roommate request has been prioritized for moderation verification.",
        [{ text: "OK", onPress: () => {
           setIsReportModalVisible(false);
           setSelectedReason(null);
           setReportDetails("");
        }}]
      );
    } catch (err: any) {
      console.error("Roommate Reporting Error:", err.message);
      Alert.alert("Submission Failed", "We couldn't log your flag at this time. Check your connection.");
    } finally {
      setReportingSubmit(false);
    }
  };

  if (loading || !item) return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#000" />
    </View>
  );

  const isPostOwner = currentUserId === item.user_id;
  const isOwner = item.request_type === 'has_room';

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 1. STICKY HEADER */}
      {/* 1. STICKY HEADER */}
      <View 
        style={{ paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight ?? 0) + 10 }}
        className="bg-white border-b border-gray-100 px-6 pb-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={28} color="black" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-gray-900">Roommate Details</Text>
        </View>

        {/* Flag button entry layout */}
        {!loading && item && currentUserId !== item.user_id && (
          <TouchableOpacity 
            onPress={() => setIsReportModalVisible(true)}
            className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full active:bg-gray-100"
          >
            <Ionicons name="flag-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
                {/* 2. BOX IMAGE SLIDER */}
          <View className="px-6 mt-4">
            <View className="h-[250px]">
              <ScrollView 
                horizontal 
                pagingEnabled={false} // Disable standard paging for custom snapping
                snapToInterval={width - 48 + 16} // Image width + the gap (margin)
                decelerationRate="fast"
                onScroll={(e) => {
                  // Calculate slide based on the new interval (width + gap)
                  const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 48 + 16));
                  setActiveImage(slide);
                }}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
              >
                {(item.images?.length > 0 ? item.images : ['https://via.placeholder.com/400']).map((img: string, i: number) => (
                  <View 
                    key={i} 
                    style={{ 
                      width: width - 48, 
                      marginRight: 16, // This creates the space between images
                      height: 250,
                      borderRadius: 32,
                      overflow: 'hidden',
                      backgroundColor: '#f3f4f6' 
                    }}
                  >
                    <Image 
                      source={{ uri: img }} 
                      className="w-full h-full"
                      resizeMode="cover" 
                    />
                  </View>
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              <View className="flex-row absolute bottom-4 self-center">
                {item.images?.map((_: any, i: number) => (
                  <View key={i} className={`h-1.5 rounded-full mx-1 ${activeImage === i ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} />
                ))}
              </View>
            </View>
          </View>
        {/* 3. CONTENT CARD (No negative margin now) */}
        <View className="px-6 pt-6">
          {/* Replace the static text with this dynamic check */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="bg-accent px-3 py-1 rounded-md">
                <Text className="text-[10px] text-gray-800 font-bold">
                  Posted: {getRelativeTime(item.created_at)}
                </Text>
              </View>
              <Text className="font-bold text-primary">
                {isOwner ? 'Has a room' : 'Needs a Room'}
              </Text>
            </View>
          <Text className="text-xl font-black text-gray-900 leading-7 mb-6">{item.title}</Text>

          {/* ICON DETAILS SECTION */}
          <DetailRow icon="location-outline" label={isOwner ? "Location" : "Preferred Location"} value={item.location} />
          <DetailRow icon="calendar-outline" label="Move in date" value={item.move_in_date} />
          <DetailRow icon="people-outline" label={isOwner ? "Rent per Person" : "Budget"} value={`₦${item.price?.toLocaleString()}/year`} />
          <DetailRow icon="flash-outline" label="Electricity" value={item.electricity || "Available"} />
          <DetailRow icon="water-outline" label="Water" value={item.water ? "Available" : "Available"} />
          <DetailRow icon="paw-outline" label="Pets" value={item.pets ? "Yes" : "No"} />

          {/* DESCRIPTION & PROFILE */}
          <Text className="font-black text-gray-950 mt-8 mb-4 uppercase text-[10px] tracking-widest">Description & Host</Text>
          <View className="flex-row items-center mb-4 bg-gray-50 p-4 rounded-2xl">
             <Image source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/100' }} className="w-12 h-12 bg-gray-200 rounded-full mr-3" />
             <View>
                <Text className="font-bold text-base text-gray-900">{item.profiles?.full_name}</Text>
                <Text className="text-xs text-gray-500 font-medium">{item.profiles?.education_or_job || "Student"}</Text>
             </View>
          </View>
          <Text className="text-gray-800 text-sm leading-6">{item.description}</Text>
        </View>
      </ScrollView>

      {/* FOOTER BUTTONS */}
      <View className="absolute bottom-0 w-full bg-white px-6 py-4 flex-row border-t border-gray-100 pb-10 shadow-sm">
        {isPostOwner ? (
          <>
            <TouchableOpacity 
              onPress={() => router.push(`roommates/add-roommates?editId=${item.id}`)}
              className="flex-1 bg-primary rounded-2xl flex-row items-center justify-center py-4 mr-3"
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Edit Post</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleDelete}
              className="bg-red-50 p-4 rounded-2xl border border-red-100"
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              onPress={handleSendMessage}
              className="flex-1 bg-primary rounded-2xl flex-row items-center justify-center py-4 mr-3"
            >
              <Ionicons name="mail-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Interested</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-gray-100 p-4 rounded-2xl">
              <Ionicons name="call-outline" size={20} color="black" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ROOMMATE AUDITING SHEET COMPONENT */}
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
                <Text className="text-xl font-black text-gray-900 tracking-tight">Report Roommate Request</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Help filter off campus housing bad listings</Text>
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

              <Text className="text-gray-900 font-bold text-xs mt-4 mb-2 ml-1">Additional Explanations (Optional)</Text>
              <TextInput
                placeholder="Tell us more about rent inconsistencies, fake pictures or safety violations..."
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
                    <Text className="text-white font-extrabold text-sm tracking-wide">File Integrity Infraction</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
    </View>
  );
}

const DetailRow = ({ icon, label, value }: any) => (
  <View className="flex-row items-center mb-4">
    <View className="bg-gray-50 p-2 rounded-lg">
      <Ionicons name={icon} size={18} color="#005D14" />
    </View>
    <View className="ml-3">
       <Text className="text-gray-400 text-[10px] uppercase font-bold">{label}</Text>
       <Text className="text-gray-900 text-sm font-semibold">{value}</Text>
    </View>
  </View>
);