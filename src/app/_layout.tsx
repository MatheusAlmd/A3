import React from 'react';
import { ActivityIndicator, Platform, View, useWindowDimensions } from 'react-native';
import { Stack, ThemeProvider, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { SessionProvider, useSession } from '../state/session';
import { FeedbackProvider } from '../ui/components';
import { colors as c } from '../ui/theme';
function RootNavigator() {
  const { user, restoring } = useSession();
  if (restoring)
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.paper }}>
        <ActivityIndicator color={c.green} />
      </View>
    );
  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: c.green,
          background: c.paper,
          card: c.paper,
          text: c.ink,
          border: c.border,
          notification: c.green,
        },
      }}
    >
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width > 600;
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.paper,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={c.green} />
      </View>
    );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#E7EBDF',
        paddingVertical: wide ? 18 : 0,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: Platform.OS === 'web' ? 480 : 620,
          overflow: 'hidden',
          borderRadius: wide ? 25 : 0,
          backgroundColor: c.paper,
          ...(wide ? { borderWidth: 1, borderColor: '#CDD6C5' } : {}),
        }}
      >
        <SafeAreaProvider>
          <SessionProvider>
            <FeedbackProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </FeedbackProvider>
          </SessionProvider>
        </SafeAreaProvider>
      </View>
    </View>
  );
}
