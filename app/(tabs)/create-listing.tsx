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

// --- CLEAN NATIONWIDE SHORT-DATASET ---
// --- CLEAN NATIONWIDE SHORT-DATASET ---
// Grouped by State, keeping display labels short for Listing Cards
const shortLocationsData: { [key: string]: string[] } = {
  "Ogun (Abeokuta & environments)": [
    "Abiola Way", "Accord", "Adatan", "Adigbe", "Agboba", "Agbede", "Ake", "Akinolugbade", 
    "Alabata", "Asero", "Brewery", "Camp", "Elite", "Elega", "Eleweran", "Harmony", 
    "Ibara", "Idi-Aba", "Ijemo", "Imo", "Isale-Igbein", "Isolu", "Ita-Eko", "Ita-Oshin", 
    "Itoku", "Itoko", "Itori", "Iyana-Mortuary", "Iyana-Oloke", "Kofesu", "Kotopo", "Kuto", 
    "Lafenwa", "Lantoro", "Leme", "Obada", "Obantoko", "Odo-Eran", "Ojere", "Olomoore", 
    "Omida", "Onikolobo", "Osiele", "Panseke", "Quarry", "Sapon", "Sokori", "Tarmac", "Totoro", "Sagamu"
  ],
  "Ijebu": [ 
    "Ijebu-Ode", "Ijebu-Igbo", "Ago-Iwoye", "Iperu-Remo", "Isara-Remo"
  ],
  "Yewa": [
    "Ilaro", "sayedero", "Oja Odan", "Idiroko", "Igbesa", "Yewa"
  ],
  "Ogun (Industrial & Lagos Borders)": [
    "Ogijo", "Ota", "Sango", "Joju", "Agbara", "Mowe", "Ibafo", "Berger"
  ],
  "Lagos": [
    "Ikeja", "Lekki Phase 1", "Yaba", "Surulere", "V.I", "Ikoyi", 
    "Ajah", "Gbagada", "Maryland", "Ojota", "Festac", "Ikorodu", "Egbeda", "Oshodi", "Lasu Area"
  ],
  "Oyo": [
    "Ibadan", "Bodija", "Oluyole", "Challenge", "Akobo", "Samonda", "Ogbomoso", "Oyo Town", "Iwo Road"
  ],
  "Osun": [
    "Ile-Ife", "Osogbo", "Ede", "Ilesa"
  ],
  "Kwara": [
    "Ilorin", "Tanke", "Fate", "Gaa Odota", "Malete"
  ],
  "FCT (Abuja)": [
    "Garki", "Wuse", "Maitama", "Asokoro", "Gwarinpa", "Apo", "Kubwa", "Lugbe", "Utako"
  ],
  "Edo": [
    "Benin City", "Ekpoma"
  ],
  "Delta": [
    "Asaba", "Warri", "Abraka"
  ],
  "Anambra": [
    "Awka", "Onitsha", "Nnewi"
  ],
  "Enugu": [
    "Enugu City", "Nsukka"
  ],
  "Rivers": [
    "Port Harcourt (Uniport Area)", "Port Harcourt (GRA)", "Port Harcourt (Choba)"
  ],
  "Kaduna": [
    "Kaduna North", "Kaduna South", "Zaria"
  ],
  "Kano": [
    "Kano City", "Sabon Gari", "Nassarawa"
  ],
  "Abia": [
    "Aba", "Umuahia", "Uturu"
  ],
  "Adamawa": [
    "Yola", "Mubi", "Jimeta"
  ],
  "Akwa Ibom": [
    "Uyo", "Eket", "Ikot Ekpene"
  ],
  "Bauchi": [
    "Bauchi City", "Azare", "Misau"
  ],
  "Bayelsa": [
    "Yenagoa", "Amassoma", "Ogbia"
  ],
  "Benue": [
    "Makurdi", "Gboko", "Otukpo"
  ],
  "Borno": [
    "Maiduguri", "Biu", "Bama"
  ],
  "Cross River": [
    "Calabar", "Ogoja", "Ikom"
  ],
  "Ebonyi": [
    "Abakaliki", "Afikpo"
  ],
  "Ekiti": [
    "Ado-Ekiti", "Ikole-Ekiti", "Oye-Ekiti"
  ],
  "Gombe": [
    "Gombe City", "Kaltungo", "Dukku"
  ],
  "Imo": [
    "Owerri", "Orlu", "Okigwe"
  ],
  "Jigawa": [
    "Dutse", "Hadejia", "Kazaure"
  ],
  "Kebbi": [
    "Birnin Kebbi", "Argungu", "Yauri"
  ],
  "Kogi": [
    "Lokoja", "Anyigba", "Okene"
  ],
  "Katsina": [
    "Katsina City", "Daura", "Funtua"
  ],
  "Nasara": [
    "Lafia", "Keffi", "Karu"
  ],
  "Niger": [
    "Minna", "Suleja", "Bida", "Kontagora"
  ],
  "Ondo": [
    "Akure", "Ondo Town", "Okitipupa", "Ikare-Akoko"
  ],
  "Plateau": [
    "Jos", "Bukuru", "Pankshin"
  ],
  "Sokoto": [
    "Sokoto City", "Wamako", "Tambuwal"
  ],
  "Taraba": [
    "Jalingo", "Wukari", "Bali"
  ],
  "Yobe": [
    "Damaturu", "Potiskum", "Gashua"
  ],
  "Zamfara": [
    "Gusau", "Kaura Namoda", "Talata Mafara"
  ]
};

