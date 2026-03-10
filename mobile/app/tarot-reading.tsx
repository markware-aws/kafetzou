import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Star, Sparkles } from 'lucide-react-native';
import { getTarotReading } from '@/lib/api';
import { getCardImageSource, getCardDisplayName } from '@/lib/tarot';
import { theme } from '@/lib/theme';

const POSITION_LABELS = ['Παρελθόν', 'Παρόν', 'Μέλλον'];
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48 - 24) / 3;

export default function TarotReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getTarotReading(id)
      .then(setReading)
      .catch(() => setError('Αδύνατη η φόρτωση'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={theme.amber} size="large" />
    </View>
  );

  if (error || !reading) return (
    <View style={s.center}>
      <Text style={s.error}>{error || 'Δεν βρέθηκε ανάγνωση'}</Text>
    </View>
  );

  const cards: string[] = reading.reading_result?.cards ?? [];
  const r = reading.reading_result;
  const singleCard = cards.length === 1;
  const singleCardW = SCREEN_W * 0.42;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Cards */}
      <View style={[s.cardsRow, singleCard && { justifyContent: 'center' }]}>
        {cards.map((card, i) => {
          const imgSrc = getCardImageSource(card);
          const w = singleCard ? singleCardW : CARD_W;
          return (
            <View key={card} style={{ alignItems: 'center', gap: 6 }}>
              {!singleCard && <Text style={s.posLabel}>{POSITION_LABELS[i]}</Text>}
              <View style={[s.cardWrap, { width: w, height: w * 1.6 }]}>
                {imgSrc
                  ? <Image source={imgSrc} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  : <View style={s.cardBack}><Star size={18} color={theme.violetLight} /></View>}
              </View>
              <Text style={s.cardName} numberOfLines={2}>{getCardDisplayName(card)}</Text>
            </View>
          );
        })}
      </View>

      {/* Summary */}
      <View style={s.summaryBox}>
        <View style={s.row}>
          <Sparkles size={14} color={theme.amber} />
          <Text style={s.sectionTitle}>Η Ουσία</Text>
        </View>
        <Text style={s.sectionText}>{r?.summary}</Text>
      </View>

      {/* Interpretation */}
      <View style={s.box}>
        <Text style={s.sectionTitle}>Ερμηνεία</Text>
        <Text style={s.sectionText}>{r?.interpretation}</Text>
      </View>

      {/* Advice */}
      <View style={s.box}>
        <Text style={s.sectionTitle}>Συμβουλή</Text>
        <Text style={s.sectionText}>{r?.advice}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 14, color: theme.rose },
  cardsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  posLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  cardWrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  cardBack: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  cardName: { fontSize: 10, color: theme.amber, textAlign: 'center', fontWeight: '600' },
  summaryBox: {
    backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 14, padding: 16,
  },
  box: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.violetLight, marginBottom: 6 },
  sectionText: { fontSize: 14, color: theme.text, lineHeight: 21 },
});
