import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { I18nProvider } from '@/context/I18nContext';
import { ConexaoProvider } from '@/context/ConexaoContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { applyGlobalFont } from '@/constants/globalFont';
import { observarAuth } from '@/services/auth';
import { sincronizarSessao, limparSessao } from '@/services/session';
import { lerDisfarce } from '@/lib/preferencias';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Manda o app para a calculadora quando o modo disfarce está ligado.
 *
 * Roda uma única vez por abertura, controlado pelo ref: depois que a usuária
 * digita o PIN e entra, navegar entre telas não pode jogá-la de volta para o
 * disfarce. Sair para o disfarce de novo é uma ação explícita, feita em
 * Configurações.
 */
function useDisfarceNaAbertura(pronto: boolean) {
  const router = useRouter();
  const jaDecidiu = useRef(false);

  useEffect(() => {
    if (!pronto || jaDecidiu.current) return;
    jaDecidiu.current = true;

    lerDisfarce()
      .then((config) => {
        if (config.ativo && config.pin) router.replace('/calculadora');
      })
      .catch(() => {});
  }, [pronto, router]);
}

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
        <Stack.Screen name="onboarding" />
        {/* Gesto de voltar desligado: sair do disfarce é só pelo PIN. */}
        <Stack.Screen name="calculadora" options={{ gestureEnabled: false }} />
      </Stack>
      <OfflineBanner />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Fraunces_700Bold,
  });
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      applyGlobalFont();
      SplashScreen.hideAsync().catch(() => {});
      setMontado(true);
    }
  }, [fontsLoaded]);

  useDisfarceNaAbertura(montado);

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
      <I18nProvider>
        <ThemeProvider>
          <ConexaoProvider>
            <RootLayoutContent />
          </ConexaoProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