// Clean generation helper logic
const targetMarketAreas = Object.keys(shortLocationsData).reduce((acc: string[], state) => {
  const formattedAreas = shortLocationsData[state].map(area => {
    // Treat explicit sub-Ogun keys cleanly
    if (state.startsWith("Ogun") || state === "Ijebu" || state === "Yewa") {
      return area.includes("(") ? area : `${area} (Ogun)`;
    }
    return area.includes("(") ? area : `${area} (${state})`;
  });
  return [...acc, ...formattedAreas];
}, []).sort();


export default function CreateListing() {
  const router = useRouter();
  const { editId } = useLocalSearchParams();
  const isEditMode = !!editId;

  // --- Form States ---
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [condition, setCondition] = useState("New");
  const [locationSearch, setLocationSearch] = useState('');

  // --- UI/Data States ---
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(isEditMode); 
  const [uploading, setUploading] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const isOffline = useListingsStore((state) => state.isOffline);
  const currentCategory = categories.find(c => c.slug === selectedCategory);

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchExistingListing();
    }
  }, [editId]);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data) setCategories(data);
  }

  async function fetchExistingListing() {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setPrice(data.price.toString());
        
        const cleanDesc = data.description?.startsWith('[URGENT]') 
          ? data.description.replace('[URGENT] ', '') 
          : data.description;
          
        setDescription(cleanDesc || '');
        setIsUrgent(data.description?.includes('[URGENT]') || false);
        setLocation(data.location || '');
        setCondition(data.condition || 'New');
        setSelectedCategory(data.category);
        
        if (data.images && Array.isArray(data.images)) {
          setImages(data.images);
        }
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert("Error", "Could not load listing details");
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
      aspect: [5, 6],
      quality: 0.9, 
    });

    if (!result.canceled) {
      try {
        const processed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
        );
        setImages((prev) => [...prev, processed.uri]);
      } catch (error) {
        console.error("Image Processing Error:", error);
        Alert.alert("Error", "Could not process image.");
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setDescription('');
    setLocation('');
    setIsUrgent(false);
    setImages([]);
    setCondition("New");
    setSelectedCategory(null);
  };

  const handlePostListing = async () => {
    if (!title || !price || images.length === 0) {
      Alert.alert('Missing Fields', 'Title, price, and at least one photo are required.');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error("Could not verify profile status.");

      if (!profile?.avatar_url || profile.avatar_url.includes('profile.jpg')) {
        setUploading(false);
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

      const uploadedUrls = await Promise.all(
        images.map(async (uri) => {
          if (uri.startsWith('http')) return uri;

          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
          const response = await fetch(uri);
          const arrayBuffer = await response.arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('listing-images')
            .upload(fileName, arrayBuffer, { contentType: 'image/webp' });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('listing-images').getPublicUrl(fileName);
          return data.publicUrl;
        })
      );

      const listingData = {
        user_id: user.id,
        title: title,
        price: parseFloat(price.replace(/[^0-9.]/g, '')),
        images: uploadedUrls,
        category: selectedCategory,
        description: isUrgent ? `[URGENT] ${description}` : description,
        location: location,
        condition: condition,
        updated_at: new Date()
      };

      if (isEditMode) {
        const { error: dbError } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', editId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('listings')
          .insert([{ ...listingData, is_sold: false, verified: false }]);
        if (dbError) throw dbError;
      }

      Toast.show({
        type: 'success',
        text1: isEditMode ? 'Listing Updated' : 'Item successfully listed',
      });
      resetForm();

      router.replace('/(tabs)');
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

  // --- FILTERS APPLIED SAFELY HERE ---
  const filteredLocations = targetMarketAreas.filter(loc => 
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <View className="flex-1 bg-white">
      {/* FIXED HEADER */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 55 }}
        className="px-4 pb-4 flex-row justify-between items-center bg-white border-b border-gray-50 shadow-sm z-10"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>
        
        <Text className="text-lg font-black text-gray-900">
          {isEditMode ? "Edit Listing" : "List Item for Sale"}
        </Text>
        
        <TouchableOpacity onPress={handlePostListing} disabled={uploading || isOffline} className="p-1">
          {uploading ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <Text className="text-secondary font-bold text-base">
              {isEditMode ? "Update" : "Publish"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-6">
          {/* Photos Section */}
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-6">Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-8 px-6">
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImage}
                className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl items-center justify-center mr-3"
              >
                <View className="items-center">
                  <Text className="text-3xl text-gray-300">+</Text>
                  <Text className="text-[10px] font-bold text-gray-400 mt-1">Add Photo</Text>
                </View>
              </TouchableOpacity>
            )}

            {images.map((uri, index) => (
              <View key={index} className="w-32 h-32 mr-3 relative">
                <Image source={{ uri }} className="w-full h-full rounded-3xl border border-gray-100" />
                <TouchableOpacity 
                  onPress={() => setImages(images.filter((_, i) => i !== index))}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 items-center justify-center border-2 border-white"
                >
                  <Ionicons name="close" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Form Fields */}
          <View className="px-6">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Item Details</Text>
            <View className="space-y-4">
              <TextInput 
                placeholder="What are you selling?"
                value={title}
                onChangeText={setTitle}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 mb-4"
                placeholderTextColor="#9CA3AF"
              />

              <View className="mb-4">
                <Text className="text-gray-500 font-semibold mb-2 ml-1">Price (₦)</Text>
                <TextInput 
                  placeholder="5,000"
                  placeholderTextColor="#9CA3AF"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800"
                />
              </View>

              {/* Location Dropdown */}
              <View className="mb-4">
                <Text className="text-gray-500 font-semibold mb-2 ml-1">Location</Text>
                <View className="bg-gray-50 rounded-2xl border border-gray-100">
                  <TouchableOpacity 
                    onPress={() => {
                      setIsLocationOpen(!isLocationOpen);
                      setLocationSearch("");
                    }}
                    className="p-4 flex-row justify-between items-center bg-white rounded-2xl"
                  >
                    <Text className={location ? "text-gray-800" : "text-gray-400"}>
                      {location || "Select Location"}
                    </Text>
                    <Ionicons name={isLocationOpen ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                  </TouchableOpacity>

                  {isLocationOpen && (
                    <View className="border-t border-gray-100">
                      <View className="flex-row items-center px-4 bg-primary border-b border-gray-100">
                        <Ionicons name="search" size={14} color="#ffffff" />
                        <TextInput
                          placeholder="Search state, city or campus area..."
                          placeholderTextColor="#ffffff"
                          className="flex-1 p-2 text-white h-15"
                          value={locationSearch}
                          onChangeText={setLocationSearch}
                          autoFocus={true}
                        />
                      </View>

                      <View className="max-h-60">
                        <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                          {filteredLocations.map((loc) => (
                            <TouchableOpacity
                              key={loc}
                              onPress={() => { 
                                setLocation(loc); 
                                setIsLocationOpen(false); 
                              }}
                              className={`p-4 border-b border-gray-50 ${location === loc ? 'bg-green-50' : ''}`}
                            >
                              <Text className={location === loc ? 'text-green-700 font-bold' : 'text-gray-600'}>
                                {loc}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          
                          {filteredLocations.length === 0 && (
                            <View className="p-4 items-center">
                              <Text className="text-gray-400">Area not supported yet</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Category Dropdown */}
              <View className="mb-4">
                <Text className="text-gray-500 font-semibold mb-2 ml-1">Category</Text>
                <View className="bg-gray-50 rounded-2xl border border-gray-100">
                  <TouchableOpacity 
                    onPress={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="p-4 flex-row justify-between items-center bg-white rounded-2xl"
                  >
                    <Text className={selectedCategory ? "text-gray-800" : "text-gray-400"}>
                      {currentCategory ? currentCategory.name : "Select"}
                    </Text>
                    <Ionicons name={isCategoryOpen ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                  {isCategoryOpen && (
                    <View className="border-t border-gray-100 max-h-40">
                      <ScrollView nestedScrollEnabled={true}>
                        {categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.slug}
                            onPress={() => { setSelectedCategory(cat.slug); setIsCategoryOpen(false); }}
                            className={`p-4 border-b border-gray-50 ${selectedCategory === cat.slug ? 'bg-green-50' : ''}`}
                          >
                            <Text className={selectedCategory === cat.slug ? 'text-green-700 font-bold' : 'text-gray-600'}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <TextInput 
                placeholder="Description (Condition, details, etc.)"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 h-32 mb-4"
              />
            </View>

            {/* Switch for Urgent */}
            <View className="flex-row items-center justify-between bg-green-50 p-4 rounded-2xl mt-4 border border-green-100">
              <View className="flex-1 pr-4">
                <Text className="text-green-800 font-bold">Urgent Sale?</Text>
                <Text className="text-green-600 text-xs">Adds a "Quick Sale" badge to your item.</Text>
              </View>
              <Switch 
                value={isUrgent} 
                onValueChange={setIsUrgent}
                trackColor={{ false: "#d1d5db", true: "#16a34a" }}
              />
            </View>

            {/* Condition Selection */}
            <Text className="text-gray-500 font-semibold mb-2 mt-6 ml-1">Item Condition</Text>
            <View className="space-y-3 pb-10">
              {["New", "Neatly Used", "Fairly Used"].map((c) => (
                <TouchableOpacity key={c} onPress={() => setCondition(c)} className="flex-row items-center py-2">
                  <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 ${condition === c ? 'border-green-600' : 'border-gray-400'}`}>
                    {condition === c && <View className="w-3 h-3 rounded-full bg-green-600" />}
                  </View>
                  <Text className={condition === c ? 'text-green-700 font-bold' : 'text-gray-600'}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}