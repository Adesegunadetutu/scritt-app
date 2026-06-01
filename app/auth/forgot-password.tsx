import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleResetRequest() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Ensure this URL is whitelisted in your Supabase Dashboard
      redirectTo: 'com.adesegunadetutu.scritt://auth/update-password',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Check Your Email',
        'A reset link has been sent to your email address.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
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
        <Text className="text-xl font-bold text-gray-900 mt-6">Reset Password</Text>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1 px-8 -mt-12"
        showsVerticalScrollIndicator={false}
        // Offsets to ensure the bottom button/link stays visible
        bottomOffset={Platform.OS === 'ios' ? 40 : 20}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-[#EFA33E] rounded-[30px] p-6 shadow-xl">
          <Text className="text-center text-gray-800 text-[13px] mb-6 px-2 leading-5">
            Enter your registered email below to receive password reset instructions.
          </Text>

          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-8">
            <Ionicons name="mail" size={20} color="#005D14" />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          <TouchableOpacity 
            onPress={handleResetRequest}
            disabled={loading}
            className="bg-[#005D14] py-3 rounded-xl items-center shadow-md"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} className="mt-8">
            <Text className="text-center text-sm text-gray-800">
              Remembered? <Text className="font-bold text-[#005D14]">Back to Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}