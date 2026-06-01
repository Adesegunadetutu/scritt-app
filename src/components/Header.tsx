import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from '@/lib/supabase';
import { useRouter } from "expo-router";
import * as Location from 'expo-location'; 

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton }: HeaderProps) {
  const [firstName, setFirstName] = useState("User");
  //const [address, setAddress] = useState("Locating..."); 
  const [loadingLoc, setLoadingLoc] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserName();
    // fetchCurrentLocation(); // Commented out location initialization
  }, []);

  const fetchUserName = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data?.full_name) {
          const name = data.full_name.split(' ')[0]; 
          setFirstName(name);
        }
      }
    } catch (error) {
      console.log("Error fetching name for header:", error);
    }
  };
  

  /* --- LOCATION LOGIC COMMENTED OUT ---
  const fetchCurrentLocation = async () => {
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
  --------------------------------------- */

  return (
    <View className="pt-2 bg-white border-b border-gray-50 pb-2">
      <View className="px-6 flex-row items-center justify-between">
        
        {/* Left Side: Back Button OR Logo */}
        <View className="flex-row items-center">
          {showBackButton ? (
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="chevron-back" size={28} color="#16a34a" />
            </TouchableOpacity>
          ) : (
            <Image
              source={require("../../assets/Scritt.png")}
              style={{ width: 70, height: 35 }}
              resizeMode="contain"
            />
          )}

          {title && (
            <Text className="text-xl font-bold text-gray-900 ml-2">{title}</Text>
          )}
        </View>

       
        {!title && (
  <TouchableOpacity 
    onPress={() => {
      try {
        router.push('/vehicles/vehicles');
      } catch (err) {
        console.warn("Navigation context not ready yet. Retrying on layout load...", err);
      }
    }} 
    activeOpacity={0.8}
    className="flex-row items-center bg-gray-50 border border-gray-100 px-3.5 py-1.5 rounded-full shadow-sm"
  >
    <Ionicons name="car-sport" size={15} color="#005d14" />
    <Text className="ml-1.5 text-primary font-black text-xs uppercase tracking-wider">
      Find Vehicles
    </Text>
  </TouchableOpacity>
)}

        {/* --- COMMENTED OUT LOCATION VIEW ---
        {!title && (
          <TouchableOpacity 
            onPress={fetchCurrentLocation}
            className="flex-row items-center"
          >
            <Ionicons name="location-sharp" size={18} color="#ff0000" />
            {loadingLoc ? (
               <ActivityIndicator size="small" color="#9ca3af" className="ml-1" />
            ) : (
              <Text className="ml-1 text-gray-500 font-medium text-sm" numberOfLines={1}>
                {address}
              </Text>
            )}
          </TouchableOpacity>
        )}
        -------------------------------------- */}
      </View>
    </View>
  );
}