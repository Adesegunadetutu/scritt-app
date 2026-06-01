import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PhoneInput from 'react-native-international-phone-number';
import Checkbox from 'expo-checkbox';
import * as WebBrowser from 'expo-web-browser';
import { useNetworkObserver } from '@/hooks/useNetworkObserver';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export default function SignUp() {
  const { isConnected } = useNetworkObserver();
  // 1. Split full name into individual states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

    // 2. Updated validation block
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    // --- ROBUST PHONE VALIDATION ---
    const countryCode = selectedCountry?.cca2 || 'NG';
    const phoneNumberObject = parsePhoneNumberFromString(phone, countryCode);

    if (!phoneNumberObject || !phoneNumberObject.isValid()) {
      Alert.alert(
        'Invalid Phone Number', 
        `The phone number entered is not valid for ${selectedCountry?.name?.en || 'the selected country'}.`
      );
      return;
    }

    const fullPhoneNumber = phoneNumberObject.number; 
    // -------------------------------

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!hasAccepted) {
      Alert.alert('Terms & Conditions', 'Please accept the terms and conditions to continue.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // 3. Passing explicit sub-properties or a combined string down to Supabase metadata
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(), 
          phone: fullPhoneNumber,
          accepted_terms_at: new Date().toISOString(),
          terms_version: '1.0',
        },
      },
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Account created!');
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-primary">
      <View className="h-[35%] bg-white items-center justify-center pt-10" style={{ borderBottomRightRadius: 100 }}>
        <Image 
          source={require('../../assets/Scritt.png')} 
          style={{ width: 100, height: 50 }} 
          resizeMode="contain" 
        />
        <Text className="text-xl font-bold text-gray-900 mt-4">Create a New Account</Text>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1 px-8 -mt-12"
        showsVerticalScrollIndicator={false}
        bottomOffset={Platform.OS === 'ios' ? 40 : 20}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-[#EFA33E] rounded-[30px] p-6 shadow-lg">
          
          {/* 4. Split Input Fields UI */}
          {/* First Name */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="person" size={20} color="#005D14" />
            <TextInput
              placeholder="First Name"
              placeholderTextColor="#9CA3AF"
              value={firstName}
              onChangeText={setFirstName}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          {/* Last Name */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="person" size={20} color="#005D14" />
            <TextInput
              placeholder="Last Name"
              placeholderTextColor="#9CA3AF"
              value={lastName}
              onChangeText={setLastName}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          {/* Email */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="mail" size={20} color="#005D14" />
            <TextInput
              placeholder="Please Enter Your Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          {/* Phone Number */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="call" size={20} color="#005D14" />
            <View className="flex-1">
              <PhoneInput
                value={phone}
                onChangePhoneNumber={setPhone}
                selectedCountry={selectedCountry}
                onChangeSelectedCountry={setSelectedCountry}
                defaultCountry="NG"
                placeholder="phone number"
                phoneInputStyles={{
                  container: { backgroundColor: 'transparent', borderWidth: 0, height: 48 },
                  flagContainer: { backgroundColor: 'transparent', justifyContent: 'center' },
                  callingCode: { fontSize: 14, color: '#1F2937' },
                  input: { color: '#1F2937', fontSize: 16 },
                }}
              />
            </View>
          </View>

          {/* Password */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="lock-closed" size={20} color="#005D14" />
            <TextInput
              placeholder="Please Choose Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} className="p-2">
              <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="lock-closed" size={20} color="#005D14" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isPasswordVisible}
              className="flex-1 h-12 ml-2 text-gray-800"
            />
          </View>

          {/* Checkbox */}
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
                >Terms and Conditions</Text>
                {' '}and{' '}
                <Text 
                  className="font-bold underline" 
                  onPress={() => WebBrowser.openBrowserAsync('https://adesegunadetutu.github.io/legal/privacy.html')}
                >Privacy Policy</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/auth/signin')} className="mb-8">
            <Text className="text-center text-xs text-gray-800">
              Already have account? <Text className="font-bold text-[#005D14]">Login here</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSignUp}
            disabled={loading || !hasAccepted || !isConnected}
            className={`py-3 rounded-xl items-center mx-6 shadow-sm ${
              (loading || !hasAccepted || !isConnected) ? 'bg-gray-400' : 'bg-primary'
            }`}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Sign Up</Text>}
          </TouchableOpacity>
        </View>
        <View className="h-20" /> 
      </KeyboardAwareScrollView>
    </View>
  );
}