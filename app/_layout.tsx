import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Toast from "react-native-toast-message";
import "../global.css";
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppInit } from "../src/hooks/useAppInit";
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { useNetworkObserver } from '../src/hooks/useNetworkObserver';
import OfflineNotice from '@/components/OfflineNotice';

// 🔔 NOTIFICATION HANDLER
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 🔔 REGISTER FUNCTION
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Must use physical device");
    return null;
  }

  // --- NEW LOGIC START ---
  // This extracts the projectId mentioned in the screenshot
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.error("Project ID not found. Ensure you have a projectId in app.json");
    return null;
  }
  // --- NEW LOGIC END ---

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log("Permission not granted");
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // --- UPDATED CALL ---
  // We now pass the projectId object as the documentation suggests
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  
  return tokenData.data;
}

// Prevent splash from auto hiding
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { isReady: appDataReady } = useAppInit();

  const [forceReady, setForceReady] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // 🔔 1. HANDLE NOTIFICATIONS WHEN APP IS CLOSED (COLD START)
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastResponse &&
      lastResponse.notification.request.content.data?.screen &&
      lastResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const { screen, id } = lastResponse.notification.request.content.data;
      
      // Small delay to ensure the navigation stack is mounted
      const timer = setTimeout(() => {
        router.push({
          pathname: screen as any,
          params: id ? { id: id as string } : {},
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [lastResponse]);

  const isAppReady = appDataReady || forceReady;

  // Initialize Network Observer
  useNetworkObserver();

  // Safety timer for app loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAppReady) {
        console.warn("App taking too long to load, forcing mount...");
        setForceReady(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isAppReady]);

  // --- PASSWORD RECOVERY LISTENER ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/update-password' as any);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 🔔 2. NOTIFICATION LISTENERS (FOREGROUND/BACKGROUND)
  useEffect(() => {
    console.log("🔔 Notification Effect Running. User Status:", !!user);

    registerForPushNotificationsAsync().then(token => {
      if (token && user) {
        console.log("✅ TOKEN GENERATED:", token);
        
        supabase.from('profiles')
          .update({ push_token: token })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error("❌ SUPABASE ERROR:", error.message);
            } else {
              console.log("🚀 DATABASE UPDATED SUCCESSFULLY!");
            }
          });
      } else {
        console.log("⚠️ No token or no user. Token:", !!token, "User:", !!user);
      }
    });

    // ... (keep your notificationListener and responseListener code here)

    // Interaction listener (User tapped notification while app was in background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { screen?: string; id?: string };

      if (data?.screen) {
        router.push({
          pathname: data.screen as any,
          params: data.id ? { id: data.id } : {}
        });
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current?.remove();
      if (responseListener.current) responseListener.current?.remove();
    };
  }, [user]);

  // --- HANDLE AUTH + ROUTING ---
  useEffect(() => {
    if (authLoading || !isAppReady) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/signin');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, segments, isAppReady]);

  // --- HIDE SPLASH SCREEN ---
  useEffect(() => {
    if (isAppReady && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [isAppReady, authLoading]);

  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading app...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineNotice />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen 
          name="edit-listing" 
          options={{ 
            presentation: 'modal', 
            headerShown: true,
            title: 'Edit Your Item'
          }} 
        />
        <Stack.Screen 
          name="filters" 
          options={{ headerShown: true, title: 'Filters' }} 
        />
        <Stack.Screen 
          name="profile/my-listings" 
          options={{ headerShown: true, title: 'My Ads' }} 
        />
      </Stack>
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <RootLayoutNav />
      </FavoritesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  }
});