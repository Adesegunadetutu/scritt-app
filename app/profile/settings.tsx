import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  StatusBar, 
  Platform,
  Alert,
  Linking 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      if (Platform.OS === 'web') {
        window.alert("Don't know how to open this URL");
      } else {
        Alert.alert("Error", "Don't know how to open this URL");
      }
    }
  };

  const toggleNotifications = async (value: boolean) => {
    // 1. Immediately update UI for a snappy feel
    setNotificationsEnabled(value);

    // 2. Web Guard: Web browser doesn't run native token registration flows
    if (Platform.OS === 'web') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        await supabase
          .from('profiles')
          .update({ notifications_enabled: value })
          .eq('id', user.id);
      } catch (error) {
        console.error("Failed to update notification settings on web:", error);
      }
      return;
    }

    // 3. Native Only Flow (Android / iOS)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (value) {
        // --- LOGIC FOR TURNING ON ---
        if (!Notifications) return;
        
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Enable notifications in system settings to receive updates.');
          setNotificationsEnabled(false);
          return;
        }

        // Get Project ID safely
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

        // Update Database: Enable AND save token
        await supabase
          .from('profiles')
          .update({ 
            push_token: token, 
            notifications_enabled: true 
          })
          .eq('id', user.id);

      } else {
        // --- LOGIC FOR TURNING OFF ---
        await supabase
          .from('profiles')
          .update({ notifications_enabled: false })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      setNotificationsEnabled(!value);
      Alert.alert("Error", "Could not save your preferences. Please try again.");
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setNotificationsEnabled(data.notifications_enabled);
          }
        }
      } catch (error) {
        console.error("Error fetching notification status:", error);
        // Default fall-back so the UI interaction does not lock up on load failures
        setNotificationsEnabled(false); 
      }
    };

    fetchSettings();
  }, []);

  const handleContact = (subject: string) => {
    const email = "info@empressexclusivecollections.com"; 
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  const performLogoutAction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Only clean out database keys if we aren't isolated on a browser instance
      if (user && Platform.OS !== 'web') {
        await supabase
          .from('profiles')
          .update({ push_token: null }) 
          .eq('id', user.id);
      }

      await supabase.auth.signOut();
      router.replace('/auth/signin');
    } catch (error) {
      console.error("Error during logout:", error);
      await supabase.auth.signOut();
      router.replace('/auth/signin');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm("Are you sure you want to log out of Scritt?");
      if (confirmWeb) performLogoutAction();
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to log out of Scritt?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", style: "destructive", onPress: performLogoutAction }
        ]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="px-4 py-4 flex-row items-center border-b border-gray-50"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-4">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View className="mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
            Preferences
          </Text>
          <View className="bg-gray-50 rounded-2xl overflow-hidden">
            {notificationsEnabled === null ? (
              <View className="h-14 justify-center px-4">
                 <Text className="text-gray-400 text-xs">Loading preferences...</Text>
              </View>
            ) : (
              <SettingToggle 
                icon="notifications-outline" 
                label="Notification" 
                value={notificationsEnabled} 
                onValueChange={toggleNotifications} 
              />
            )}
            
            <SettingToggle 
              icon="moon-outline" 
              label="Dark Mode" 
              value={darkMode} 
              onValueChange={setDarkMode} 
            />
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
            Support & About
          </Text>
          <View className="bg-gray-50 rounded-2xl overflow-hidden">
            <SettingLink icon="star-outline" label="Rate App" />
            <SettingLink icon="share-social-outline" label="Share App" />
            <SettingLink 
              icon="shield-checkmark-outline" 
              label="Privacy Policy" 
              onPress={() => router.push("/privacy-policy")} 
            />
            <SettingLink 
              icon="document-text-outline" 
              label="Terms and Conditions" 
              onPress={() => router.push("/terms-and-conditions")}
            />
            <SettingLink 
              icon="analytics-outline" 
              label="Cookies Policy" 
              onPress={() => router.push("/cookies-policy")} 
            />
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
            Reach Out
          </Text>
          <View className="bg-gray-50 rounded-2xl overflow-hidden">
            <SettingLink icon="mail-outline" label="Contact" onPress={() => handleContact("Support Request")} />
            <SettingLink icon="chatbubble-ellipses-outline" label="Feedback" onPress={() => handleContact("App Feedback")} />
          </View>
        </View>

        <View className="mt-10 mb-10 px-2">
          <TouchableOpacity 
            onPress={handleLogout}
            className="flex-row items-center justify-center py-4 bg-gray-50 rounded-2xl mb-3"
          >
            <Ionicons name="log-out-outline" size={22} color="#4B5563" />
            <Text className="ml-2 text-gray-700 font-bold">Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/profile/delete-account')}
            className="flex-row items-center justify-center py-4 bg-red-50 rounded-2xl mb-3"
          >
            <Ionicons name="trash-outline" size={22} color="#dc2626" />
            <Text className="ml-3 text-red-600 font-semibold">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({ icon, label, value, onValueChange }: any) {
  return (
    <View className="flex-row items-center justify-between px-4 py-4 border-b border-white">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color="#374151" />
        <Text className="ml-3 text-gray-700 font-medium">{label}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange}
        trackColor={{ false: "#d1d5db", true: "#16a34a" }}
        thumbColor={Platform.OS === 'ios' ? undefined : "#ffffff"}
      />
    </View>
  );
}

function SettingLink({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4 border-b border-white"
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color="#374151" />
        <Text className="ml-3 text-gray-700 font-medium">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}