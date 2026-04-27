import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Aqui ele vai carregar automaticamente as telas da pasta app */}
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="perfil" />
      </Stack>
    </ThemeProvider>
  );
}