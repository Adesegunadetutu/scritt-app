import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CookiesPolicy() {
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
          This Cookies Policy explains how SCRITT uses cookies and similar technologies to recognize you when you use our app.
        </Text>

        {/* Sections */}
        <Section title="1. What Are Cookies?">
          Cookies are small pieces of data stored on your device when you use an app or visit a website. They help improve functionality and user experience.
        </Section>

        <Section title="2. How We Use Cookies">
          We use cookies and similar technologies to keep you logged in, understand how you use our platform, and improve performance and features.
        </Section>

        <Section title="3. Types of Cookies We Use">
          • Essential cookies – required for the app to function properly{"\n"}
          • Analytics cookies – help us understand usage and improve features{"\n"}
          • Preference cookies – remember your settings and choices
        </Section>

        <Section title="4. Third-Party Services">
          We may use third-party services like Supabase which may use similar tracking technologies to provide authentication, database, and storage functionality.
        </Section>

        <Section title="5. Managing Cookies">
          You can control or disable cookies through your device settings. However, disabling cookies may affect how the app functions.
        </Section>

        <Section title="6. Changes to This Policy">
          We may update this Cookies Policy from time to time. Any changes will be reflected on this page.
        </Section>

        <Section title="7. Contact Us">
          If you have questions about our Cookies Policy, contact us at:
        </Section>

        <Text className="font-semibold mt-2 text-[#16a34a]">
          support@scritt.com
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