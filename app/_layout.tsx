import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import Toast from "react-native-toast-message";
import "../global.css";
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAppInit } from "../src/hooks/useAppInit";
import * as Linking from 'expo-linking';
import { initMobileAds } from '@/lib/ads/initMobileAds';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { useNetworkObserver } from '../src/hooks/useNetworkObserver';
import OfflineNotice from '@/components/OfflineNotice';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAppUpdateChecker } from '../src/hooks/useAppUpdateChecker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device'; 




// --- LOG MANAGEMENT ---
if (__DEV__) {
  const ignoredLogs = [
    // Startup & Hydration (from useAppInit)
    "INIT START",
    "CACHE LOADED",
    "SETTING READY TRUE",
    
    // Network & Syncing (from useNetworkObserver)
    "Network Restored: Syncing fresh data...",
    
    // Auth & Identity
    "👤 User:",
    "🔔 Auth Event:",
    
    // Notifications & Tokens
    "📱 Token:",
    "🚀 Saving token to DB",
    "✅ DATABASE UPDATED",
    "🔐 Permission Status:",
    "✅ Notification channel ready",
    "✅ TOKEN GENERATED",
    "📱 TOKEN RECEIVED",
    
    // Third-Party Services
    "AdMob Initialized!",
    "Realtime subscription status:"
  ];

  const originalLog = console.log;
  console.log = (...args) => {
    const message = args[0]?.toString() || "";
    // If the log starts with or contains any of our ignored strings, skip it
    if (ignoredLogs.some(log => message.includes(log))) {
      return;
    }
    originalLog(...args);
  };
}

// put this OUTSIDE your component (top of file)
let recoveryHandled = false;

// 🔔 NOTIFICATION HANDLER
if (Platform.OS !== 'web' && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// 🔔 REGISTER FUNCTION
async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'web') return null;
    if (!Device || !Device.isDevice) {
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
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      }).then(() => {
      console.log("✅ Notification channel ready");
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
  const [isRecovering, setIsRecovering] = useState(false);
  
const hasHandledRecovery = useRef(false);

  // 🔔 HANDLE COLD START
  const lastResponse = (Platform.OS !== 'web' && Notifications?.useLastNotificationResponse) 
  ? Notifications.useLastNotificationResponse() 
  : null;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (
      lastResponse &&
      lastResponse.notification.request.content.data?.screen &&
      lastResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const { screen, id } = lastResponse.notification.request.content.data;

      setTimeout(() => {
        router.replace({
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
    }, 3000);
    return () => clearTimeout(timer);
  }, [isAppReady]);

  // PASSWORD RECOVERY

// Inside RootLayoutNav
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    console.log("🔔 Auth Event:", event);
    
    // Catch the recovery event
   if (event === 'PASSWORD_RECOVERY' && !recoveryHandled) {
  setIsRecovering(true);
}
    
    // Reset recovery mode only if the user explicitly signs out 
    // or if the password is successfully updated (handled in the update screen)
    if (event === 'SIGNED_OUT') {
      setIsRecovering(false);
    }
  });
  
  return () => subscription.unsubscribe();
}, []);

  // 🔔 STEP 1: GET TOKEN ONCE
  useEffect(() => {
    if (Platform.OS === 'web') return;
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
  // 🔔 STEP 2: SAVE TOKEN & DEVICE INFO WHEN USER IS READY
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (expoPushToken && user) {
      const syncDeviceData = async () => {
        console.log("🚀 Syncing token and device info...");

        // Capture hardware details
       const deviceId = Device?.osBuildId || "unknown_id"; 
        const deviceName = Device?.deviceName || "Unknown Device";

        const { error } = await supabase
          .from('profiles')
          .update({ 
            push_token: expoPushToken,
            last_device_id: deviceId,    // Ensure this column exists in SQL
            device_name: deviceName      // Ensure this column exists in SQL
          })
          .eq('id', user.id);

        if (error) {
          console.error("❌ SUPABASE ERROR:", error.message);
        } else {
          console.log("✅ DB UPDATED: Token + Device ID saved.");
        }
      };

      syncDeviceData();
    }
  }, [expoPushToken, user]);

  // 🔔 NOTIFICATION CLICK (BACKGROUND)
  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications) return;
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as { screen?: string; id?: string };

      if (data?.screen) {
        router.replace({
          pathname: data.screen as any,
          params: data.id ? { id: data.id } : {}
        });
      }
    });

    return () => {
      if (responseListener.current) responseListener.current?.remove();
    };
  }, []);

 useEffect(() => {
  const handleDeepLink = async (url: string) => {
    if (!url) return;

    if (recoveryHandled) return;

    console.log("🔗 Incoming URL:", url);

    if (url.includes("type=recovery")) {
      recoveryHandled = true;

      console.log("🟣 Recovery link detected");

      setIsRecovering(true);

      const { queryParams } = Linking.parse(url);

      if (queryParams?.access_token && queryParams?.refresh_token) {
        await supabase.auth.setSession({
          access_token: queryParams.access_token as string,
          refresh_token: queryParams.refresh_token as string,
        });
      }

      router.replace('/auth/update-password');
    }
  };

  let isMounted = true;

  // Cold start
  Linking.getInitialURL().then((url) => {
    if (url && isMounted) handleDeepLink(url);
  });

  // When app is already open
  const sub = Linking.addEventListener("url", (event) => {
    handleDeepLink(event.url);
  });

  return () => {
    isMounted = false;
    sub.remove();
  };
}, []);

// AUTH ROUTING
useEffect(() => {
  if (authLoading || !isAppReady) return;

  const inAuthGroup = segments[0] === 'auth';
  const isUpdatePasswordPage = segments.includes('update-password');

  // 🚨 1. PRIORITY: If we are recovering, STAY on update-password
  if (isRecovering || isUpdatePasswordPage) {
    if (!isUpdatePasswordPage) {
      router.replace('/auth/update-password');
    }
    return; // Stop execution here so we don't hit the "user" check below
  }

  // 🚨 2. NORMAL AUTH FLOW
  if (!user) {
    if (!inAuthGroup) {
      router.replace('/auth/signin');
    }
    return;
  }

  // This block was yanking you home. 
  // We added the return above to make sure this is skipped during recovery.
  if (user && inAuthGroup) {
    router.replace('/(tabs)');
  }
}, [user, authLoading, segments, isAppReady, isRecovering]);


useEffect(() => {
  if (Platform.OS !== 'web') { // Wrap this call
    initMobileAds();
  }
}, []);

  // HIDE SPLASH
 useEffect(() => {
  const hide = async () => {
    if (isAppReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.log("Splash already hidden");
      }
    }
  };

  hide();
}, [isAppReady]);

  if (!isAppReady) return null;


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
  useAppUpdateChecker();
  return (
    <KeyboardProvider>
      <AuthProvider>
        <FavoritesProvider>
          <RootLayoutNav />
        </FavoritesProvider>
      </AuthProvider>
    </KeyboardProvider>
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