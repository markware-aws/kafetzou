import { useState, useCallback, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Coffee, Moon, Star, Sparkles } from 'lucide-react-native';
import {
  getReadings, getTarotReadings, getPersonalizedAstrologyReadings, getDreamReadings,
} from '@/lib/api';
import { SkeletonList } from '@/components/Skeleton';
import { theme } from '@/lib/theme';

type Tab = 'coffee' | 'tarot' | 'astrology' | 'dreams';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'μόλις τώρα';
  if (m < 60) return `πριν ${m}λ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `πριν ${h}ω`;
  return `πριν ${Math.floor(h / 24)} μέρες`;
}

function useTabData(fetcher: () => Promise<any[]>) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e.message ?? 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetcher]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  return { data, loading, refreshing, error, load, refresh };
}

// ── Coffee list ────────────────────────────────────────────────────────────
function CoffeeList() {
  const router = useRouter();
  const { data, loading, refreshing, error, load, refresh } = useTabData(getReadings);

  if (data === null && !loading) { load(); return null; }
  if (loading && data === null) return <CenterSpinner />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!data || data.length === 0) return (
    <EmptyView
      icon={<Coffee size={32} color={theme.textDim} />}
      title="Δεν υπάρχουν αναγνώσεις καφέ"
      sub="Ανέβασε μια φωτογραφία κόλπα για να ξεκινήσεις"
      actionLabel="Νέα ανάγνωση"
      onAction={() => router.push('/(tabs)/upload')}
    />
  );

  return (
    <FlatList
      style={s.list}
      contentContainerStyle={s.listContent}
      data={data}
      keyExtractor={r => r.reading_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.amber} />}
      renderItem={({ item: r }) => (
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.75}
          onPress={() => router.push({ pathname: '/reading', params: { id: r.reading_id } })}
        >
          <View style={s.cardInner}>
            <View style={s.cardIcon}><Coffee size={16} color={theme.amber} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {r.reading_result?.general_message ?? 'Ανάγνωση καφέ'}
              </Text>
              <Text style={s.cardSub} numberOfLines={2}>
                {r.reading_result?.prediction_summary}
              </Text>
            </View>
            <View style={s.cardTime}>
              <Clock size={10} color={theme.textDim} />
              <Text style={s.timeText}>{timeAgo(r.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

// ── Tarot list ─────────────────────────────────────────────────────────────
function TarotList() {
  const router = useRouter();
  const { data, loading, refreshing, error, load, refresh } = useTabData(getTarotReadings);

  if (data === null && !loading) { load(); return null; }
  if (loading && data === null) return <CenterSpinner />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!data || data.length === 0) return (
    <EmptyView
      icon={<Sparkles size={32} color={theme.textDim} />}
      title="Δεν υπάρχουν αναγνώσεις ταρό"
      sub="Τράβα χαρτιά από την καρτέλα Ταρό"
      actionLabel="Πήγαινε στο Ταρό"
      onAction={() => router.push('/(tabs)/tarot')}
    />
  );

  return (
    <FlatList
      style={s.list}
      contentContainerStyle={s.listContent}
      data={data}
      keyExtractor={r => r.reading_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.amber} />}
      renderItem={({ item: r }) => {
        const cards: string[] = r.cards ?? [];
        const isDaily = r.spread === 'daily' || cards.length === 1;
        return (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.75}
            onPress={() => router.push({ pathname: '/tarot-reading', params: { id: r.reading_id } })}
          >
            <View style={s.cardInner}>
              <View style={[s.cardIcon, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
                <Sparkles size={16} color={theme.violetLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {isDaily ? 'Ημερήσια Κάρτα' : `Ανάγνωση ${cards.length} καρτών`}
                </Text>
                <Text style={s.cardSub} numberOfLines={2}>
                  {r.reading_result?.summary ?? cards.join(' · ')}
                </Text>
              </View>
              <View style={s.cardTime}>
                <Clock size={10} color={theme.textDim} />
                <Text style={s.timeText}>{timeAgo(r.created_at)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

// ── Astrology list ─────────────────────────────────────────────────────────
function AstrologyList() {
  const router = useRouter();
  const { data, loading, refreshing, error, load, refresh } = useTabData(getPersonalizedAstrologyReadings);

  if (data === null && !loading) { load(); return null; }
  if (loading && data === null) return <CenterSpinner />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!data || data.length === 0) return (
    <EmptyView
      icon={<Star size={32} color={theme.textDim} />}
      title="Δεν υπάρχουν αστρολογικές αναγνώσεις"
      sub="Ζήτα προσωπική ανάλυση από την καρτέλα Αστρολογία"
      actionLabel="Πήγαινε στην Αστρολογία"
      onAction={() => router.push('/(tabs)/astrology')}
    />
  );

  return (
    <FlatList
      style={s.list}
      contentContainerStyle={s.listContent}
      data={data}
      keyExtractor={r => r.reading_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.amber} />}
      renderItem={({ item: r }) => (
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.75}
          onPress={() => router.push({ pathname: '/astrology-reading', params: { id: r.reading_id } })}
        >
          <View style={s.cardInner}>
            <View style={[s.cardIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <Star size={16} color={theme.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {r.sign ? r.sign.charAt(0).toUpperCase() + r.sign.slice(1) : 'Αστρολογική ανάγνωση'}
              </Text>
              <Text style={s.cardSub} numberOfLines={2}>
                {r.reading_result?.summary ?? r.reading_result?.general}
              </Text>
            </View>
            <View style={s.cardTime}>
              <Clock size={10} color={theme.textDim} />
              <Text style={s.timeText}>{timeAgo(r.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

// ── Dreams list ────────────────────────────────────────────────────────────
function DreamList() {
  const router = useRouter();
  const { data, loading, refreshing, error, load, refresh } = useTabData(getDreamReadings);

  if (data === null && !loading) { load(); return null; }
  if (loading && data === null) return <CenterSpinner />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!data || data.length === 0) return (
    <EmptyView
      icon={<Moon size={32} color={theme.textDim} />}
      title="Δεν υπάρχουν ερμηνείες ονείρων"
      sub="Περίγραψε ένα όνειρό σου από την καρτέλα Όνειρα"
      actionLabel="Πήγαινε στα Όνειρα"
      onAction={() => router.push('/(tabs)/dream')}
    />
  );

  return (
    <FlatList
      style={s.list}
      contentContainerStyle={s.listContent}
      data={data}
      keyExtractor={r => r.reading_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.amber} />}
      renderItem={({ item: r }) => (
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.75}
          onPress={() => router.push({ pathname: '/dream-reading', params: { id: r.reading_id } })}
        >
          <View style={s.cardInner}>
            <View style={[s.cardIcon, { backgroundColor: 'rgba(109,40,217,0.15)' }]}>
              <Moon size={16} color={theme.violetLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {r.reading_result?.summary ?? 'Ερμηνεία ονείρου'}
              </Text>
              <Text style={s.cardSub} numberOfLines={2}>
                {r.dream_text}
              </Text>
            </View>
            <View style={s.cardTime}>
              <Clock size={10} color={theme.textDim} />
              <Text style={s.timeText}>{timeAgo(r.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function CenterSpinner() {
  return <SkeletonList count={5} />;
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={s.retryBtn}>
        <Text style={s.retryText}>Επανάληψη</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyView({ icon, title, sub, actionLabel, onAction }: {
  icon: ReactNode; title: string; sub: string; actionLabel: string; onAction: () => void;
}) {
  return (
    <View style={s.center}>
      <View style={s.emptyOrb}>{icon}</View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
      <TouchableOpacity style={s.newBtn} onPress={onAction} activeOpacity={0.8}>
        <Text style={s.newBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'coffee',    label: 'Καφές' },
  { key: 'tarot',     label: 'Ταρό' },
  { key: 'astrology', label: 'Αστρολογία' },
  { key: 'dreams',    label: 'Όνειρα' },
];

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('coffee');

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarContent}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, activeTab === t.key && s.tabBtnActive]}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(t.key); }}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === 'coffee'    && <CoffeeList />}
      {activeTab === 'tarot'     && <TarotList />}
      {activeTab === 'astrology' && <AstrologyList />}
      {activeTab === 'dreams'    && <DreamList />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    backgroundColor: theme.surface,
  },
  tabBarContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(109,40,217,0.2)',
    borderColor: 'rgba(109,40,217,0.4)',
  },
  tabLabel: { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
  tabLabelActive: { color: theme.violetLight, fontWeight: '700' },

  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 13, color: '#f87171', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  retryText: { color: theme.text, fontWeight: '600', fontSize: 13 },

  emptyOrb: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(109,40,217,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptySub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', maxWidth: 260 },
  newBtn: { backgroundColor: theme.amber, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  card: {
    backgroundColor: theme.surface, borderRadius: 14,
    borderWidth: 1, borderColor: theme.borderLight,
    overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 3 },
  cardSub: { fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  cardTime: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  timeText: { fontSize: 10, color: theme.textDim },
});
