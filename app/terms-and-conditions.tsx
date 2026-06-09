import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsAndConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const Section = ({ title, content }: { title: string; content: string }) => (
    <View className="mb-6">
      <Text className="text-primary font-black text-lg mb-2">{title}</Text>
      <Text className="text-app-text-muted leading-6 text-[14px]">
        {content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-app-bg" edges={['top']}>
      <Stack.Screen options={{ title: "Terms of Service", headerShown: false }} />
      
      {/* Custom Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-card-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-4">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-app-text">Terms & Conditions</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-app-text-muted mb-6 italic">
          Last Updated: June 8, 2026
        </Text>

        <Section 
          title="1. Acceptance of Terms" 
          content="By accessing, downloading, or utilizing Scritt, you explicitly agree to be legally bound by these Terms and Conditions. If you object to or disagree with any parameter of these terms, your license to access the service is immediately revoked, and you must terminate your use of the platform." 
        />

        <Section 
          title="2. Eligibility & Account Security" 
          content="You must be at least 18 years of age to register an account on Scritt. You are uniquely and completely responsible for maintaining the confidentiality of your authentication details linked via Supabase, and you assume total liability for all activities, messages, and interactions initiated under your profile credentials." 
        />

        <Section 
          title="3. Marketplace Content & User Listings" 
          content="Users retain total ownership over listing text, room specs, and media uploads. However, you grant Scritt a royalty-free license to host and broadcast this data. You assume full legal responsibility for the accurate, lawful representation of your housing spaces. Scritt reserves an absolute, unchecked right to redact, hide, or delete any listing or chat record that breaches community safety metrics or displays fraudulent indicators." 
        />

        <Section 
          title="4. Identity Verification Disclaimer" 
          content="While Scritt may distribute structural 'Verified' badges based on specific profile checks, this indicator does not constitute a character background check, physical safety validation, or asset endorsement. Scritt does not vet or monitor its user base offline. You are required to exercise absolute due diligence and personal caution when communicating with or meeting potential roommates." 
        />

        <Section 
          title="5. Absolute Limitation of Liability" 
          content="To the peak limit allowed by law, Scritt, its parent entities, developers, and operational partners shall not be held liable for any direct, indirect, incidental, punitive, or consequential damages. This explicitly covers property damages, financial scams, leasing contract breaches, roommate behavior disputes, personal injuries, or psychological distress arising out of relationships or real-estate transactions initiated inside this application." 
        />

        <Section 
          title="6. Prohibited Operational Conduct" 
          content="You are explicitly barred from utilizing this software to execute deceptive schemes, distribute spam, manipulate location attributes, scrape system databases, or transmit abusive, predatory, or harassing text via peer-to-peer chat windows." 
        />

        <Section 
          title="7. Third-Party Ads & Services" 
          content="Scritt leverages Google AdMob to distribute interactive advertisement placements and Supabase to power secure database logic. Scritt maintains no oversight or operational liability regarding the content, click-through actions, or data policies governing these individual third-party tools." 
        />

        {/* Dynamic bottom padding to separate text from the absolute button */}
        <View className="h-10" /> 
      </ScrollView>

      {/* Accept Button Fixed at Bottom with Safe Area Tracking */}
      <View 
        style={{ paddingBottom: insets.bottom + 16 }}
        className="px-6 pt-4 bg-white border-t border-card-border"
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-primary h-14 rounded-2xl items-center justify-center shadow-sm active:opacity-90"
        >
          <Text className="text-white font-black text-lg">I Understand & Agree</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}