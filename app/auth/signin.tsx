import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkObserver } from '@/hooks/useNetworkObserver'; 

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const { isConnected } = useNetworkObserver(); // 2. Get connection status
  const router = useRouter();

  async function handleSignIn() {
    // 3. Prevent action if offline
    if (!isConnected) {
      Alert.alert(
        'No Connection', 
        'You need an internet connection to log in. Please check your network and try again.'
      );
      return;
    }

    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert('Login Error', error.message);
    } else {
      router.replace('/(tabs)'); 
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-primary">
      {/* Top White Section with Design Cut */}
      <View 
        className="h-[40%] bg-white items-center justify-center pt-6" 
        style={{ borderBottomRightRadius: 100 }}
      >
        <Image 
          source={require('../../assets/Scritt.png')} 
          style={{ width: 100, height: 50 }} 
          resizeMode="contain" 
        />
        <Text className="text-xl font-bold text-gray-900 mt-6">Welcome Back</Text>
      </View>

      <ScrollView className="flex-1 px-8 -mt-12" showsVerticalScrollIndicator={false}>
        {/* The Orange Card Container */}
        <View className="bg-secondary rounded-[30px] p-6 shadow-xl">
          
          {/* Email Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mt-4 mb-4">
            <Ionicons name="mail" size={20} color="#005D14" />
            <TextInput
              placeholder="Please Enter Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              className="flex-1 h-11 ml-2 text-gray-800"
            />
          </View>

          {/* Password Input */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-1 mb-4">
            <Ionicons name="lock-closed" size={20} color="#005D14" />
            <TextInput
              placeholder="Please Enter Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible} 
              className="flex-1 h-12 ml-2 text-gray-800"
              placeholderTextColor="#9CA3AF"
            />
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

          {/* Remember & Forgot Password Row */}
          <View className="flex-row justify-between items-center mb-10 px-1">
            <TouchableOpacity 
              onPress={() => setRememberMe(!rememberMe)} 
              className="flex-row items-center"
            >
              <View className={`w-4 h-4 rounded border border-gray-600 mr-2 items-center justify-center ${rememberMe ? 'bg-[#005D14]' : 'bg-white'}`}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <Text className="text-[10px] text-gray-800">Remember Password</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
              <Text className="text-[10px] text-primary">Forgot Password</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            onPress={handleSignIn}
            disabled={loading || !isConnected} // 4. Disable if offline
            className={`py-2 rounded-lg items-center mx-10 shadow-md ${!isConnected ? 'bg-gray-400' : 'bg-[#005D14]'}`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-black text-lg">
                {!isConnected ? "Offline" : "Login"}
              </Text>
            )}
          </TouchableOpacity>

          {/* New User Link */}
          <TouchableOpacity 
            onPress={() => router.push('/auth/signup')} 
            className="mt-12 mb-4"
          >
            <Text className="text-center text-sm text-gray-800">
              Are you a new user? <Text className="font-bold text-[#005D14]">signup here</Text>
            </Text>
          </TouchableOpacity>

        </View>
        
        {/* Offline Warning Banner */}
        {!isConnected && (
          <View className="mt-4 items-center">
            <Text className="text-white font-bold text-xs bg-red-600/20 px-3 py-1 rounded-full">
              Connect to the internet to sign in
            </Text>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}