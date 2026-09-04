import { Stack } from 'expo-router';

/**
 * Auth group layout.
 *
 * All screens inside (auth)/ use this layout.
 * No tab bar, no header — clean full-screen experience.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  );
}
