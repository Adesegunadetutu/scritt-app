import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Safety check: Ensure there is a session (from the email link)
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        Alert.alert("Link Expired", "Please request a new link.");
        router.replace('/auth/forgot-password');
      }
    };
    checkSession();
  }, []);

  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    // This updates the currently logged-in user (from the recovery link)
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      Alert.alert('Update Error', error.message);
    } else {
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'Login Now', onPress: () => router.replace('/auth/signin') }
      ]);
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-[#005D14]">
      <View 
        className="h-[40%] bg-white items-center justify-center pt-6" 
        style={{ borderBottomRightRadius: 100 }}
      >
        <Image 
          source={require('../../assets/Scritt.png')} 
          style={{ width: 100, height: 50 }} 
          resizeMode="contain" 
        />
        <Text className="text-xl font-bold text-gray-900 mt-6">New Password</Text>
      </View>

      <ScrollView className="flex-1 px-8 -mt-12">
        <View className="bg-[#EFA33E] rounded-[30px] p-6 shadow-xl">
          
          <Text className="text-center text-gray-800 text-[13px] mb-6 px-2">
            Set a new secure password for your account.
          </Text>

          {/* New Password Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="lock-closed" size={20} color="#005D14" />
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-8">
            <Ionicons name="checkmark-circle" size={20} color="#005D14" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          <TouchableOpacity 
            onPress={handleUpdatePassword}
            disabled={loading}
            className="bg-[#005D14] py-3 rounded-xl items-center shadow-md"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}