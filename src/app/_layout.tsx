import { Bangers_400Regular } from '@expo-google-fonts/bangers';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palettes } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Bangers_400Regular });
  const color = useColorScheme() === 'dark' ? palettes.dark : palettes.light;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: color.paper }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }} />
    </SafeAreaProvider>
  );
}
