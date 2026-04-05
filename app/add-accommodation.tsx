import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useListingsStore } from '@/stores/useListingsStore';

const CATEGORIES = ["Single room", "A room self con", "room and parlor", "room & parlor self con", "two bedroom flat", "3 bedroom flat", "others"];
const FURNITURE_OPTIONS = ["Wardrobe", "Kitchen Cabinet"];

export default function AddAccommodation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Added Description
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Single room');
  const [rentPeriod, setRentPeriod] = useState('Year');
  const [electricity, setElectricity] = useState<'Prepaid' | 'Postpaid'>('Prepaid');
  const [water, setWater] = useState(true);
  const [tenants, setTenants] = useState(1); // Changed to Number
  const [fenced, setFenced] = useState(false);
  const [gated, setGated] = useState(false);
  const [furniture, setFurniture] = useState<string[]>([]);
  const isOffline = useListingsStore((state) => state.isOffline);

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setImages([...images, ...selectedUris]);
    }
  };

const uploadImages = async (uris: string[]) => {
  const uploadedPaths: string[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User session not found.");

  for (const uri of uris) {
    try {
      // 1️⃣ Optional: resize/compress image for faster upload
      const processed = await manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }], // Resize to 1000px width
        { compress: 0.7, format: SaveFormat.WEBP } // JPEG is safest for mobile
      );

      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

      // 2️⃣ Convert to ArrayBuffer (mobile-safe)
      const response = await fetch(processed.uri);
      const arrayBuffer = await response.arrayBuffer();

      // 3️⃣ Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('accommodation_listings')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (error) throw error;

      uploadedPaths.push(data.path);

    } catch (err: any) {
      console.error("Single Image Upload Error:", err);
      throw new Error("One or more images failed to upload.");
    }
  }

  return uploadedPaths;
};

  const handlePublish = async () => {
    if (!title || !price || !description || images.length === 0) {
      Alert.alert("Missing Info", "Please fill in all fields and add at least one photo.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

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
              'To post on the SCRITT marketplace, you must have a profile photo. This helps build trust between App Users',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upload Now', onPress: () => router.push('/profile') }
              ]
            );
            return;
          }

      // 1. Upload images and get the clean paths
      const uploadedPaths = await uploadImages(images);

      // 2. Save to DB
      const { error } = await supabase.from('accommodations').insert([{
        user_id: user.id,
        title,
        description,
        location,
        price: parseFloat(price.replace(/,/g, '')), // Basic cleaning of price string
        category,
        rent_period: rentPeriod,
        electricity,
        water_available: water,
        number_of_tenants: tenants,
        is_fenced: fenced,
        is_gated: gated,
        furniture,
        images: uploadedPaths, 
      }]);

      if (error) throw error;

      Alert.alert("Success", "Property listed successfully!");
      router.back();
    } catch (err: any) {
      // If the error message is "Bucket not found", you know exactly what to fix in the dashboard
      Alert.alert("Upload Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-50">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-bold">List Accommodation</Text>
          <TouchableOpacity onPress={handlePublish} disabled={loading || isOffline}>
            {loading ? <ActivityIndicator size="small" color="#16a34a" /> : <Text className="text-secondary font-bold text-base">Publish</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Photos */}
          <Text className="text-[10px] font-black text-gray-400 mt-6 mb-3 uppercase tracking-widest">Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity onPress={pickImages} className="w-24 h-24 bg-gray-50 rounded-3xl items-center justify-center border border-gray-200 mr-3">
              <Ionicons name="add" size={30} color="#9ca3af" />
            </TouchableOpacity>
            {images.map((uri, index) => (
              <View key={index} className="mr-3 relative">
                <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 24 }} contentFit="cover" />
                <TouchableOpacity onPress={() => setImages(images.filter((_, i) => i !== index))} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white">
                  <Ionicons name="close" size={10} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Details */}
          <Text className="text-[10px] font-black text-gray-400 mt-8 mb-3 uppercase tracking-widest">Property Details</Text>
          <TextInput 
            placeholder="Property Title"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput 
            placeholder="Detailed Description (e.g. proximity to school, security level...)"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800 h-32"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          <TextInput 
              placeholder="Location (e.g. Near Main Gate, kofesu)"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 p-4 rounded-2xl mb-4 font-semibold text-gray-800"
              value={location}
              onChangeText={setLocation} 
            />
          
          <View className="flex-row space-x-4 mb-4">
            <TextInput 
              placeholder="Price"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              className="flex-1 bg-gray-50 p-4 rounded-2xl font-semibold text-gray-800"
              value={price}
              onChangeText={setPrice}
            />
            <TouchableOpacity 
              onPress={() => setRentPeriod(rentPeriod === 'Year' ? 'Semester' : rentPeriod === 'Semester' ? 'Month' : 'Year')}
              className="flex-1 bg-gray-50 rounded-2xl justify-center px-4 border border-gray-100"
            >
               <Text className="text-gray-500 font-bold">/ {rentPeriod}</Text>
            </TouchableOpacity>
          </View>

          {/* Tenants Stepper */}
          <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-2xl mb-6">
            <Text className="font-bold text-gray-600">Max Number of Tenants</Text>
            <View className="flex-row items-center space-x-4">
              <TouchableOpacity 
                onPress={() => setTenants(Math.max(1, tenants - 1))}
                className="bg-white w-8 h-8 rounded-full items-center justify-center shadow-sm"
              >
                <Ionicons name="remove" size={20} color="black" />
              </TouchableOpacity>
              <Text className="font-black text-lg">{tenants}</Text>
              <TouchableOpacity 
                onPress={() => setTenants(tenants + 1)}
                className="bg-white w-8 h-8 rounded-full items-center justify-center shadow-sm"
              >
                <Ionicons name="add" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <Text className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setCategory(cat)} className={`mr-2 px-5 py-2.5 rounded-xl ${category === cat ? 'bg-secondary' : 'bg-gray-100'}`}>
                <Text className={`text-[11px] font-bold ${category === cat ? 'text-white' : 'text-gray-500'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Furniture */}
          <Text className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">Furniture</Text>
          <View className="flex-row mb-6">
            {FURNITURE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt} onPress={() => setFurniture(prev => prev.includes(opt) ? prev.filter(i => i !== opt) : [...prev, opt])} className={`mr-2 px-5 py-2.5 rounded-xl ${furniture.includes(opt) ? 'bg-[#228B22]' : 'bg-gray-100'}`}>
                <Text className={`text-[11px] font-bold ${furniture.includes(opt) ? 'text-white' : 'text-gray-500'}`}>{opt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setFurniture([])} className={`px-5 py-2.5 rounded-xl ${furniture.length === 0 ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <Text className={`text-[11px] font-bold ${furniture.length === 0 ? 'text-white' : 'text-gray-500'}`}>None</Text>
            </TouchableOpacity>
          </View>

          {/* Toggles */}
          <ToggleRow label="Prepaid Electricity" value={electricity === 'Prepaid'} onValueChange={(v) => setElectricity(v ? 'Prepaid' : 'Postpaid')} icon="flash" color="#eab308" />
          <ToggleRow label="Water Available" value={water} onValueChange={setWater} icon="water" color="#3b82f6" />
          <ToggleRow label="Fenced Compound" value={fenced} onValueChange={setFenced} icon="shield-checkmark" color="#16a34a" />
          <ToggleRow label="Gated House" value={gated} onValueChange={setGated} icon="lock-closed" color="#6366f1" />

          <View className="h-20" />
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
    <Switch 
      value={value} 
      onValueChange={onValueChange} 
      trackColor={{ false: "#eee", true: "#EAA535" }} 
    />
  </View>
);