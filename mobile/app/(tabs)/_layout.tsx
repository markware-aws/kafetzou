import { Tabs } from 'expo-router';
import { Upload, LayoutDashboard } from 'lucide-react-native';
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#0e0b1f' },
        headerTintColor: theme.textMuted,
        headerTitleStyle: { color: theme.text, fontSize: 15, fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Νέα Ανάγνωση',
          tabBarIcon: ({ color, size }) => <Upload size={size - 2} color={color} />,
          headerTitle: '☕  Διάβασε τον Καφέ μου',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Οι Αναγνώσεις μου',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
          headerTitle: 'Οι Αναγνώσεις μου',
        }}
      />
    </Tabs>
  );
}
