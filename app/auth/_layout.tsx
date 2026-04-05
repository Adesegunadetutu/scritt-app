import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      {/* Add these two lines */}
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}