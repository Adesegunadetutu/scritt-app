import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useListingsStore } from '@/stores/useListingsStore';

// Categories matching your request
const CATEGORIES = [
  "Fashion Designer", "Hairdresser", "Cake and Pasteries", "Chef", 
  "Furniture", "Mechanic", "Plumber", "Cleaner", 
  "Adire", "Printing", "Graphic Designer", "Web Designer", "Others"
];

export default function AddServiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [images, setImages] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hairdresser');
  const [location, setLocation] = useState('');
  const { editId } = useLocalSearchParams();
  const [fetchingData, setFetchingData] = useState(!!editId);
  
  // Toggles for Service features
  const [isVerified, setIsVerified] = useState(false); 
  const [offersHomeService, setOffersHomeService] = useState(false);
  const [availableWeekends, setAvailableWeekends] = useState(true);
  const isOffline = useListingsStore((state) => state.isOffline);

  // --- 1. Fetch data if in Edit Mode ---
  useEffect(() => {
    if (editId) {
      fetchExistingService();
    }
  }, [editId]);

  const fetchExistingService = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) throw error;

      setBusinessName(data.business_name);
      setDescription(data.description);
      setCategory(data.category);
      setLocation(data.location_address);
      setIsVerified(data.is_verified);
      setOffersHomeService(data.home_service);
      setAvailableWeekends(data.weekend_availability);
      setImages(data.images || []); 
    } catch (err: any) {
      Alert.alert("Error", "Could not load service details.");
      router.back();
    } finally {
      setFetchingData(false);
    }
  };

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.6, 
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setImages([...images, ...selectedUris]);
    }
  };

  // --- 2. Smart Upload (Only upload new files) ---
  const uploadImages = async (uris: string[]) => {
    const uploadedPaths: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User session not found.");

    for (const uri of uris) {
      if (uri.startsWith('services/')) {
        uploadedPaths.push(uri);
        continue;
      }

      try {
        const processed = await manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.6, format: SaveFormat.JPEG }
        );

        const fileName = `services/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const response = await fetch(processed.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { data, error } = await supabase.storage
          .from('service_portfolios')
          .upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;
        uploadedPaths.push(data.path);
      } catch (err: any) {
        console.error("Single Image Upload Error:", err);
        throw new Error("Portfolio image upload failed.");
      }
    }
    return uploadedPaths;
  };

  const handlePublish = async () => {
    if (!businessName || !description || !location || images.length === 0) {
      Alert.alert("Missing Info", "Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session.");

      // --- FEATURE GATE CHECK ---
          // 2. Fetch the user's profile to check for an avatar
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
      
          if (profileError) throw new Error("Could not verify profile status.");
      
          // 3. Block if avatar is missing or is the default placeholder
          if (!profile?.avatar_url || profile.avatar_url.includes('profile.jpg')) {
            setLoading(false); // Stop the spinner
            Alert.alert(
              'Photo Required', 
              'To post on the SCRITT marketplace, you must have a profile photo. This helps build trust between buyers and sellers.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upload Now', onPress: () => router.push('/profile') }
              ]
            );
            return;
          }

      const uploadedPaths = await uploadImages(images);

      const payload = {
        provider_id: user.id,
        business_name: businessName,
        description,
        category: category, 
        location_address: location,
        is_verified: isVerified,
        home_service: offersHomeService,
        weekend_availability: availableWeekends,
        images: uploadedPaths, 
      };

      let error;
      if (editId) {
        const { error: updateError } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('services')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      Alert.alert("Success", editId ? "Service updated!" : "Service listed!");
      router.back(); 

    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" translucent={true} />
      
      {/* IMPORTANT: Added className="flex-1" to this View. 
          Without this, the screen stays blank on Android.
      */}
      <View className="flex-1">
        
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-50">
          <TouchableOpacity 
            onPress={() => router.back()}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={26} color="black" />
          </TouchableOpacity>
          
          <Text className="text-lg font-bold text-gray-900">List a Service</Text>
          
          <TouchableOpacity 
            onPress={handlePublish} 
            disabled={loading || isOffline}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <Text className="text-secondary font-bold text-base">Publish</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          className="flex-1 px-6" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          
          {/* Portfolio Photos */}
          <Text className="text-[10px] font-black text-gray-400 mt-8 mb-4 uppercase tracking-widest">
            Portfolio / Work Photos
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              onPress={pickImages} 
              className="w-24 h-24 bg-gray-50 rounded-3xl items-center justify-center border border-gray-100 mr-3"
            >
              <Ionicons name="add" size={30} color="#9ca3af" />
            </TouchableOpacity>
            
            {images.map((uri, index) => (
              <View key={index} className="mr-3 relative">
                <Image 
                  source={{ uri }} 
                  style={{ width: 96, height: 96, borderRadius: 24 }} 
                />
                <TouchableOpacity 
                  onPress={() => setImages(images.filter((_, i) => i !== index))} 
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white"
                >
                  <Ionicons name="close" size={10} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Business Details */}
          <Text className="text-[10px] font-black text-gray-400 mt-10 mb-4 uppercase tracking-widest">
            Business Details
          </Text>
          
          <TextInput 
            placeholder="Business Name"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800"
            value={businessName}
            onChangeText={setBusinessName}
          />

          <TextInput 
            placeholder="Tell customers about your expertise..."
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800 h-32"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <TextInput 
            placeholder="Business Address / Area"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 p-4 rounded-2xl mb-6 font-semibold text-gray-800"
            value={location}
            onChangeText={setLocation}
          />

          {/* Category Selector */}
          <Text className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setCategory(cat)} 
                className={`mr-2 px-5 py-3 rounded-2xl ${category === cat ? 'bg-primary' : 'bg-gray-50'}`}
              >
                <Text className={`text-[12px] font-bold ${category === cat ? 'text-white' : 'text-gray-500'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Availability & Options */}
          <Text className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Availability & Options</Text>
          
          <ToggleRow 
            label="Home Service Available" 
            value={offersHomeService} 
            onValueChange={setOffersHomeService} 
            icon="car-outline" 
            color="#3b82f6" 
          />
          
          <ToggleRow 
            label="Open on Weekends" 
            value={availableWeekends} 
            onValueChange={setAvailableWeekends} 
            icon="calendar-outline" 
            color="#eab308" 
          />

          <ToggleRow 
            label="Licensed / Certified" 
            value={isVerified} 
            onValueChange={setIsVerified} 
            icon="ribbon-outline" 
            color="#16a34a" 
          />

          <View className="h-10" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const ToggleRow = ({ label, value, onValueChange, icon, color }: any) => (
  <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
    <View className="flex-row items-center">
      <View style={{ backgroundColor: color + '15' }} className="p-2.5 rounded-xl mr-3">
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="font-bold text-gray-700 text-[15px]">{label}</Text>
    </View>
    <Switch 
      value={value} 
      onValueChange={onValueChange} 
      trackColor={{ false: "#f3f4f6", true: "#16a34a" }} 
      thumbColor={Platform.OS === 'ios' ? undefined : (value ? "#fff" : "#f4f3f4")}
    />
  </View>
);