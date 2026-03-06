import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { configureAmplify } from '@/lib/amplify-config';
import { getUser } from '@/lib/auth';
import { theme } from '@/lib/theme';

configureAmplify();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getUser().then((user) => {
      const inAuth = segments[0] === 'login';
      if (!user && !inAuth) router.replace('/login');
      else if (user && inAuth) router.replace('/(tabs)/upload');
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor={theme.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0e0b1f' },
          headerTintColor: theme.textMuted,
          headerTitleStyle: { color: theme.text, fontSize: 15, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="reading"
          options={{
            title: 'Coffee Reading',
            headerBackTitle: 'Readings',
          }}
        />
      </Stack>
    </>
  );
}
