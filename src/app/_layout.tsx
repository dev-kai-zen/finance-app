import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from '@/components/app-shell';
import { DatabaseProvider } from '@/infrastructure/database';
export default function RootLayout(){return <SafeAreaProvider><DatabaseProvider><AppShell><Stack screenOptions={{headerShown:false}}><Stack.Screen name="index"/><Stack.Screen name="transactions"/></Stack></AppShell></DatabaseProvider></SafeAreaProvider>;}