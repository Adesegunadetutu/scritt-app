import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsAndConditions() {
  const router = useRouter();

  const Section = ({ title, content }: { title: string; content: string }) => (
    <View className="mb-6">
      <Text className="text-primary font-black text-lg mb-2">{title}</Text>
      <Text className="text-app-text-muted leading-6 text-[14px]">
        {content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ title: "Terms of Service", headerShown: false }} />
      
      {/* Custom Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-card-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-4">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-app-text">Terms & Conditions</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-app-text-muted mb-8 italic">
          Last Updated: March 21, 2026
        </Text>

        <Section 
          title="1. Acceptance of Terms" 
          content="By accessing or using Scritt, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, you may not access the service." 
        />

        <Section 
          title="2. User Listings" 
          content="Users are responsible for the accuracy of their accommodation and service listings. We reserve the right to remove listings that are fraudulent, inappropriate, or violate community safety standards." 
        />

        <Section 
          title="3. Verification" 
          content="While we offer a 'Verified' badge for certain profiles, Scritt does not guarantee the absolute safety or quality of any third-party services. Users should exercise due diligence." 
        />

        <Section 
          title="4. Prohibited Conduct" 
          content="You agree not to use the service for any unlawful purpose, including but not limited to scamming, harassment, or posting unauthorized advertisements." 
        />

        <View className="h-20" /> {/* Extra space at bottom */}
      </ScrollView>

      {/* Accept Button Fixed at Bottom (Optional) */}
      <View className="p-6 bg-white border-t border-card-border">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-primary h-14 rounded-2xl items-center justify-center shadow-sm"
        >
          <Text className="text-white font-black text-lg">I Understand</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}