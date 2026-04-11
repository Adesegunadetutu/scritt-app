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
  try {
    if (!Device.isDevice) {
      console.log("❌ Must use physical device");
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.error("❌ Project ID not found");
      return null;
    }

    // 🔐 CHECK EXISTING PERMISSION
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // 🔐 REQUEST IF NOT GRANTED
    if (existingStatus !== "granted") {
      const { status: reqStatus } =
        await Notifications.requestPermissionsAsync();

      finalStatus = reqStatus;
    }

    console.log("🔐 Permission Status:", finalStatus);

    if (finalStatus !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    // 📱 ANDROID CHANNEL (SAFE)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 🚀 GET TOKEN
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    if (!tokenData?.data) {
      console.log("❌ Token generation failed");
      return null;
    }

    console.log("✅ TOKEN GENERATED:", tokenData.data);

    return tokenData.data;
  } catch (error) {
    console.log("❌ PUSH TOKEN ERROR:", error);
    return null;
  }
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
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // 🔔 HANDLE COLD START
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastResponse &&
      lastResponse.notification.request.content.data?.screen &&
      lastResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const { screen, id } = lastResponse.notification.request.content.data;

      setTimeout(() => {
        router.push({
          pathname: screen as any,
          params: id ? { id: id as string } : {},
        });
      }, 500);
    }
  }, [lastResponse]);

  const isAppReady = appDataReady || forceReady;

  useNetworkObserver();

  // Safety timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAppReady) {
        console.warn("⚠️ Forcing app ready...");
        setForceReady(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isAppReady]);

  // PASSWORD RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/update-password' as any);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 🔔 STEP 1: GET TOKEN ONCE
  useEffect(() => {
  registerForPushNotificationsAsync().then(token => {
    if (token) {
      console.log("📱 TOKEN RECEIVED:", token);
      setExpoPushToken(token);
    } else {
      console.log("❌ No token returned");
    }
  });
}, []);

  // 🔔 STEP 2: SAVE TOKEN WHEN USER IS READY
  useEffect(() => {
    console.log("👤 User:", user);
    console.log("📱 Token:", expoPushToken);

    if (expoPushToken && user) {
      console.log("🚀 Saving token to DB...");

      supabase
        .from('profiles')
        .update({ push_token: expoPushToken })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error("❌ SUPABASE ERROR:", error.message);
          } else {
            console.log("✅ DATABASE UPDATED SUCCESSFULLY!");
          }
        });
    }
  }, [expoPushToken, user]);

  // 🔔 NOTIFICATION CLICK (BACKGROUND)
  useEffect(() => {
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
      if (responseListener.current) responseListener.current?.remove();
    };
  }, []);

  // AUTH ROUTING
  useEffect(() => {
    if (authLoading || !isAppReady) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/signin');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, segments, isAppReady]);

  // HIDE SPLASH
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