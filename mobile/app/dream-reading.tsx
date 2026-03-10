import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Moon, Sparkles, Heart, Lightbulb } from 'lucide-react-native';
import { getDreamReading } from '@/lib/api';
import { theme } from '@/lib/theme';

export default function DreamReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getDreamReading(id)
      .then(setReading)
      .catch(() => setError('Αδύνατη η φόρτωση'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color={theme.amber} size="large" /></View>;
  if (error || !reading) return <View style={s.center}><Text style={s.error}>{error || 'Δεν βρέθηκε ανάγνωση'}</Text></View>;

  const r = reading.reading_result;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Original dream text */}
      {reading.dream_text && (
        <View style={s.dreamTextBox}>
          <Text style={s.dreamTextLabel}>ΤΟ ΟΝΕΙΡΟ ΣΟΥ</Text>
          <Text style={s.dreamText}>{reading.dream_text}</Text>
        </View>
      )}

      {/* Summary */}
      <View style={s.summaryBox}>
        <Moon size={18} color={theme.violetLight} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={s.summaryText}>"{r?.summary}"</Text>
      </View>

      {/* Interpretation */}
      <View style={s.box}>
        <View style={s.boxHeader}>
          <Sparkles size={14} color={theme.amber} />
          <Text style={[s.boxLabel, { color: '#fde68a' }]}>ΕΡΜΗΝΕΙΑ</Text>
        </View>
        <Text style={s.boxText}>{r?.interpretation}</Text>
      </View>

      {/* Symbols */}
      {r?.symbols?.length > 0 && (
        <View style={s.box}>
          <View style={s.boxHeader}>
            <Text style={s.symbolStar}>✦</Text>
            <Text style={s.boxLabel}>ΣΥΜΒΟΛΑ & ΘΕΜΑΤΑ</Text>
          </View>
          <View style={s.pillsRow}>
            {r.symbols.map((sym: string, i: number) => (
              <View key={i} style={s.pill}>
                <Text style={s.pillText}>{sym}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Emotions */}
      <View style={s.box}>
        <View style={s.boxHeader}>
          <Heart size={14} color={theme.violetLight} />
          <Text style={s.boxLabel}>ΣΥΝΑΙΣΘΗΜΑΤΑ</Text>
        </View>
        <Text style={s.boxText}>{r?.emotions}</Text>
      </View>

      {/* Advice */}
      <View style={s.box}>
        <View style={s.boxHeader}>
          <Lightbulb size={14} color={theme.violetLight} />
          <Text style={s.boxLabel}>ΜΗΝΥΜΑ & ΣΥΜΒΟΥΛΗ</Text>
        </View>
        <Text style={s.boxText}>{r?.advice}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 14, color: theme.rose },

  dreamTextBox: {
    backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.borderLight, borderRadius: 14, padding: 14,
  },
  dreamTextLabel: { fontSize: 9, color: theme.textDim, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  dreamText: { fontSize: 14, color: theme.textMuted, lineHeight: 21, fontStyle: 'italic' },

  summaryBox: {
    backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.3)', borderRadius: 16, padding: 18,
  },
  summaryText: { fontSize: 15, color: theme.violetLight, fontStyle: 'italic', lineHeight: 23, textAlign: 'center' },

  box: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, padding: 14 },
  boxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  boxLabel: { fontSize: 10, color: theme.violetLight, fontWeight: '700', letterSpacing: 0.8 },
  boxText: { fontSize: 14, color: theme.text, lineHeight: 21 },
  symbolStar: { fontSize: 14, color: theme.violetLight },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.4)',
    backgroundColor: 'rgba(109,40,217,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  pillText: { fontSize: 12, color: theme.violetLight },
});
