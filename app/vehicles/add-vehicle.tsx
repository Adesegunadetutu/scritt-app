import React, { useEffect, useState } from 'react';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, 
  Switch, Image, Alert, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { Ionicons } from "@expo/vector-icons";
import Toast from 'react-native-toast-message';
import * as ImageManipulator from 'expo-image-manipulator';
import { useListingsStore } from '@/stores/useListingsStore';

export default function AddVehicle() {
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const isEditMode = !!editId;

  // --- Form States ---
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [vinChassis, setVinChassis] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('tokunbo'); // 'tokunbo', 'locally_used', 'brand_new'
  const [transmission, setTransmission] = useState('automatic'); // 'automatic', 'manual'
  const [location, setLocation] = useState('');
const [bodyColor, setBodyColor] = useState('black'); // default selection

// Popular Nigerian market car colors for quick tap selection
const carColors = [
  { name: 'Black', hex: '#000000' },
  { name: 'Silver', hex: '#cbd5e1' },
  { name: 'White', hex: '#ffffff', border: '#e2e8f0' },
  { name: 'Gray', hex: '#64748b' },
  { name: 'Blue', hex: '#1d4ed8' },
  { name: 'Red', hex: '#b91c1c' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Green', hex: '#005d14' },
];
  
  // --- High-Conversion Market Badges ---
  const [isFirstBody, setIsFirstBody] = useState(false);
  const [isAcChilling, setIsAcChilling] = useState(false);
  const [engineNeverOpened, setEngineNeverOpened] = useState(false);
  
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(isEditMode); 
  const [uploading, setUploading] = useState(false);
  const isOffline = useListingsStore((state) => state.isOffline);

  useEffect(() => {
    if (isEditMode) {
      fetchExistingVehicle();
    }
  }, [editId]);

  async function fetchExistingVehicle() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) throw error;
      if (data) {
        setMake(data.make);
        setModel(data.model);
        setYear(data.year_of_manufacture.toString());
        setPrice(data.price.toString());
        setMileage(data.mileage_km.toString());
        setVinChassis(data.vin_chassis || '');
        setDescription(data.description || '');
        setCondition(data.condition);
        setTransmission(data.transmission);
        setIsFirstBody(data.is_first_body);
        setIsAcChilling(data.is_ac_chilling);
        setEngineNeverOpened(data.engine_never_opened);
        setLocation(data.location || '');
        setBodyColor(data.body_color || 'not set');
        if (data.image_urls && Array.isArray(data.image_urls)) {
          setImageUrls(data.image_urls);
        }
      }
    } catch (err) {
      console.error("Fetch Vehicle Error:", err);
      Alert.alert("Error", "Could not load vehicle details.");
    } finally {
      setLoadingData(false);
    }
  }

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow camera roll access to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8, 
    });

    if (!result.canceled) {
      try {
        const processed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
        );
        setImageUrls((prev) => [...prev, processed.uri]);
      } catch (error) {
        console.error("Image Processing Error:", error);
        Alert.alert("Error", "Could not process image.");
      }
    }
  };

  const handlePublishVehicle = async () => {
    if (!make || !model || !year || !price || !location || !bodyColor || imageUrls.length === 0) {
  Alert.alert('Missing Fields', 'All fields including location and body color are required.');
  return;
}

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      // Check for profile status/avatar requirement matching your marketplace logic
     // const { data: profile } = await supabase
       // .from('profiles')
        //.select('avatar_url, role')
        //.eq('id', user.id)
       // .single();

      //if (profile?.role !== 'car_dealer') {
       // throw new Error("Only verified Car Dealers can post listings.");
      //}

      // Process and upload images directly to folder matching the user's ID
      const uploadedStorageUrls = await Promise.all(
        imageUrls.map(async (uri) => {
          if (uri.startsWith('http')) return uri;

          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
          const response = await fetch(uri);
          const arrayBuffer = await response.arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('vehicle-listings')
            .upload(fileName, arrayBuffer, { contentType: 'image/webp' });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('vehicle-listings').getPublicUrl(fileName);
          return data.publicUrl;
        })
      );

      const vehicleData = {
        user_id: user.id,
        make: make.trim(),
        model: model.trim(),
        year_of_manufacture: parseInt(year),
        price: parseFloat(price.replace(/[^0-9.]/g, '')),
        mileage_km: mileage ? parseInt(mileage.replace(/[^0-9]/g, '')) : 0,
        vin_chassis: vinChassis.trim() || null,
        description: description.trim(),
        condition: condition,
        transmission: transmission,
        is_first_body: isFirstBody,
        is_ac_chilling: isAcChilling,
        location: location.trim(),
        body_color: bodyColor,
        engine_never_opened: engineNeverOpened,
        image_urls: uploadedStorageUrls,
        updated_at: new Date()
      };

      if (isEditMode) {
        const { error: dbError } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('vehicles')
          .insert([vehicleData]);
        if (dbError) throw dbError;
      }

      Toast.show({
        type: 'success',
        text1: isEditMode ? 'Listing Updated' : 'Vehicle successfully listed',
      });
      
      router.back();
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: err.message,
      });
    } finally {
      setUploading(false);
    }
  };

  if (loadingData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 55 }}
        className="px-4 pb-4 flex-row justify-between items-center bg-white border-b border-gray-50 shadow-sm z-10"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={24} color="#4b5563" />
        </TouchableOpacity>
        
        <Text className="text-lg font-black text-gray-900">
          {isEditMode ? "Edit Vehicle Info" : "List a Vehicle"}
        </Text>
        
        <TouchableOpacity onPress={handlePublishVehicle} disabled={uploading || isOffline} className="p-1">
          {uploading ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <Text className="text-secondary font-bold text-base">
              {isEditMode ? "Update" : "Publish"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View className="pt-6">
          {/* Photos Upload Array */}
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-6">Vehicle Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6 px-6">
            {imageUrls.length < 10 && (
              <TouchableOpacity
                onPress={pickImage}
                className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl items-center justify-center mr-3"
              >
                <View className="items-center">
                  <Ionicons name="car-sport-outline" size={28} color="#cbd5e1" />
                  <Text className="text-[10px] font-bold text-gray-400 mt-1">Add Image</Text>
                </View>
              </TouchableOpacity>
            )}

            {imageUrls.map((uri, index) => (
              <View key={index} className="w-32 h-32 mr-3 relative">
                <Image source={{ uri }} className="w-full h-full rounded-3xl border border-gray-100" />
                <TouchableOpacity 
                  onPress={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 items-center justify-center border-2 border-white"
                >
                  <Ionicons name="close" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Core Specs Inputs */}
          <View className="px-6 space-y-4">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Core Specifications</Text>
            
            <TextInput 
              placeholder="Brand/Make (e.g. Toyota)"
              value={make}
              onChangeText={setMake}
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 mb-3"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput 
              placeholder="Model Variant (e.g. Camry)"
              value={model}
              onChangeText={setModel}
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 mb-3"
              placeholderTextColor="#9CA3AF"
            />

            <View className="flex-row space-x-3 mb-3">
              <TextInput 
                placeholder="Year (e.g. 2018)"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                maxLength={4}
                className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 mr-2"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput 
                placeholder="Mileage (KM)"
                value={mileage}
                onChangeText={setMileage}
                keyboardType="numeric"
                className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-3">
              <Text className="text-gray-500 font-semibold mb-2 ml-1">Price (₦)</Text>
              <TextInput 
                placeholder="Price (e.g. 7,500,000)"
                placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800"
              />
            </View>

                        {/* 📍 Location Input */}
            <View className="mb-3">
              <Text className="text-gray-500 font-semibold mb-2 ml-1">Location</Text>
              <TextInput 
                placeholder="e.g. Abeokuta, Ilaro, Lagos"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800"
              />
            </View>

            {/* 🎨 Modern Color Picker Array */}
            <View className="mb-4">
              <Text className="text-gray-500 font-semibold mb-2 ml-1">Exterior/Body Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                {carColors.map((color) => {
                  const isSelected = bodyColor === color.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={color.name}
                      onPress={() => setBodyColor(color.name.toLowerCase())}
                      style={{ 
                        backgroundColor: color.hex, 
                        borderColor: isSelected ? '#16a34a' : (color.border || 'transparent'),
                        borderWidth: isSelected ? 3 : 1
                      }}
                      className={`w-8 h-8 rounded-full mr-3 items-center justify-center shadow-sm ${isSelected ? 'scale-110' : 'opacity-80'}`}
                    >
                      {isSelected && (
                        <Ionicons 
                          name="checkmark" 
                          size={18} 
                          color={color.name === 'White' || color.name === 'Silver' ? '#000000' : '#ffffff'} 
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text className="text-xs text-gray-400 mt-2 ml-1 capitalize">Selected: {bodyColor}</Text>
            </View>

            <TextInput 
              placeholder="VIN / Chassis Number (Optional)"
              value={vinChassis}
              onChangeText={setVinChassis}
              maxLength={17}
              autoCapitalize="characters"
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 mb-3"
              placeholderTextColor="#9CA3AF"
            />

            {/* Condition Check Options */}
            <Text className="text-gray-500 font-semibold mt-4 mb-2 ml-1">Condition</Text>
            <View className="flex-row justify-between mb-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              {[
                { slug: 'tokunbo', label: 'Tokunbo' },
                { slug: 'locally_used', label: 'Locally Used' },
                { slug: 'brand_new', label: 'Brand New' }
              ].map((c) => (
                <TouchableOpacity 
                  key={c.slug} 
                  onPress={() => setCondition(c.slug)}
                  className={`flex-1 py-3 items-center rounded-xl ${condition === c.slug ? 'bg-primary' : ''}`}
                >
                  <Text className={`font-bold ${condition === c.slug ? 'text-white' : 'text-gray-500'}`}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transmission Options */}
            <Text className="text-gray-500 font-semibold mb-2 ml-1">Transmission</Text>
            <View className="flex-row justify-between mb-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              {['automatic', 'manual'].map((t) => (
                <TouchableOpacity 
                  key={t} 
                  onPress={() => setTransmission(t)}
                  className={`flex-1 py-3 items-center rounded-xl ${transmission === t ? 'bg-primary' : ''}`}
                >
                  <Text className={`font-bold capitalize ${transmission === t ? 'text-white' : 'text-gray-500'}`}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Market Trust Multi-Switches */}
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 mb-2">High-Conversion Selling Points</Text>
            
            <View className="space-y-3 bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-200">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-800 font-bold">First Body Paint</Text>
                  <Text className="text-gray-400 text-xs">Factory paint intact, no body filler or respray.</Text>
                </View>
                <Switch value={isFirstBody} onValueChange={setIsFirstBody} trackColor={{ false: "#d1d5db", true: "#16a34a" }} />
              </View>

              <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-800 font-bold">A/C Chilling Perfectly</Text>
                  <Text className="text-gray-400 text-xs">Air conditioner is cooling flawlessly.</Text>
                </View>
                <Switch value={isAcChilling} onValueChange={setIsAcChilling} trackColor={{ false: "#d1d5db", true: "#16a34a" }} />
              </View>

              <View className="flex-row items-center justify-between pt-3">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-800 font-bold">Engine Never Opened</Text>
                  <Text className="text-gray-400 text-xs">Original factory engine seals intact.</Text>
                </View>
                <Switch value={engineNeverOpened} onValueChange={setEngineNeverOpened} trackColor={{ false: "#d1d5db", true: "#16a34a" }} />
              </View>
            </View>

            <TextInput 
              placeholder="Additional Description (Mention mechanical state, issues, or specific custom upgrades...)"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 h-32 mt-4"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}