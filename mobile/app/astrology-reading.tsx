import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Sparkles, Heart, Briefcase, Star, Eye } from 'lucide-react-native';
import { getPersonalizedAstrologyReading } from '@/lib/api';
import { SIGN_BY_ID } from '@/lib/astrology';
import { theme } from '@/lib/theme';

function Section({ icon: Icon, label, text, accent = false, warning = false }: {
  icon: any; label: string; text: string; accent?: boolean; warning?: boolean;
}) {
  const borderColor = warning ? theme.amberGlow : accent ? 'rgba(245,158,11,0.2)' : theme.borderLight;
  const bgColor = warning ? theme.amberDim : accent ? 'rgba(245,158,11,0.05)' : theme.surface;
  const iconColor = warning ? theme.amber : accent ? theme.amber : theme.violetLight;
  const labelColor = warning ? theme.amber : accent ? '#fde68a' : theme.violetLight;
  return (
    <View style={[s.box, { borderColor, backgroundColor: bgColor }]}>
      <View style={s.boxHeader}>
        <Icon size={14} color={iconColor} />
        <Text style={[s.boxLabel, { color: labelColor }]}>{label}</Text>
      </View>
      <Text style={s.boxText}>{text}</Text>
    </View>
  );
}

export default function AstrologyReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getPersonalizedAstrologyReading(id)
      .then(setReading)
      .catch(() => setError('Αδύνατη η φόρτωση'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color={theme.amber} size="large" /></View>;
  if (error || !reading) return <View style={s.center}><Text style={s.error}>{error || 'Δεν βρέθηκε ανάγνωση'}</Text></View>;

  const sign = SIGN_BY_ID[reading.sign];
  const r = reading.reading_result;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Sign badge */}
      {sign && (
        <View style={s.signBadge}>
          <Text style={s.signSymbol}>{sign.symbol}</Text>
          <View>
            <Text style={s.signName}>{sign.nameGr}</Text>
            <Text style={s.signDates}>{sign.dates}</Text>
          </View>
        </View>
      )}

      {/* Summary quote */}
      <View style={s.summaryBox}>
        <Text style={s.summaryText}>"{r?.summary}"</Text>
      </View>

      <Section icon={Sparkles} label="Γενικό Μήνυμα" text={r?.general} accent />
      <Section icon={Heart} label="Αγάπη" text={r?.love} />
      <Section icon={Briefcase} label="Καριέρα" text={r?.career} />
      <Section icon={Star} label="Τύχη" text={r?.luck} />
      {r?.moon_insight && <Section icon={Star} label="Σελήνη" text={r.moon_insight} />}
      {r?.ascendant_insight && <Section icon={Sparkles} label="Ωροσκόπος" text={r.ascendant_insight} />}
      <Section icon={Eye} label="Προσοχή" text={r?.warning} warning />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 14, color: theme.rose },
  signBadge: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16 },
  signSymbol: { fontSize: 40 },
  signName: { fontSize: 18, fontWeight: '700', color: theme.text },
  signDates: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  summaryBox: { backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 14, padding: 14 },
  summaryText: { fontSize: 14, color: '#fde68a', fontStyle: 'italic', lineHeight: 21 },
  box: { borderWidth: 1, borderRadius: 14, padding: 14 },
  boxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  boxLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  boxText: { fontSize: 14, color: theme.text, lineHeight: 21 },
});
