import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text,   
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Platform, 
  StatusBar,
  Linking 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChevronLeft, MessageCircle, WifiOff } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useRouter, Stack, useFocusEffect } from "expo-router";
import * as Location from 'expo-location'; 
import { useNetworkObserver } from '@/hooks/useNetworkObserver';

// Import your custom component
import { GradientAvatar } from "@/components/GradientAvatar";

// --- SKELETON COMPONENTS ---
const ProfileSkeleton = () => (
  <View className="items-center mt-8 mb-6">
    <View style={{ width: 110, height: 110, borderRadius: 55 }} className="bg-gray-100" />
    <View className="h-6 w-40 bg-gray-100 rounded-md mt-4" />
    <View className="h-4 w-24 bg-gray-100 rounded-md mt-2" />
  </View>
);

const MenuLinkSkeleton = () => (
  <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
    <View className="flex-row items-center">
      <View className="w-6 h-6 rounded bg-gray-100" />
      <View className="ml-3 h-4 w-32 bg-gray-100 rounded" />
    </View>
    <View className="w-5 h-5 rounded bg-gray-50" />
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  const [uploading, setUploading] = useState(false);
  const [address, setAddress] = useState("Locating...");
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ full_name: string; is_verified?: boolean; location: string; id: string } | null>(null);
  
  const isVerified = userData?.is_verified || false;

  // --- CORE LOGIC: DATA FETCHING ---
  const fetchUserProfile = async () => {
    if (!isConnected) {
      setLoading(false); // Stop loading to show cached/empty state if offline
      return;
    }
    try {
      if (!userData) {
        setLoading(true);
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, is_verified, location') 
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserData({
          id: user.id,
          full_name: data.full_name || "---",
          location: data.location || "Set Location",
          is_verified: data.is_verified 
        });
        if (data.location) setAddress(data.location);
        if (data.avatar_url) setProfileImage(data.avatar_url);
      }
    } catch (error: any) {
      console.error("Profile Fetch Error:", error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCurrentLocation = async () => {
    if (!isConnected) {
      Alert.alert("Offline", "Connect to the internet to update your location.");
      return;
    }
    setLoadingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress("Abeokuta, NG");
        setLoadingLoc(false);
        return;
      }
  
      let location = await Location.getCurrentPositionAsync({});
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
  
      if (reverseGeocode.length > 0) {
        const loc = reverseGeocode[0];
        const displayLoc = loc.district || loc.name || loc.city || "Unknown";
        const fullLocString = `${displayLoc}, ${loc.region || ''}`;
        
        setAddress(fullLocString);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ 
              location: fullLocString,
              lat: location.coords.latitude,
              lng: location.coords.longitude 
            })
            .eq('id', user.id);
        }
      }
    } catch (error) {
      console.log("Location Error:", error);
      setAddress("Set Location");
    } finally {
      setLoadingLoc(false);
    }
  };

  // FIXED: Consolidated useFocusEffect to prevent "Navigation Context" errors
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
     if (isConnected) fetchCurrentLocation();
    }, [isConnected])
  );
  
  // --- CORE LOGIC: IMAGE HANDLING ---
  const pickImage = async () => {
    if (!isConnected) {
      Alert.alert("Offline", "Please connect to the internet to change your profile picture.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need photo access to update your profile.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, 
    });

    if (!result.canceled && result.assets[0].uri && userData?.id) {
      handleUpload(result.assets[0].uri);
    }
  };

  const handleUpload = async (uri: string) => {
    if (!userData?.id) return;
    try {
      setUploading(true);
      const fileName = `${userData.id}-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      setProfileImage(publicUrl);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message || "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!isConnected) {
      Alert.alert("Offline", "Cannot request verification while offline.");
      return;
    }
  const phoneNumber = "2348142371976"; // Added 234 prefix
  const message = `Hello Scritt Admin, my name is ${userData?.full_name}. I would like to request a verification badge. User ID: ${userData?.id}`;
  
  const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
  const browserUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
    } else {
      // If the app can't "see" WhatsApp, wa.me is a universal link
      // Android will catch this and ask to open in WhatsApp or Browser
      await Linking.openURL(browserUrl);
    }
  } catch (error) {
    // Ultimate fallback to Email
    const emailUrl = `mailto:adesegunadetutu20@gmail.com?subject=Verification&body=${encodeURIComponent(message)}`;
    Linking.openURL(emailUrl);
  };
  // --- OFFLINE BLOCKER ---
  // We only block if we have NO profile data and NO connection.
  // This ensures users can still see their settings/links if they've loaded before.
  if (!isConnected && !userData) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <WifiOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          We can't load your profile details right now. Please check your internet connection.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary w-64 py-4 rounded-[24px] items-center self-center"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
};

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header Section */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="bg-white border-b border-gray-50"
      >
        <View className="px-4 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              className="mr-3 p-1"
            >
              <ChevronLeft size={28} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xl font-black text-gray-900">Profile</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/messages')} className="p-1">
            <MessageCircle size={24} color="#1f2937" />
            <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View className="px-6">
            <ProfileSkeleton />
            <View className="mt-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <MenuLinkSkeleton key={i} />)}
            </View>
          </View>
        ) : (
          <>
            {/* Profile Info Section */}
            <View className="items-center mt-8 mb-6">
              <TouchableOpacity 
                onPress={pickImage} 
                disabled={uploading} 
                activeOpacity={0.8}
                className="relative"
              >
                <GradientAvatar 
                  uri={profileImage} 
                  size={120} 
                  strokeWidth={4} 
                  idSuffix="profile-screen" 
                />

                <View 
                  className="absolute bottom-0 right-0 bg-green-600 p-2 rounded-full border-2 border-white shadow-sm"
                  style={{ elevation: 3 }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={20} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              <Text className="mt-4 text-xl font-bold text-gray-900">{userData?.full_name || "No Internet"}</Text>
              
              <View className="flex-row items-center mt-2">
                <TouchableOpacity onPress={fetchCurrentLocation} className="flex-row items-center">
                  <Ionicons name="location-sharp" size={18} color="#ff0000" />
                  {loadingLoc ? (
                    <ActivityIndicator size="small" color="#9ca3af" className="ml-1" />
                  ) : (
                    <Text className="ml-1 text-gray-500 font-medium text-sm">{address}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Verification Button */}
            <View className="items-center w-full px-6">
              {!isVerified && (
                <TouchableOpacity onPress={handleRequestVerification} className="mt-2 mb-4 px-5 py-2 bg-primary rounded-full">
                  <Text className="text-white text-[11px] font-medium tracking-wider">Request Verified Badge</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Manage Posts Section */}
            <View className="px-6 mb-4 mt-4">
               <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Business & Posts</Text>
               <MenuLink icon="cart-outline" label="My Market Listings" onPress={() => router.push('/profile/my-listings')} />
               <MenuLink icon="business-outline" label="My Accommodations" onPress={() => router.push('/profile/my-accommodations')} />
               <MenuLink icon="construct-outline" label="My Services" onPress={() => router.push('/profile/my-services')} />
               <MenuLink icon="people-outline" label="Roommate Requests" onPress={() => router.push('/profile/my-roommates')} />
            </View>

            {/* Account Settings Section */}
            <View className="px-6">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Account Settings</Text>
              <MenuLink icon="person-outline" label="Edit Profile" onPress={() => router.push('/profile/edit')} />
              <MenuLink icon="settings-outline" label="Settings" onPress={() => router.push('/profile/settings')} />
              <MenuLink icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
              
              <TouchableOpacity onPress={() => supabase.auth.signOut()} className="flex-row items-center justify-between py-4">
                <View className="flex-row items-center">
                  <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                  <Text className="ml-3 text-red-600 font-medium">Log Out</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MenuLink({ icon, label, onPress, color = "#16a34a" }: { icon: any, label: string, onPress?: () => void, color?: string }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between py-4 border-b border-gray-100">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color={color} />
        <Text className="ml-3 text-gray-800 font-medium">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}