import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useListingsStore } from '@/stores/useListingsStore';

export default function AddRoommates() {
  const { type } = useLocalSearchParams(); // 'has_room' or 'needs_room'
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [isStudent, setIsStudent] = useState(true);
  const [subInfo, setSubInfo] = useState("");
  const isOffline = useListingsStore((state) => state.isOffline);

  

  const [form, setForm] = useState({
    title: '',
    location: '',
    price: '',
    electricity: 'Prepaid',
    water: true,
    pets: false,
    description: '',
  });
const isOwner = type === 'has_room';
  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setImages([...images, ...uris].slice(0, 5));
    }
  };

  const uploadImages = async (uris: string[]) => {
  const publicUrls = [];
  console.log("Starting upload for:", uris); // Debug 1

  for (const uri of uris) {
    try {
      const ext = uri.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${ext}`;
      
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: 'base64' 
      });
      
      console.log("Uploading file:", fileName); // Debug 2

      const { data, error } = await supabase.storage
        .from('roommate-listings') // Make sure this matches your new bucket name
        .upload(fileName, decode(base64), { 
          contentType: `image/${ext}`,
          upsert: true 
        });

      if (error) {
        console.error("Supabase Storage Error:", error.message);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roommate-listings')
        .getPublicUrl(fileName);
        
      publicUrls.push(publicUrl);
    } catch (err) {
      console.error("Individual upload failed:", err);
      throw err;
    }
  }
  return publicUrls;
};
  const handleUpload = async () => {
  if (!form.title || !form.price || !form.location) {
    return Alert.alert("Required", "Please fill Title, Location, and Price/Budget.");
  }

  setLoading(true);

  try {
    // --- FEATURE GATE CHECK ---
    // 1. Fetch current profile to check for avatar
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user?.id)
      .single();

    if (profileFetchError) throw new Error("Could not verify profile status.");

    // 2. Block if photo is missing or is the default placeholder
    if (!profile?.avatar_url || profile.avatar_url.includes('profile.jpg')) {
      setLoading(false);
      Alert.alert(
        "Photo Required",
        "To find a roommate on SCRITT, you must have a profile photo. Roommates need to know who they'll be living with!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upload Now", onPress: () => router.push('/profile/edit') }
        ]
      );
      return;
    }
    // --- END GATE CHECK ---

    const uploadedImages = await uploadImages(images);

    // 3. Update the Profile (The Bridge)
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        is_student: isStudent,
        education_or_job: subInfo,
      })
      .eq('id', user?.id);

    if (profileUpdateError) throw profileUpdateError;
    
    // 4. Insert Roommate Request
    const { error } = await supabase.from('roommate_requests').insert({
      user_id: user?.id,
      request_type: type,
      title: form.title,
      location: form.location,
      price: parseFloat(form.price),
      move_in_date: date.toDateString(),
      electricity: form.electricity,
      water: form.water, 
      pets: form.pets,
      description: form.description,
      images: uploadedImages,
    });

    if (error) throw error;

router.replace('/roommates'); // Use replace instead of push

  } catch (err: any) {
    Alert.alert("Error", err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header - Fixed: Now remains at the top */}
      <View className="px-6 py-6 flex-row items-center justify-between border-b border-gray-50">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">Find Roommate</Text>
        <TouchableOpacity 
          onPress={handleUpload} 
          disabled={loading || isOffline} 
          className=" px-4 py-2 rounded-full"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <Text className="text-secondary font-bold">Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content - Fixed: Nested correctly inside the root View */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View className="p-6">
          {/* Multi-Image Strip */}
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-3">
            Apartment Photos
          </Text>
          <View className="flex-row mb-8">
            <TouchableOpacity 
              onPress={pickImages} 
              className="w-20 h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 items-center justify-center mr-3"
            >
              <Ionicons name="camera" size={24} color="#9ca3af" />
            </TouchableOpacity>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((item, index) => (
                <View key={index} className="mr-3">
                  <Image source={{ uri: item }} className="w-20 h-20 rounded-2xl" />
                  <TouchableOpacity 
                    onPress={() => setImages(images.filter((_, i) => i !== index))} 
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full border-2 border-white"
                  >
                    <Ionicons name="close-circle" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Form Fields */}
          <View>
            {/* The Bridge Section */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">
              About You
            </Text>
            <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="font-bold text-gray-700">Are you a Student?</Text>
                <Switch 
                  value={isStudent} 
                  onValueChange={setIsStudent} 
                  trackColor={{ true: "#16a34a" }} 
                />
              </View>
              
              <TextInput 
                className="bg-white p-3 rounded-xl border border-gray-100 text-gray-800"
                placeholder={isStudent ? "What is your Department?" : "What is your Occupation?"}
                placeholderTextColor="#9ca3af"
                value={subInfo}
                onChangeText={setSubInfo}
              />
            </View>

            {/* Title */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Title</Text>
            <TextInput 
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 text-gray-800" 
              placeholder="e.g. Spacious room and Palor self-con..." 
              placeholderTextColor="#9ca3af"
              value={form.title} 
              onChangeText={(t) => setForm({...form, title: t})} 
            />

            {/* Location */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">
              {isOwner ? "Location" : "Preferred Location"}
            </Text>
            <TextInput 
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 text-gray-800" 
              placeholder={isOwner ? "e.g. Isolu behind the filling station" : "e.g. Camp or Gate"} 
              placeholderTextColor="#9ca3af"
              value={form.location} 
              onChangeText={(t) => setForm({...form, location: t})} 
            />

            {/* Price */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">
              {isOwner ? "Rent per Person (₦/year)" : "Budget (₦/year)"}
            </Text>
            <TextInput 
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 text-gray-800" 
              placeholder="e.g. 300000" 
              placeholderTextColor="#9ca3af"
              keyboardType="numeric" 
              value={form.price} 
              onChangeText={(t) => setForm({...form, price: t})} 
            />

            {/* Date Picker */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Move in date</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)} 
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row justify-between items-center mb-6"
            >
              <Text className="text-gray-800">{date.toDateString()}</Text>
              <Ionicons name="calendar-outline" size={18} color="#16a34a" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker 
                value={date} 
                mode="date" 
                onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }} 
              />
            )}

            {/* Electricity */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Electricity</Text>
            <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-6">
              {['Prepaid', 'Postpaid'].map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  onPress={() => setForm({...form, electricity: opt})}
                  className={`flex-1 py-3 rounded-xl items-center ${form.electricity === opt ? 'bg-white' : ''}`}
                  style={form.electricity === opt ? { elevation: 1 } : {}}
                >
                  <Text className={`font-bold ${form.electricity === opt ? 'text-[#16a34a]' : 'text-gray-400'}`}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Water & Pets */}
            <View className="bg-gray-50 rounded-2xl border border-gray-100 mb-6 overflow-hidden">
              <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                <Text className="font-bold text-gray-700">Water Available</Text>
                <Switch 
                  value={form.water} 
                  onValueChange={(v) => setForm({...form, water: v})} 
                  trackColor={{ true: "#16a34a" }} 
                />
              </View>
              <View className="flex-row justify-between items-center p-4">
                <Text className="font-bold text-gray-700">Pets Allowed</Text>
                <Switch 
                  value={form.pets} 
                  onValueChange={(v) => setForm({...form, pets: v})} 
                  trackColor={{ true: "#16a34a" }} 
                />
              </View>
            </View>

            {/* Description */}
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Description</Text>
            <TextInput 
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 h-32 text-gray-800" 
              multiline 
              placeholder="Share more details about your ideal roommate or the apartment vibe..." 
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
              value={form.description} 
              onChangeText={(t) => setForm({...form, description: t})} 
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};