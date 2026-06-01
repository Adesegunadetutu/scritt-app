import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '@/lib/supabase';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  
  // Selection Logic
  const [selectedSection, setSelectedSection] = useState<'name' | 'password'>('name');

  // Password States
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getInitialData();
  }, []);

  const getInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (data) setFullName(data.full_name);
    }
  };

  const handleGlobalSave = async () => {
  if (loading) return;
  setLoading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user found");

    if (selectedSection === 'name') {
      // 1. Update Profile Table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update Auth
      await supabase.auth.updateUser({ 
        data: { full_name: fullName.trim() } 
      });

    } else {
      // Password logic
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
    }

    // SUCCESS: Instead of an Alert, navigate immediately
    console.log("Navigation triggered...");
    router.replace('/profile'); // Use your actual profile route path here

  } catch (error: any) {
    console.error("Save Error:", error.message);
    Alert.alert("Error", error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* HEADER ROW */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={26} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-gray-900">Edit Profile</Text>
        </View>

        <TouchableOpacity 
          onPress={handleGlobalSave}
          disabled={loading}
          className="bg-[#005D14] px-5 py-2 rounded-full"
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: NAME */}
        <TouchableOpacity 
          onPress={() => setSelectedSection('name')}
          activeOpacity={1}
          className={`p-5 rounded-3xl border-2 mb-6 ${selectedSection === 'name' ? 'border-[#005D14] bg-white' : 'border-transparent bg-gray-100/50'}`}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-gray-800">Update Display Name</Text>
            <Ionicons 
              name={selectedSection === 'name' ? "radio-button-on" : "radio-button-off"} 
              size={22} 
              color={selectedSection === 'name' ? "#005D14" : "#9ca3af"} 
            />
          </View>
          <TextInput
            className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900"
            placeholder="Your Full Name"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
            editable={selectedSection === 'name'}
          />
        </TouchableOpacity>

        {/* SECTION 2: PASSWORD */}
        <TouchableOpacity 
          onPress={() => setSelectedSection('password')}
          activeOpacity={1}
          className={`p-5 rounded-3xl border-2 ${selectedSection === 'password' ? 'border-[#EFA33E] bg-white' : 'border-transparent bg-gray-100/50'}`}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-gray-800">Change Password</Text>
            <Ionicons 
              name={selectedSection === 'password' ? "radio-button-on" : "radio-button-off"} 
              size={22} 
              color={selectedSection === 'password' ? "#EFA33E" : "#9ca3af"} 
            />
          </View>

          <View className={selectedSection === 'password' ? "opacity-100" : "opacity-40"}>
            <View className="relative mb-4">
              <TextInput
                className="bg-gray-50 p-4 rounded-xl border border-gray-200 pr-12"
                placeholder="New Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={selectedSection === 'password'}
              />
              <TouchableOpacity 
                style={{ position: 'absolute', right: 15, top: 18 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="bg-gray-50 p-4 rounded-xl border border-gray-200"
              placeholder="Confirm New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={selectedSection === 'password'}
            />
          </View>
        </TouchableOpacity>

        <Text className="text-center text-gray-400 mt-8 text-xs px-10">
          Select a section to enable editing, then tap Save at the top.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}