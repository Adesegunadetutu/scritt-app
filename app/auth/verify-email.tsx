import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmail() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);

  // Handle the 60-second countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (timer > 0) return; // Prevent clicking during cooldown

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email as string,
    });

    setResending(false);

    if (error) {
      // Catching the 429 "Too Many Requests" error specifically
      if (error.status === 429 || error.message.toLowerCase().includes('too many requests')) {
        Alert.alert('Slow down', 'Please wait a minute before requesting another link.');
        setTimer(60); // Force the timer if Supabase blocks the request
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      Alert.alert('Sent!', 'A new verification link has been sent to your email.');
      setTimer(60); // Start 60s cooldown on success
    }
  };

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      {/* Icon/Illustration with Scritt Orange */}
      <View className="bg-orange-50 p-10 rounded-full mb-8">
        <Ionicons name="mail-open" size={80} color="#EFA33E" />
      </View>

      <Text className="text-3xl font-black text-[#005D14] mb-2 text-center uppercase">
        Check your mail!
      </Text>
      
      <View className="mb-10">
        <Text className="text-gray-500 text-center leading-6 text-[15px]">
          We've sent a verification link to{"\n"}
          <Text className="font-bold text-gray-900">{email || 'your email'}</Text>
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Please click the link to activate your account.
        </Text>
      </View>

      {/* Primary Action - Back to Login */}
      <TouchableOpacity 
        onPress={() => router.replace('/auth/signin')}
        className="bg-[#005D14] w-full py-4 rounded-2xl items-center mb-6 shadow-md"
      >
        <Text className="text-white font-bold text-lg">Back to Login</Text>
      </TouchableOpacity>

      {/* Secondary Action - Resend with Timer logic */}
      <TouchableOpacity 
        onPress={handleResend}
        disabled={resending || timer > 0}
        className="py-2"
      >
        <Text className="text-gray-500 text-sm">
          Didn't get an email?{' '}
          {resending ? (
            <ActivityIndicator size="small" color="#EFA33E" />
          ) : (
            <Text className={`font-bold ${timer > 0 ? 'text-gray-400' : 'text-[#EFA33E]'}`}>
              {timer > 0 ? `Resend in ${timer}s` : 'Resend'}
            </Text>
          )}
        </Text>
      </TouchableOpacity>
    </View>
  );
}