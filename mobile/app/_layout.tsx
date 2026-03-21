import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Hub } from 'aws-amplify/utils';
import { configureAmplify } from '@/lib/amplify-config';
import { getUser } from '@/lib/auth';
import { theme } from '@/lib/theme';

configureAmplify();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // AUTH DISABLED — bypass login for UI testing
    setReady(true);
  }, []);

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signInWithRedirect') router.replace('/(tabs)/upload');
      if (payload.event === 'signInWithRedirect_failure') router.replace('/login');
    });
    return unsubscribe;
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.amber} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
        <Stack.Screen name="reading" options={{ title: 'Ανάγνωση Καφέ', headerBackTitle: 'Πίσω' }} />
        <Stack.Screen name="tarot-reading" options={{ title: 'Ανάγνωση Ταρό', headerBackTitle: 'Πίσω' }} />
        <Stack.Screen name="astrology-reading" options={{ title: 'Αστρολογική Ανάγνωση', headerBackTitle: 'Πίσω' }} />
        <Stack.Screen name="dream-reading" options={{ title: 'Ανάλυση Ονείρου', headerBackTitle: 'Πίσω' }} />
      </Stack>
    </View>
  );
}
