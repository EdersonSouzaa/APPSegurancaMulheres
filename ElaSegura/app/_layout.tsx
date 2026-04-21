import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Aqui ele vai carregar automaticamente as telas da pasta app */}
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="perfil" />
    </Stack>
  );
}