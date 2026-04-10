import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PhoneInput from 'react-native-international-phone-number';
import Checkbox from 'expo-checkbox';
import * as WebBrowser from 'expo-web-browser';
import { useNetworkObserver } from '@/hooks/useNetworkObserver';

export default function SignUp() {
  const { isConnected } = useNetworkObserver(); // 2. Track connection
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    if (!isConnected) {
      Alert.alert('Offline', 'Please connect to the internet to create your account.');
      return;
    }

    if (!hasAccepted) {
      Alert.alert('Terms & Conditions', 'Please accept the terms and conditions to continue.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    // 3. Construct the full international number
    const fullPhoneNumber = `${selectedCountry?.callingCode || ''}${phone.replace(/\s/g, '')}`;

    setLoading(true);
    // We pass fullName to 'options.data' so it's stored in auth.users metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      phone: fullPhoneNumber,
      password,
      options: {
        data: {
          full_name: fullName,
          accepted_terms_at: new Date().toISOString(),
          terms_version: '1.0',
          
        },
      },
    });

    if (error) {
  Alert.alert('Error', error.message);
} else {
  // Instead of an alert, push to the new verification screen
  // We pass the email as a parameter so the user knows where it was sent
  router.replace('/(tabs)');
}
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-primary">
      {/* Top White Section with Slant */}
      <View className="h-[35%] bg-white items-center justify-center pt-10" style={{ borderBottomRightRadius: 100 }}>
        <Image 
          source={require('../../assets/Scritt.png')} 
          style={{ width: 100, height: 50 }} 
          resizeMode="contain" 
        />
        <Text className="text-xl font-bold text-gray-900 mt-4">Create a New Account</Text>
      </View>

      <ScrollView className="flex-1 px-8 -mt-12">
        {/* The Orange Card */}
        <View className="bg-[#EFA33E] rounded-[30px] p-6 shadow-lg">
          
          {/* Full Name Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="person" size={20} color="#005D14" />
            <TextInput
              placeholder="First Name and Last Name"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          {/* Email Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="mail" size={20} color="#005D14" />
            <TextInput
              placeholder="Please Enter Your Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          {/* Phone number Input - Matches your original design exactly */}
<View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
  <Ionicons name="call" size={20} color="#005D14" />
  <View className="flex-1 ml-0">
    <PhoneInput
      value={phone}
      onChangePhoneNumber={setPhone}
      selectedCountry={selectedCountry}
      onChangeSelectedCountry={setSelectedCountry}
      defaultCountry="NG"
      placeholder="phone number"
      phoneInputStyles={{
        container: {
          backgroundColor: 'transparent', // Uses the white from your wrapper
          borderWidth: 0,
          height: 48,
        },
        flagContainer: {
          backgroundColor: 'transparent',
          justifyContent: 'center',
        },

        flag: {
          fontSize: 12, // Reduces the emoji/image size (Standard is usually 24+)
        },

        callingCode: {
          fontSize: 12,
          fontWeight: '400',
          color: '#1F2937',
          marginLeft: -5, // Pulls the code closer to the flag
          marginRight: -10, // Pulls the input field closer to the code
        },
        input: {
          color: '#1F2937',
          fontSize: 16,
        },
        caret: {
          color: '#005D14', // Matches your theme green
        },
      }}
    />
  </View>
</View>

          {/* Password Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="lock-closed" size={20} color="#005D14" />
            <TextInput
              placeholder="Please Choose Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible} // Linked to state
              className="flex-1 h-12 ml-2 text-gray-800"
            />
            {/* The Eye Toggle */}
            <TouchableOpacity 
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              className="p-2"
            >
              <Ionicons 
                name={isPasswordVisible ? "eye-off" : "eye"} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="lock-closed" size={20} color="#005D14" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isPasswordVisible} // Linked to same state
              className="flex-1 h-12 ml-2 text-gray-800"
            />
            {/* Added a spacer to keep the layout aligned with the field above */}
            <View className="w-9" /> 
          </View>

         {/* 5. Add the Checkbox Section here (before the login redirect) */}
        <View className="flex-row items-start mb-6 px-1">
          <Checkbox
            value={hasAccepted}
            onValueChange={setHasAccepted}
            color={hasAccepted ? '#005D14' : '#FFFFFF'}
            style={{ marginTop: 2, borderRadius: 4 }}
          />
          <View className="flex-1 ml-3">
  <Text className="text-[11px] text-gray-800 leading-4">
    I agree to the{' '}
    <Text 
      className="font-bold underline" 
      onPress={() => WebBrowser.openBrowserAsync('https://adesegunadetutu.github.io/legal/terms.html')}
    >
      Terms and Conditions
    </Text>
    {' '}and{' '}
    <Text 
      className="font-bold underline" 
      onPress={() => WebBrowser.openBrowserAsync('https://adesegunadetutu.github.io/legal/privacy.html')}
    >
      Privacy Policy
    </Text>
  </Text>
</View>
        </View>

          {/* Login Redirect */}
          <TouchableOpacity onPress={() => router.push('/auth/signin')} className="mb-8">
            <Text className="text-center text-xs text-gray-800">
              Already have account? <Text className="font-bold text-[#005D14]">Login here</Text>
            </Text>
          </TouchableOpacity>

         {/* Sign Up Button */}
          <TouchableOpacity 
            onPress={handleSignUp}
            // 4. Update disabled logic to include isConnected
            disabled={loading || !hasAccepted || !isConnected}
            className={`py-3 rounded-xl items-center mx-6 shadow-sm ${
              (loading || !hasAccepted || !isConnected) ? 'bg-gray-400' : 'bg-primary'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {!isConnected ? "Sign Up" : "Sign Up"}
              </Text>
            )}
          </TouchableOpacity>

          {/* 5. Helpful Offline Hint */}
        {!isConnected && (
          <View className="mt-4 items-center">
            <Text className="text-white/80 font-medium text-xs">
              Check your connection to register
            </Text>
          </View>
        )}

        </View>
        <View className="h-20" /> {/* Extra spacing at bottom */}
      </ScrollView>
    </View>
  );
}