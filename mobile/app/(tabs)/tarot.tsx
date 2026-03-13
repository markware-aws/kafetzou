import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Sparkles, RefreshCw, Sun, Coins } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { createTarotReading, getDailyTarotCard, TarotReadingResponse } from '@/lib/api';
import { getCardImageSource, getCardDisplayName } from '@/lib/tarot';
import { InsufficientCreditsModal } from '@/components/InsufficientCreditsModal';
import { theme } from '@/lib/theme';

type Spread = 'one_card' | 'three_card';
const POSITION_LABELS = ['Παρελθόν', 'Παρόν', 'Μέλλον'];
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48 - 24) / 3; // 3 cards with gaps

// ── Daily card ────────────────────────────────────────────────────────────────

function DailyCardSection() {
  const [daily, setDaily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    getDailyTarotCard()
      .then(setDaily)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[s.dailyCard, { height: 80, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.amber} size="small" />
      </View>
    );
  }
  if (!daily) return null;

  const card = daily.reading_result.cards[0];
  const cardGr = daily.reading_result.card_gr;
  const imgSrc = getCardImageSource(card);

  return (
    <View style={s.dailyCard}>
      <View style={s.dailyHeader}>
        <Sun size={14} color={theme.amber} />
        <Text style={s.dailyTitle}>Η Ημερήσια Κάρτα σου</Text>
        <View style={s.freeBadge}><Text style={s.freeBadgeText}>Δωρεάν</Text></View>
      </View>

      {!flipped ? (
        <View style={s.dailyMysteryWrap}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setFlipped(true); }}
            activeOpacity={0.85}
            style={s.dailyMysteryCard}
          >
            <View style={s.cardBackCircle}>
              <Star size={24} color={theme.violetLight} />
            </View>
            <Text style={s.tapHint}>Άγγιξε</Text>
          </TouchableOpacity>
          <Text style={s.dailyMysteryTitle}>Δες την τύχη σου σήμερα</Text>
          <Text style={s.dailyMysterySub}>Η κάρτα σε περιμένει — άγγιξέ την για αποκάλυψη</Text>
        </View>
      ) : (
        <View style={s.dailyBody}>
          <View style={s.dailyImgWrap}>
            {imgSrc ? (
              <Image source={imgSrc} style={s.dailyImg} resizeMode="cover" />
            ) : (
              <View style={[s.cardBack, { flex: 1 }]}>
                <Star size={18} color={theme.violetLight} />
              </View>
            )}
          </View>
          <View style={s.dailyInfo}>
            <Text style={s.dailyCardGr}>{cardGr}</Text>
            <Text style={s.dailyCardEn}>{getCardDisplayName(card)}</Text>
            <Text style={s.dailyLabel}>ΟΡΘΗ</Text>
            <Text style={s.dailyMeaning}>{daily.reading_result.meaning_upright}</Text>
            <Text style={[s.dailyLabel, { marginTop: 8 }]}>ΑΝΕΣΤΡΑΜΜΕΝΗ</Text>
            <Text style={[s.dailyMeaning, { color: theme.textMuted }]}>{daily.reading_result.meaning_reversed}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Card face / back ──────────────────────────────────────────────────────────

function CardSlot({ card, revealed, onReveal, width }: {
  card: string; revealed: boolean; onReveal: () => void; width: number;
}) {
  const imgSrc = getCardImageSource(card);
  const height = width * 1.6;

  return (
    <TouchableOpacity onPress={onReveal} activeOpacity={0.85} style={{ width }}>
      <View style={[s.cardSlot, { height }]}>
        {revealed && imgSrc ? (
          <Image source={imgSrc} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={s.cardBack}>
            <View style={s.cardBackCircle}>
              <Star size={16} color={theme.violetLight} />
            </View>
            <Text style={s.tapHint}>Άγγιξε</Text>
          </View>
        )}
      </View>
      {revealed && (
        <Text style={s.cardName} numberOfLines={2}>{getCardDisplayName(card)}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TarotScreen() {
  const router = useRouter();
  const [spread, setSpread] = useState<Spread>('three_card');
  const [result, setResult] = useState<TarotReadingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  async function handleDraw() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true); setError(''); setResult(null); setRevealed([]);
    try {
      const data = await createTarotReading(spread);
      setResult(data);
      setRevealed(new Array(data.reading.cards.length).fill(false));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if ((e as any).status === 402) setShowCreditsModal(true);
      else setError(e.message ?? 'Κάτι πήγε στραβά');
    } finally {
      setLoading(false);
    }
  }

  function revealCard(i: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealed(prev => { const n = [...prev]; n[i] = true; return n; });
  }

  const allRevealed = revealed.length > 0 && revealed.every(Boolean);
  const singleCard = result?.reading.cards.length === 1;
  const singleCardW = SCREEN_W * 0.42;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerOrb}>
          <Star size={26} color={theme.amber} />
        </View>
        <Text style={s.headerTitle}>Ανάγνωση Ταρό</Text>
        <Text style={s.headerSub}>Άφησε τις κάρτες να αποκαλύψουν το μονοπάτι σου</Text>
      </View>

      {/* Daily card */}
      <DailyCardSection />

      <InsufficientCreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />

      {!result ? (
        <>
          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerLabel}>AI ΑΝΑΓΝΩΣΗ</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Spread selector */}
          <View style={s.spreadRow}>
            {(['one_card', 'three_card'] as Spread[]).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => setSpread(key)}
                style={[s.spreadBtn, spread === key && s.spreadBtnActive]}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={spread === key ? theme.amber : theme.textDim} />
                <Text style={[s.spreadLabel, spread === key && s.spreadLabelActive]}>
                  {key === 'one_card' ? '1 Κάρτα' : '3 Κάρτες'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Draw button */}
          <TouchableOpacity style={s.drawBtn} onPress={handleDraw} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <><Star size={18} color={theme.amber} /><Text style={s.drawBtnText}>Τράβηξε κάρτες</Text></>}
          </TouchableOpacity>

          <View style={s.costRow}>
            <Coins size={12} color={theme.amberDark} />
            <Text style={s.costText}>1 credit</Text>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}
        </>
      ) : (
        <View style={s.resultWrap}>
          {/* Cards grid */}
          <View style={[s.cardsRow, singleCard && { justifyContent: 'center' }]}>
            {result.reading.cards.map((card, i) => (
              <View key={card} style={{ alignItems: 'center', gap: 6 }}>
                {!singleCard && (
                  <Text style={s.positionLabel}>{POSITION_LABELS[i]}</Text>
                )}
                <CardSlot
                  card={card}
                  revealed={revealed[i]}
                  onReveal={() => revealCard(i)}
                  width={singleCard ? singleCardW : CARD_W}
                />
              </View>
            ))}
          </View>

          {!allRevealed && (
            <Text style={s.revealHint}>Άγγιξε κάθε κάρτα για να αποκαλύψεις την ερμηνεία</Text>
          )}

          {allRevealed && (
            <View style={s.readingWrap}>
              <View style={s.summaryBox}>
                <View style={s.sectionHeader}>
                  <Sparkles size={14} color={theme.amber} />
                  <Text style={s.sectionTitle}>Η Ουσία</Text>
                </View>
                <Text style={s.sectionText}>{result.reading.summary}</Text>
              </View>

              <View style={s.sectionBox}>
                <Text style={s.sectionTitle}>Ερμηνεία</Text>
                <Text style={s.sectionText}>{result.reading.interpretation}</Text>
              </View>

              <View style={s.sectionBox}>
                <Text style={s.sectionTitle}>Συμβουλή</Text>
                <Text style={s.sectionText}>{result.reading.advice}</Text>
              </View>

              <TouchableOpacity
                style={s.resetBtn}
                onPress={() => { setResult(null); setRevealed([]); setError(''); }}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color={theme.violetLight} />
                <Text style={s.resetBtnText}>Νέα Ανάγνωση</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },

  header: { alignItems: 'center', marginBottom: 28 },
  headerOrb: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.violetDim, borderWidth: 1, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 },
  headerSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },

  // Daily mystery state
  dailyMysteryWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  dailyMysteryCard: {
    width: 100, height: 150, borderRadius: 14,
    backgroundColor: theme.surface, borderWidth: 2, borderColor: 'rgba(109,40,217,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: theme.violet, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dailyMysteryTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
  dailyMysterySub: { fontSize: 12, color: theme.textMuted, textAlign: 'center' },

  // Daily card
  dailyCard: {
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 16, padding: 16, marginBottom: 24,
  },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  dailyTitle: { fontSize: 13, fontWeight: '600', color: '#fde68a', flex: 1 },
  freeBadge: {
    backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  freeBadgeText: { fontSize: 10, color: theme.amberDark, fontWeight: '600' },
  dailyBody: { flexDirection: 'row', gap: 14 },
  dailyImgWrap: {
    width: 72, borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)',
    aspectRatio: 2 / 3,
  },
  dailyImg: { width: '100%', height: '100%' },
  dailyInfo: { flex: 1 },
  dailyCardGr: { fontSize: 13, fontWeight: '600', color: '#fde68a', marginBottom: 2 },
  dailyCardEn: { fontSize: 11, color: theme.textMuted, marginBottom: 10 },
  dailyLabel: { fontSize: 9, color: theme.textDim, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  dailyMeaning: { fontSize: 11, color: theme.violetLight, lineHeight: 16 },

  // Cards
  cardSlot: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.border,
  },
  cardBack: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.surface,
  },
  cardBackCircle: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  tapHint: { fontSize: 10, color: theme.textDim },
  cardName: { fontSize: 10, color: theme.amber, textAlign: 'center', marginTop: 4, fontWeight: '600' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(109,40,217,0.2)' },
  dividerLabel: { fontSize: 10, color: theme.textDim, letterSpacing: 1.5, fontWeight: '600' },

  // Spread selector
  spreadRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  spreadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 14, backgroundColor: theme.surface,
  },
  spreadBtnActive: {
    borderColor: 'rgba(245,158,11,0.5)',
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  spreadLabel: { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
  spreadLabelActive: { color: theme.amber },

  // Draw button
  drawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: theme.violet, borderRadius: 16, paddingVertical: 16,
    shadowColor: theme.violet, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  drawBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
  costText: { fontSize: 12, color: theme.amberDark },
  error: { fontSize: 13, color: theme.rose, textAlign: 'center', marginTop: 14 },
  errorBox: {
    backgroundColor: theme.roseDim, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: theme.rose, textAlign: 'center', lineHeight: 19 },

  // Results
  resultWrap: { gap: 20 },
  cardsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  positionLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  revealHint: { fontSize: 12, color: theme.textDim, textAlign: 'center' },
  readingWrap: { gap: 14 },
  summaryBox: {
    backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 14, padding: 16,
  },
  sectionBox: {
    backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.borderLight, borderRadius: 14, padding: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.violetLight, marginBottom: 8 },
  sectionText: { fontSize: 14, color: theme.text, lineHeight: 21 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 12,
  },
  resetBtnText: { fontSize: 14, color: theme.violetLight, fontWeight: '500' },
});
