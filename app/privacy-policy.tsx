import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Section */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">Privacy Policy</Text>
      </View>

      <ScrollView
        className="px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingTop: 20, 
          paddingBottom: insets.bottom + 40 
        }}
      >
        <Text className="text-gray-400 text-sm font-medium mb-6">
          Last Updated: June 8, 2026
        </Text>

        <Text className="text-gray-600 leading-6 mb-6 text-base">
          Welcome to **SCRITT**. Your privacy is paramount. This Privacy Policy outlines how we collect, use, process, and safeguard your information when you utilize our marketplace and roommate-finding platform.
        </Text>

        <Section title="1. Information We Collect">
          We collect personal identifiers including your name, email address, and profile data provided during registration via Supabase Auth. We also process user-generated content such as chat messages, listings, room preferences, uploaded images, and device identifiers required for system performance and advertising.
        </Section>

        <Section title="2. How We Use Your Information">
          Your data is used to provide core platform services: facilitating user connections, matching roommates, maintaining safe peer-to-peer messaging networks, rendering active marketplace listings, and sending real-time transactional or push notifications.
        </Section>

        <Section title="3. Third-Party Services & Data Infrastructure">
          We do not sell your personal information. To maintain app operations, we share data with trusted infrastructure providers:
          {"\n"}• **Database & Auth:** Secure hosting and user authentication are managed via **Supabase**.
          {"\n"}• **Monetization:** Personalized or non-personalized advertisements are securely managed and served through **Google AdMob**.
        </Section>

        <Section title="4. Advertising & Device Identifiers">
          Google AdMob utilizes tracking mechanisms and unique hardware tokens (such as Android Advertising ID or iOS IDFA) to serve tailored advertisements based on your usage behaviors. You can modify mobile personalization flags or opt out of targeted ad tracking entirely through your phone's native operating system settings.
        </Section>

        <Section title="5. Data Retention & Account Deletion">
          We store profile indicators and communication history as long as your platform account remains active. You possess the right to delete your account data at any moment. Initiating an account deletion completely wipes your public index profiles and removes your active marketplace listings.
        </Section>

        <Section title="6. Limitation of Security Liability">
          While we employ standard cryptographic practices through our cloud providers to shield user records, no digital storage mechanism is absolute. SCRITT cannot guarantee flawless, absolute security against unauthorized access or structural data breaches.
        </Section>

        <Section title="7. Policy Variations">
          We reserve the right to modify this privacy framework periodically. Any revisions made will be posted transparently on this page with an updated modification timestamp.
        </Section>

        <Section title="8. Legal Contact Support">
          For technical privacy questions, account deletion overrides, or corporate data inquiries, please reach out to us at:
        </Section>

        <Text className="font-bold text-lg mt-[-8px] mb-10 text-emerald-600">
          info@empressexclusivecollections.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (
    <View className="mb-6">
      <Text className="text-base font-bold text-gray-900 mb-2">
        {title}
      </Text>
      <Text className="text-gray-500 leading-6 text-[15px]">
        {children}
      </Text>
    </View>
  );
}