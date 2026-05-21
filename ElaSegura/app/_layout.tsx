import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Aqui ele vai carregar automaticamente as telas da pasta app */}
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="perfil" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
