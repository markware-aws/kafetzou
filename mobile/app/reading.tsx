import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { ReadingCard } from '@/components/ReadingCard';
import { getReading } from '@/lib/api';
import { theme } from '@/lib/theme';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) { setError('Δεν βρέθηκε ID'); setLoading(false); return; }
    getReading(id)
      .then(setItem)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.amber} size="large" />
        <Text style={s.loadingText}>Διαβάζω τον καφέ…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {item && (
        <>
          <View style={s.meta}>
            <View style={s.timeRow}>
              <Clock size={12} color={theme.textDim} />
              <Text style={s.timeText}>{timeAgo(item.created_at)}</Text>
            </View>
            {item.tokens_used && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.tokens_used} tokens</Text>
              </View>
            )}
          </View>

          <ReadingCard
            reading={item.reading_result}
            symbolsDetected={item.symbols_detected ?? []}
            lettersDetected={item.letters_detected ?? []}
          />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: theme.textMuted },
  errorText: { fontSize: 13, color: '#f87171' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: theme.textDim },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1, borderColor: theme.border },
  badgeText: { fontSize: 10, color: theme.textDim },
});
