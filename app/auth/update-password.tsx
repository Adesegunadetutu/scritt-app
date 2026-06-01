import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking'; // 1. Import Linking

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const initRecoverySession = async () => {
  try {
    const url = await Linking.getInitialURL();
    
    if (url) {
      const { queryParams } = Linking.parse(url);
      
      // Use URLSearchParams for a cleaner, error-free parse
      const urlParts = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
      const parsedHash = new URLSearchParams(urlParts);

      // Use optional chaining (?.) to handle the "possibly null" warning
        const access_token = queryParams?.access_token || parsedHash.get('access_token');
        const refresh_token = queryParams?.refresh_token || parsedHash.get('refresh_token');

        if (access_token && refresh_token) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: String(access_token), // Cast to string to satisfy Supabase types
            refresh_token: String(refresh_token),
          });

          if (setSessionError) console.log('SetSession Error:', setSessionError.message);
        }
    }

        // 5. Verify the session is now active
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.log('Session check error:', error.message);
          return;
        }

        if (data?.session) {
          console.log('✅ Recovery session found and verified');
          setSessionReady(true);
        } else {
          console.log('❌ No session found');
          Alert.alert(
            'Invalid Link',
            'Password reset session not found. Please request a new link.',
            [
              {
                text: 'Go to Login',
                onPress: () => router.replace('/auth/signin'),
              },
            ]
          );
        }
      } catch (e) {
        console.log('Deep link parsing failed', e);
      }
    };

    initRecoverySession();
    
    // 6. Handle cases where app is already open in background (Warm Start)
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) initRecoverySession();
    });

    return () => subscription.remove();
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

    if (!sessionReady) {
      Alert.alert('Error', 'Recovery session not ready yet. Please wait.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        Alert.alert(
          'Session Expired',
          'Your reset session is no longer valid. Please request a new link.',
          [
            {
              text: 'Go to Login',
              onPress: () => router.replace('/auth/signin'),
            },
          ]
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      // Inside handleUpdatePassword in UpdatePassword.tsx
        if (error) {
          Alert.alert('Update Error', error.message);
          return;
        }

        // SUCCESS! 
        // Clear the session so the user has to sign in with their NEW password
        await supabase.auth.signOut(); 

        Alert.alert('Success', 'Your password has been updated. Please log in.', [
          {
            text: 'Login Now',
            onPress: () => router.replace('/auth/signin'),
          },
        ]);
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#005D14]">
      {/* HEADER */}
      <View
        className="h-[40%] bg-white items-center justify-center pt-6"
        style={{ borderBottomRightRadius: 100 }}
      >
        <Image
          source={require('../../assets/Scritt.png')}
          style={{ width: 100, height: 50 }}
          resizeMode="contain"
        />
        <Text className="text-xl font-bold text-gray-900 mt-6">
          New Password
        </Text>
      </View>

      {/* FORM */}
      <ScrollView className="flex-1 px-8 -mt-12">
        <View className="bg-[#EFA33E] rounded-[30px] p-6 shadow-xl">
          <Text className="text-center text-gray-800 text-[13px] mb-6 px-2">
            Set a new secure password for your account.
          </Text>

          {/* NEW PASSWORD */}
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
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* CONFIRM PASSWORD */}
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

          {/* BUTTON */}
          <TouchableOpacity
            onPress={handleUpdatePassword}
            disabled={loading}
            className="bg-[#005D14] py-3 rounded-xl items-center shadow-md"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Update Password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}