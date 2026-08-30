import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { applyGlobalFont } from '@/constants/globalFont';
import { observarAuth } from '@/services/auth';
import { sincronizarSessao, limparSessao } from '@/services/session';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { isDarkMode } = useTheme();

  const customTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: isDarkMode ? '#121212' : '#FFECF4',
    },
  };

  return (
    <NavigationThemeProvider value={customTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="perfil" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyGlobalFont();
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // O Firebase restaura a sessão sozinho ao abrir o app, mas as telas leem
  // nome/foto e o gate de login do AsyncStorage. Este listener mantém as duas
  // fontes em sincronia — inclusive depois de fechar e reabrir o app.
  useEffect(() => {
    const cancelar = observarAuth((user) => {
      if (user) {
        sincronizarSessao(user).catch((e) =>
          console.error('[auth] falha ao sincronizar a sessão:', e)
        );
      } else {
        limparSessao().catch((e) =>
          console.error('[auth] falha ao limpar a sessão:', e)
        );
      }
    });
    return cancelar;
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
