import React, { useEffect, useState } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { ImageManipulator } from 'expo-image-manipulator';

const CATEGORIES = [
  "Fashion Designer", "Hairdresser", "Cake and Pasteries", "Chef", 
  "Furniture", "Mechanic", "Plumber", "Cleaner", 
  "Adire", "Printing", "Graphic Designer", "Web Designer", "Others"
];

const SERVICE_BUCKET_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service_portfolios`;

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for form fields
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [offersHomeService, setOffersHomeService] = useState(false);
  const [availableWeekends, setAvailableWeekends] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Images state: stores either remote paths (string) or local URIs (string)
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetchServiceData();
  }, [id]);

  const fetchServiceData = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setBusinessName(data.business_name);
        setDescription(data.description);
        setCategory(data.category);
        setLocation(data.location_address);
        setOffersHomeService(data.home_service);
        setAvailableWeekends(data.weekend_availability);
        setIsVerified(data.is_verified);
        setImages(data.images || []);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load service details.");
    } finally {
      setLoading(false);
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

  const uriToBlob = (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error("Failed to convert URI to Blob"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
  };

  const formatCategoryForDb = (cat: string) => {
  // Example: "Fashion Designer" -> "fashion_designer"
  // Adjust this logic based on how you named your Enum values in Supabase
  return cat.toLowerCase().replace(/\s+/g, '_');
};

  const handleUpdate = async () => {
    if (!businessName || !description || !location || images.length === 0) {
      Alert.alert("Missing Info", "Please fill all fields and add photos.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

      const finalImagePaths = [];

      for (const img of images) {
        // Check if image is already a Supabase path
        if (!img.startsWith('file://') && !img.startsWith('content://')) {
          finalImagePaths.push(img);
        } else {
          // 1. Process local image (Standardize to WebP for faster uploads)
          const processed = await ImageManipulator.manipulateAsync(
            img,
            [{ resize: { width: 1000 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
          );

          // 2. Prepare File Metadata
          const fileName = `services/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
          
          // 3. Convert to ArrayBuffer (Production-Safe for Android APKs)
          const response = await fetch(processed.uri);
          const arrayBuffer = await response.arrayBuffer();

          // 4. Upload to storage
          const { data, error: uploadError } = await supabase.storage
            .from('service_portfolios')
            .upload(fileName, arrayBuffer, {
              contentType: 'image/webp',
              upsert: false
            });

          if (uploadError) throw uploadError;
          if (data) finalImagePaths.push(data.path);
        }
      }

      // 5. Update Database
      const { error: dbError } = await supabase
        .from('services')
        .update({
          business_name: businessName,
          description: description,
          category: category, // Matches your DB Enum exactly now
          location_address: location,
          home_service: offersHomeService,
          weekend_availability: availableWeekends,
          is_verified: isVerified,
          images: finalImagePaths,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (dbError) throw dbError;

      Alert.alert("Success", "Service updated!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (err: any) {
      console.error("Full Error:", err);
      Alert.alert("Update Failed", err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = () => {
  Alert.alert(
    "Delete Service",
    "Are you sure you want to delete this listing? This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          const { error } = await supabase.from('services').delete().eq('id', id);
          if (error) {
            Alert.alert("Error", "Could not delete service.");
          } else {
            router.replace('/services'); // Go back to the main list
          }
        } 
      }
    ]
  );
};

  if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator size="large" color="#16a34a" /></View>;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-50">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-bold">Edit Service</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#16a34a" /> : <Text className="text-[#16a34a] font-bold text-base">Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          
          <Text className="text-[10px] font-black text-gray-400 mt-6 mb-3 uppercase tracking-widest">Portfolio Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity onPress={pickImages} className="w-24 h-24 bg-gray-50 rounded-3xl items-center justify-center border border-gray-200 mr-3">
              <Ionicons name="add" size={30} color="#9ca3af" />
            </TouchableOpacity>
            {images.map((img, index) => {
              const isRemote = !img.startsWith('file://') && !img.startsWith('content://');
              const uri = isRemote ? `${SERVICE_BUCKET_URL}/${img}` : img;
              
              return (
                <View key={index} className="mr-3 relative">
                  <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 24 }} contentFit="cover" />
                  <TouchableOpacity 
                    onPress={() => setImages(images.filter((_, i) => i !== index))} 
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white"
                  >
                    <Ionicons name="close" size={10} color="white" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <Text className="text-[10px] font-black text-gray-400 mt-8 mb-3 uppercase tracking-widest">Business Details</Text>
          
          <TextInput 
            placeholder="Business Name"
            className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800"
            value={businessName}
            onChangeText={setBusinessName}
          />

          <TextInput 
            placeholder="Description"
            className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800 h-32"
            multiline textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <TextInput 
            placeholder="Address"
            className="bg-gray-50 p-4 rounded-2xl mb-6 font-semibold text-gray-800"
            value={location}
            onChangeText={setLocation}
          />

          <Text className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setCategory(cat)} 
                className={`mr-2 px-5 py-2.5 rounded-xl ${category === cat ? 'bg-[#16a34a]' : 'bg-gray-100'}`}
              >
                <Text className={`text-[11px] font-bold ${category === cat ? 'text-white' : 'text-gray-500'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ToggleRow label="Home Service Available" value={offersHomeService} onValueChange={setOffersHomeService} icon="car-outline" color="#3b82f6" />
          <ToggleRow label="Open on Weekends" value={availableWeekends} onValueChange={setAvailableWeekends} icon="calendar-outline" color="#eab308" />
          <ToggleRow label="Licensed / Certified" value={isVerified} onValueChange={setIsVerified} icon="ribbon-outline" color="#16a34a" />

          {/* Delete Button */}
          <TouchableOpacity 
            onPress={confirmDelete}
            className="mt-10 mb-20 bg-red-50 py-4 rounded-2xl border border-red-100 items-center"
          >
            <Text className="text-red-600 font-bold">Delete Listing</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const ToggleRow = ({ label, value, onValueChange, icon, color }: any) => (
  <View className="flex-row items-center justify-between py-3">
    <View className="flex-row items-center">
      <View style={{ backgroundColor: color + '15' }} className="p-2 rounded-xl mr-3">
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="font-bold text-gray-700">{label}</Text>
    </View>
    <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#eee", true: "#16a34a" }} />
  </View>
);