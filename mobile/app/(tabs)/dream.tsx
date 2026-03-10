import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Moon, Sparkles, Heart, Lightbulb, RefreshCw, Coins, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { createDreamReading, DreamReading } from '@/lib/api';
import { InsufficientCreditsModal } from '@/components/InsufficientCreditsModal';
import { theme } from '@/lib/theme';

const MAX_CHARS = 2000;
const MIN_CHARS = 10;

export default function DreamScreen() {
  const [dreamText, setDreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DreamReading | null>(null);
  const [error, setError] = useState('');
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  async function handleSubmit() {
    const text = dreamText.trim();
    if (text.length < MIN_CHARS) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await createDreamReading(text);
      setResult(data.reading);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if ((e as any).status === 402) setShowCreditsModal(true);
      else setError(e.message ?? 'Κάτι πήγε στραβά');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null); setDreamText(''); setError('');
  }

  const charRatio = dreamText.length / MAX_CHARS;
  const canSubmit = dreamText.trim().length >= MIN_CHARS;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerOrb}>
            <Moon size={24} color={theme.violetLight} />
          </View>
          <Text style={s.headerTitle}>Ονειροκρίτης</Text>
          <Text style={s.headerSub}>Περίγραψε το όνειρό σου και αποκάλυψε το κρυφό του μήνυμα</Text>
        </View>

        {!result ? (
          <View style={s.formWrap}>
            {/* Text input card */}
            <View style={s.inputCard}>
              <View style={s.inputLabel}>
                <BookOpen size={13} color={theme.violetLight} />
                <Text style={s.inputLabelText}>Διήγησε το όνειρό σου</Text>
              </View>
              <TextInput
                style={s.textArea}
                value={dreamText}
                onChangeText={t => setDreamText(t.slice(0, MAX_CHARS))}
                placeholder={'Ήμουν σε έναν παλιό ναό, η σελήνη ήταν πλήρης και μια αράχνη ύφαινε έναν ιστό από χρυσή κλωστή…'}
                placeholderTextColor={theme.textDim}
                multiline
                numberOfLines={7}
                textAlignVertical="top"
                autoCorrect={false}
              />
              <View style={s.inputFooter}>
                <Text style={s.minHint}>Τουλάχιστον {MIN_CHARS} χαρακτήρες</Text>
                <Text style={[s.charCount, charRatio > 0.9 && { color: theme.amber }]}>
                  {dreamText.length}/{MAX_CHARS}
                </Text>
              </View>
            </View>

            <InsufficientCreditsModal
              visible={showCreditsModal}
              onClose={() => setShowCreditsModal(false)}
            />

            {/* Error */}
            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, !canSubmit && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={loading || !canSubmit}
              activeOpacity={0.85}
            >
              {loading
                ? <><ActivityIndicator color="#fff" size="small" /><Text style={s.submitBtnText}>Διαβάζω τα σύμβολα…</Text></>
                : <><Moon size={16} color="#fff" /><Text style={s.submitBtnText}>Ερμήνευσε το Όνειρο</Text></>}
            </TouchableOpacity>

            {!loading && (
              <View style={s.costRow}>
                <Coins size={12} color={theme.amberDark} />
                <Text style={s.costText}>1 credit</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={s.resultWrap}>
            {/* Summary quote */}
            <View style={s.summaryBox}>
              <Moon size={18} color={theme.violetLight} style={{ alignSelf: 'center', marginBottom: 8 }} />
              <Text style={s.summaryText}>"{result.summary}"</Text>
            </View>

            {/* Interpretation */}
            <View style={s.sectionBox}>
              <View style={s.sectionHeader}>
                <Sparkles size={14} color={theme.amber} />
                <Text style={[s.sectionLabel, { color: '#fde68a' }]}>ΕΡΜΗΝΕΙΑ</Text>
              </View>
              <Text style={s.sectionText}>{result.interpretation}</Text>
            </View>

            {/* Symbols */}
            <View style={s.sectionBox}>
              <View style={s.sectionHeader}>
                <Text style={s.symbolStar}>✦</Text>
                <Text style={s.sectionLabel}>ΣΥΜΒΟΛΑ & ΘΕΜΑΤΑ</Text>
              </View>
              <View style={s.pillsRow}>
                {result.symbols.map((sym, i) => (
                  <View key={i} style={s.pill}>
                    <Text style={s.pillText}>{sym}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Emotions */}
            <View style={s.sectionBox}>
              <View style={s.sectionHeader}>
                <Heart size={14} color={theme.violetLight} />
                <Text style={s.sectionLabel}>ΣΥΝΑΙΣΘΗΜΑΤΑ</Text>
              </View>
              <Text style={s.sectionText}>{result.emotions}</Text>
            </View>

            {/* Advice */}
            <View style={s.sectionBox}>
              <View style={s.sectionHeader}>
                <Lightbulb size={14} color={theme.violetLight} />
                <Text style={s.sectionLabel}>ΜΗΝΥΜΑ & ΣΥΜΒΟΥΛΗ</Text>
              </View>
              <Text style={s.sectionText}>{result.advice}</Text>
            </View>

            {/* Reset */}
            <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.8}>
              <RefreshCw size={14} color={theme.violetLight} />
              <Text style={s.resetBtnText}>Ερμήνευσε Άλλο Όνειρο</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 19 },

  formWrap: { gap: 14 },
  inputCard: {
    backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.border, borderRadius: 16, padding: 16,
  },
  inputLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  inputLabelText: { fontSize: 12, color: theme.violetLight, fontWeight: '500' },
  textArea: {
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14, fontSize: 14, color: theme.text,
    minHeight: 140, lineHeight: 21,
  },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  minHint: { fontSize: 11, color: theme.textDim },
  charCount: { fontSize: 11, color: theme.textDim },

  errorBox: {
    backgroundColor: theme.roseDim, borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 8,
  },
  errorText: { fontSize: 13, color: theme.rose, flex: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: theme.violet, borderRadius: 14, paddingVertical: 15,
    shadowColor: theme.violet, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  costText: { fontSize: 12, color: theme.amberDark },

  resultWrap: { gap: 14 },
  summaryBox: {
    backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.3)', borderRadius: 16, padding: 18,
  },
  summaryText: { fontSize: 15, color: theme.violetLight, fontStyle: 'italic', lineHeight: 23, textAlign: 'center' },

  sectionBox: {
    backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.borderLight, borderRadius: 14, padding: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 10, color: theme.violetLight, fontWeight: '700', letterSpacing: 0.8 },
  sectionText: { fontSize: 14, color: theme.text, lineHeight: 21 },
  symbolStar: { fontSize: 14, color: theme.violetLight },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)',
    backgroundColor: 'rgba(109,40,217,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  pillText: { fontSize: 12, color: theme.violetLight },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 13,
  },
  resetBtnText: { fontSize: 14, color: theme.violetLight, fontWeight: '500' },
});
