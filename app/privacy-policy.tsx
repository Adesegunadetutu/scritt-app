import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Adding this to fix your navigation overlap issue!

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header Section */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
            <Ionicons name="arrow-back" size={26} color="black" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Privacy Policy</Text>
        </View>
      </View>

      <ScrollView
        className="px-5"
        showsVerticalScrollIndicator={false}
        // Updated paddingBottom to handle system nav bars
        contentContainerStyle={{ 
          paddingTop: 10, 
          paddingBottom: insets.bottom + 40 
        }}
      >
        <Text className="text-gray-400 font-medium mb-6">
          Last Updated: March 21, 2026
        </Text>

        <Text className="text-gray-700 leading-6 mb-4">
          Welcome to **SCRITT**. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
        </Text>

        <Section title="1. Information We Collect">
          We collect personal information like your name and email, as well as messages, uploaded images, and payment receipts. We also collect device identifiers for advertising purposes.
        </Section>

        {/* ... Sections 2 through 7 remain the same ... */}

        <Section title="8. Third-Party Services">
          We use services like **Supabase** for authentication and data storage, and **Google AdMob** for advertising. These third parties have their own privacy policies governing how they handle your data.
        </Section>

        {/* NEW SECTION FOR GOOGLE ADS */}
        <Section title="9. Advertising and Cookies">
          We use Google to serve ads within the app. Google uses cookies and unique device identifiers (such as the Android Advertising ID or iOS IDFA) to show you ads based on your interests and previous visits. You can manage your ad preferences or opt-out of personalized ads via your device system settings.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this policy occasionally. Changes will be reflected here.
        </Section>

        <Section title="11. Contact Us">
          If you have questions, contact us at:
        </Section>

        <Text className="font-semibold mt-[-8px] mb-10 text-primary">
          info@empressexclusivecollections.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-gray-900 mb-2">
        {title}
      </Text>
      <Text className="text-gray-600 leading-6">
        {children}
      </Text>
    </View>
  );
}