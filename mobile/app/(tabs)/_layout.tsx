import { Tabs } from 'expo-router';
import { Upload, LayoutDashboard, Star, Sparkles, Moon, User } from 'lucide-react-native';
import { theme } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0e0b1f',
          borderTopColor: 'rgba(109,40,217,0.25)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.amber,
        tabBarInactiveTintColor: theme.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: '#0e0b1f' },
        headerTintColor: theme.textMuted,
        headerTitleStyle: { color: theme.text, fontSize: 15, fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Καφές',
          tabBarIcon: ({ color, size }) => <Upload size={size - 2} color={color} />,
          headerTitle: '☕  Διάβασε τον Καφέ μου',
        }}
      />
      <Tabs.Screen
        name="tarot"
        options={{
          title: 'Ταρό',
          tabBarIcon: ({ color, size }) => <Star size={size - 2} color={color} />,
          headerTitle: '🃏 Ταρό',
        }}
      />
      <Tabs.Screen
        name="astrology"
        options={{
          title: 'Αστρολογία',
          tabBarIcon: ({ color, size }) => <Sparkles size={size - 2} color={color} />,
          headerTitle: '✨ Αστρολογία',
        }}
      />
      <Tabs.Screen
        name="dream"
        options={{
          title: 'Όνειρα',
          tabBarIcon: ({ color, size }) => <Moon size={size - 2} color={color} />,
          headerTitle: '🌙 Ονειροκρίτης',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Ιστορικό',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
          headerTitle: 'Ιστορικό',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Προφίλ',
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} />,
          headerTitle: 'Προφίλ',
        }}
      />
    </Tabs>
  );
}
