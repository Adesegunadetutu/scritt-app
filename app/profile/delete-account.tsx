import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DeleteAccountScreen() {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const router = useRouter();

  // --- AUTH GUARD ---
  // If someone opens this via a Deep Link but isn't logged in, kick them out.
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/signin'); 
      }
    };
    checkUser();
  }, []);

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("No active session");
  
              // Correct way to call invoke with a body
              const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { userId: user.id }
              });
  
              if (error) throw error;
  
              await supabase.auth.signOut();
              router.replace('/auth/signin');
              Alert.alert("Success", "Account removed.");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Could not delete account.");
            }
          } 
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-12 px-6 pb-6 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-4 text-gray-900">Delete Account</Text>
      </View>

      <ScrollView className="flex-1 px-8 pt-10">
        <View className="items-center mb-8">
          <View className="bg-red-50 p-6 rounded-full">
            <Ionicons name="trash-outline" size={50} color="#dc2626" />
          </View>
        </View>

        <Text className="text-2xl font-bold text-center text-gray-900 mb-4">
          We're sorry to see you go
        </Text>
        
        <Text className="text-gray-500 text-center leading-6 mb-10">
          Once you delete your account, there is no going back. All your **Scritt** listings, 
          saved roommate requests, and messages will be permanently removed from our servers.
        </Text>

        <View className="bg-gray-50 p-6 rounded-2xl mb-10">
          <Text className="text-red-700 font-bold mb-2">Important Notice:</Text>
          <Text className="text-red-600 text-sm leading-5">
            If you have active subscriptions or pending transactions, please resolve them before deleting your account.
          </Text>
        </View>

        <TouchableOpacity 
          onPress={handleDeleteAccount}
          disabled={loading}
          className="bg-red-600 py-4 rounded-xl items-center shadow-md active:bg-red-700"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Permanently Delete Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-6 py-4 items-center"
        >
          <Text className="text-gray-500 font-medium">I changed my mind</Text>
        </TouchableOpacity>
        
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}