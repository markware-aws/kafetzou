import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Eye, ChevronRight, Coffee, Sparkles } from 'lucide-react-native';
import { getReadings } from '@/lib/api';
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

export default function DashboardScreen() {
  const router = useRouter();
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getReadings();
      setReadings(data);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(true); }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.amber} size="large" />
        <Text style={s.loadingText}>Loading readings…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (readings.length === 0) {
    return (
      <View style={s.center}>
        <View style={s.emptyOrb}>
          <Coffee size={32} color={theme.textDim} />
        </View>
        <Text style={s.emptyTitle}>No readings yet</Text>
        <Text style={s.emptySub}>Upload your first coffee cup photo to begin</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => router.push('/(tabs)/upload')} activeOpacity={0.8}>
          <Text style={s.newBtnText}>Start reading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={s.root}
      contentContainerStyle={s.list}
      data={readings}
      keyExtractor={r => r.reading_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.amber} />}
      renderItem={({ item: r }) => (
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.75}
          onPress={() => router.push({ pathname: '/reading', params: { id: r.reading_id } })}
        >
          <View style={s.cardBody}>
            <View style={{ flex: 1 }}>
              <View style={s.cardRow}>
                <Sparkles size={12} color={theme.amber} />
                <Text style={s.cardTitle} numberOfLines={1}>{r.reading_result?.general_message ?? 'Coffee reading'}</Text>
              </View>
              <Text style={s.cardSub} numberOfLines={2}>{r.reading_result?.prediction_summary}</Text>
              <View style={s.symbols}>
                {(r.symbols_detected ?? []).slice(0, 4).map((sym: string) => (
                  <View key={sym} style={s.symbolRow}>
                    <Eye size={10} color={theme.textMuted} />
                    <Text style={s.symbolText}>{sym}</Text>
                  </View>
                ))}
                {(r.symbols_detected ?? []).length > 4 && (
                  <Text style={s.moreText}>+{r.symbols_detected.length - 4}</Text>
                )}
              </View>
            </View>
            <View style={s.cardMeta}>
              <View style={s.timeRow}>
                <Clock size={10} color={theme.textDim} />
                <Text style={s.timeText}>{timeAgo(r.created_at)}</Text>
              </View>
              <ChevronRight size={16} color={theme.textDim} />
            </View>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  loadingText: { fontSize: 13, color: theme.textMuted, marginTop: 8 },
  errorText: { fontSize: 13, color: '#f87171', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  retryText: { color: theme.text, fontWeight: '600', fontSize: 13 },

  emptyOrb: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(109,40,217,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptySub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', maxWidth: 240 },
  newBtn: { backgroundColor: theme.amber, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  card: {
    backgroundColor: theme.surface, borderRadius: 16,
    borderWidth: 1, borderColor: theme.borderLight,
    overflow: 'hidden',
  },
  cardBody: { flexDirection: 'row', padding: 16, gap: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: theme.text, flex: 1 },
  cardSub: { fontSize: 12, color: theme.textMuted, lineHeight: 18, marginBottom: 8 },
  symbols: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  symbolText: { fontSize: 11, color: theme.textMuted, textTransform: 'capitalize' },
  moreText: { fontSize: 11, color: theme.textDim },
  cardMeta: { alignItems: 'flex-end', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 10, color: theme.textDim },
});
