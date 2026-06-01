import messaging from '@react-native-firebase/messaging';
import { supabase } from '@/lib/supabase';

export async function registerFCM(userId: string) {
  const authStatus = await messaging().requestPermission();

  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log("❌ Notification permission denied");
    return null;
  }

  const token = await messaging().getToken();

  console.log("🔥 FCM TOKEN:", token);

  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  return token;
}