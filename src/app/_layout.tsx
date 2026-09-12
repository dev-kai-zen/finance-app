import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/components/app-shell';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="transactions" />
        </Stack>
      </AppShell>
    </SafeAreaProvider>
  );
}
