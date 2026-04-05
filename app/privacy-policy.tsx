import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header Section */}
              <View className="px-6 py-4 flex-row items-center justify-between">
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
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
      >
        {/* Date Subheader */}
        <Text className="text-gray-400 font-medium mb-6">
          Last Updated: March 20, 2026
        </Text>

        {/* Intro */}
        <Text className="text-gray-700 leading-6 mb-4">
          Welcome to **SCRITT**. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
        </Text>

        {/* Sections */}
        <Section title="1. Information We Collect">
          We collect personal information like your name and email, as well as messages, uploaded images, and payment receipts.
        </Section>

        <Section title="2. How We Use Your Information">
          Your data helps us provide services, enable messaging, process transactions, and improve your experience.
        </Section>

        <Section title="3. Storage and Security">
          Your data is securely stored using **Supabase** with appropriate security measures in place.
        </Section>

        <Section title="4. File Uploads">
          Uploaded files such as receipts and images are securely stored and may be accessed by admins for verification.
        </Section>

        <Section title="5. Data Sharing">
          We do not sell your data. Information is only shared with trusted services or when legally required.
        </Section>

        <Section title="6. Data Retention">
          We retain your data only as long as necessary to provide our services and meet legal obligations.
        </Section>

        <Section title="7. Your Rights">
          You can request access, correction, or deletion of your personal data.
        </Section>

        <Section title="8. Third-Party Services">
          We use services like **Supabase** for authentication, database, and storage.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this policy occasionally. Changes will be reflected here.
        </Section>

        <Section title="10. Contact Us">
          If you have questions, contact us at:
        </Section>

        <Text className="font-semibold mt-2 text-primary">
          adesegunadetutu20@gmail.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable Section Component
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