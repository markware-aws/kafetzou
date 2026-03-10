import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Hub } from 'aws-amplify/utils';
import * as SplashScreen from 'expo-splash-screen';
import { configureAmplify } from '@/lib/amplify-config';
import { getUser } from '@/lib/auth';
import { theme } from '@/lib/theme';

configureAmplify();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const opacity = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value, flex: 1 }));

  useEffect(() => {
    getUser().then((user) => {
      const inAuth = segments[0] === 'login';
      if (!user && !inAuth) router.replace('/login');
      else if (user && inAuth) router.replace('/(tabs)/upload');
      setReady(true);
      SplashScreen.hideAsync().then(() => {
        opacity.value = withTiming(1, { duration: 350 });
      });
    });
  }, []);

  // Handle Google OAuth redirect back into the app
  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signInWithRedirect') {
        router.replace('/(tabs)/upload');
      }
      if (payload.event === 'signInWithRedirect_failure') {
        router.replace('/login');
      }
    });
    return unsubscribe;
  }, []);

  if (!ready) return null;

  return (
    <Animated.View style={fadeStyle}>
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
    </Animated.View>
  );
}
