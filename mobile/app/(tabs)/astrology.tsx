import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import {
  Sparkles, Heart, Briefcase, Star, AlertTriangle,
  ChevronLeft, RefreshCw, User, Coins,
} from 'lucide-react-native';
import {
  getHoroscope, createPersonalizedAstrologyReading,
  getBirthProfile, AstrologyReading,
} from '@/lib/api';
import * as Haptics from 'expo-haptics';
import { InsufficientCreditsModal } from '@/components/InsufficientCreditsModal';
import {
  SIGNS, SIGN_BY_ID, ELEMENT_COLORS, ELEMENT_BORDER, ELEMENT_BG, getSignFromDob,
} from '@/lib/astrology';
import { theme } from '@/lib/theme';

type Period = 'daily' | 'weekly' | 'monthly';
const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Ημερήσια', weekly: 'Εβδομαδιαία', monthly: 'Μηνιαία',
};
const SEX_OPTIONS = ['Άνδρας', 'Γυναίκα', 'Άλλο'];
const EYE_COLORS = ['Μαύρα', 'Καφέ', 'Φουντουκί', 'Πράσινα', 'Μπλε', 'Γκρι'];

// ── Reading section ────────────────────────────────────────────────────────────

function ReadingSection({ icon: Icon, label, text, accent = false, warning = false }: {
  icon: any; label: string; text: string; accent?: boolean; warning?: boolean;
}) {
  const borderColor = warning ? 'rgba(244,63,94,0.3)' : accent ? 'rgba(245,158,11,0.2)' : theme.borderLight;
  const bgColor = warning ? theme.roseDim : accent ? 'rgba(245,158,11,0.05)' : theme.surface;
  const iconColor = warning ? theme.rose : accent ? theme.amber : theme.violetLight;
  const labelColor = warning ? theme.rose : accent ? '#fde68a' : theme.violetLight;

  return (
    <View style={[s.sectionBox, { borderColor, backgroundColor: bgColor }]}>
      <View style={s.sectionHeader}>
        <Icon size={14} color={iconColor} />
        <Text style={[s.sectionLabel, { color: labelColor }]}>{label}</Text>
      </View>
      <Text style={s.sectionText}>{text}</Text>
    </View>
  );
}

// ── Horoscope panel ────────────────────────────────────────────────────────────

function HoroscopePanel({ signId }: { signId: string }) {
  const sign = SIGN_BY_ID[signId];
  const [period, setPeriod] = useState<Period>('daily');
  const [reading, setReading] = useState<AstrologyReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReading(null); setError(''); setLoading(true);
    getHoroscope(signId, period)
      .then(r => setReading(r.reading))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [signId, period]);

  if (!sign) return null;

  return (
    <View style={{ gap: 14 }}>
      <View style={[s.signHeader, { borderColor: ELEMENT_BORDER[sign.element], backgroundColor: ELEMENT_BG[sign.element] }]}>
        <Text style={s.signSymbol}>{sign.symbol}</Text>
        <View>
          <Text style={s.signName}>{sign.nameGr}</Text>
          <Text style={s.signDates}>{sign.dates}</Text>
          <Text style={[s.signElement, { color: ELEMENT_COLORS[sign.element] }]}>{sign.element}</Text>
        </View>
      </View>

      <View style={s.periodRow}>
        {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setPeriod(key)} style={[s.periodTab, period === key && s.periodTabActive]} activeOpacity={0.8}>
            <Text style={[s.periodLabel, period === key && s.periodLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={theme.amber} style={{ marginVertical: 24 }} />}
      {!!error && <Text style={s.error}>{error}</Text>}

      {reading && !loading && (
        <View style={{ gap: 10 }}>
          <ReadingSection icon={Sparkles} label="Γενικό Μήνυμα" text={reading.general} accent />
          <ReadingSection icon={Heart} label="Αγάπη" text={reading.love} />
          <ReadingSection icon={Briefcase} label="Καριέρα" text={reading.career} />
          <ReadingSection icon={Star} label="Τύχη" text={reading.luck} />
          <View style={s.summaryBox}>
            <Text style={s.summaryText}>"{reading.summary}"</Text>
          </View>
          <ReadingSection icon={AlertTriangle} label="Προσοχή" text={reading.warning} warning />
        </View>
      )}
    </View>
  );
}

// ── Personalized form ──────────────────────────────────────────────────────────

function PersonalizedForm() {
  const [sign, setSign] = useState('');
  const [sex, setSex] = useState('');
  const [dob, setDob] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AstrologyReading | null>(null);
  const [error, setError] = useState('');
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  useEffect(() => {
    getBirthProfile().then(p => {
      if (!p) return;
      if (p.chart?.sun_sign) setSign(p.chart.sun_sign);
      if (p.sex) setSex(p.sex);
      if (p.date_of_birth) setDob(p.date_of_birth);
      if (p.eye_color) setEyeColor(p.eye_color);
      setProfileLoaded(true);
    }).catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!sign || !sex || !eyeColor) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await createPersonalizedAstrologyReading({ sign, sex, date_of_birth: dob, eye_color: eyeColor });
      setResult(data.reading);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if ((e as any).status === 402) setShowCreditsModal(true);
      else setError(e.message ?? 'Κάτι πήγε στραβά');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.personalCard}>
      <View style={s.personalHeader}>
        <View style={s.personalOrb}><User size={16} color="#000" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.personalTitle}>Εξατομικευμένη Ανάγνωση</Text>
          <Text style={s.personalSub}>{profileLoaded ? 'Προ-συμπληρώθηκε από το προφίλ σου' : 'Βασισμένη στα δικά σου χαρακτηριστικά'}</Text>
        </View>
      </View>

      {!result ? (
        <View style={{ gap: 14 }}>
          <View>
            <Text style={s.fieldLabel}>Ζώδιο</Text>
            <View style={s.signPickerRow}>
              {SIGNS.map(sg => (
                <TouchableOpacity key={sg.id} onPress={() => setSign(sg.id)} style={[s.signPickerBtn, sign === sg.id && s.signPickerBtnActive]} activeOpacity={0.8}>
                  <Text style={s.signPickerSymbol}>{sg.symbol}</Text>
                  <Text style={[s.signPickerName, sign === sg.id && { color: theme.amber }]}>{sg.nameGr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={s.fieldLabel}>Ημερομηνία Γέννησης <Text style={s.fieldLabelSub}>(ΕΕΕΕ-ΜΜ-ΗΗ)</Text></Text>
            <TextInput
              style={s.input}
              value={dob}
              onChangeText={val => {
                setDob(val);
                if (val.length === 10) { const d = getSignFromDob(val); if (d) setSign(d); }
              }}
              placeholder="1990-06-15"
              placeholderTextColor={theme.textDim}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
          </View>

          <View>
            <Text style={s.fieldLabel}>Φύλο</Text>
            <View style={s.optRow}>
              {SEX_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} onPress={() => setSex(opt)} style={[s.optBtn, sex === opt && s.optBtnActive]} activeOpacity={0.8}>
                  <Text style={[s.optLabel, sex === opt && s.optLabelActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={s.fieldLabel}>Χρώμα Ματιών</Text>
            <View style={s.eyeGrid}>
              {EYE_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setEyeColor(c)} style={[s.eyeBtn, eyeColor === c && s.eyeBtnActive]} activeOpacity={0.8}>
                  <Text style={[s.eyeLabel, eyeColor === c && s.eyeLabelActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <InsufficientCreditsModal
            visible={showCreditsModal}
            onClose={() => setShowCreditsModal(false)}
          />
          {!!error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity style={[s.submitBtn, (!sign || !sex || !eyeColor) && { opacity: 0.4 }]} onPress={handleSubmit} disabled={loading || !sign || !sex || !eyeColor} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#000" /> : <><Sparkles size={16} color="#000" /><Text style={s.submitBtnText}>Δημιούργησε Εξατομικευμένη Ανάγνωση</Text></>}
          </TouchableOpacity>
          {!loading && <View style={s.costRow}><Coins size={12} color={theme.amberDark} /><Text style={s.costText}>1 credit</Text></View>}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={s.summaryBox}><Text style={s.summaryText}>"{result.summary}"</Text></View>
          <ReadingSection icon={Sparkles} label="Γενικό Μήνυμα" text={result.general} accent />
          <ReadingSection icon={Heart} label="Αγάπη" text={result.love} />
          <ReadingSection icon={Briefcase} label="Καριέρα" text={result.career} />
          <ReadingSection icon={Star} label="Τύχη" text={result.luck} />
          <ReadingSection icon={AlertTriangle} label="Προσοχή" text={result.warning} warning />
          <TouchableOpacity style={s.resetBtn} onPress={() => setResult(null)} activeOpacity={0.8}>
            <RefreshCw size={14} color={theme.violetLight} />
            <Text style={s.resetBtnText}>Νέα Ανάγνωση</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function AstrologyScreen() {
  const [selectedSign, setSelectedSign] = useState<string | null>(null);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={s.headerOrb}><Text style={s.headerOrbText}>✦</Text></View>
        <Text style={s.headerTitle}>Αστρολογία</Text>
        <Text style={s.headerSub}>Ημερήσιες, εβδομαδιαίες και μηνιαίες προβλέψεις</Text>
      </View>

      {!selectedSign ? (
        <>
          <View style={s.signGrid}>
            {SIGNS.map(sign => (
              <TouchableOpacity key={sign.id} onPress={() => setSelectedSign(sign.id)} style={s.signCard} activeOpacity={0.8}>
                <Text style={s.signCardSymbol}>{sign.symbol}</Text>
                <Text style={s.signCardName}>{sign.nameGr}</Text>
                <Text style={[s.signCardElement, { color: ELEMENT_COLORS[sign.element] }]}>{sign.element}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerLabel}>ΕΞΑΤΟΜΙΚΕΥΜΕΝΗ</Text><View style={s.dividerLine} /></View>
          <PersonalizedForm />
        </>
      ) : (
        <View style={{ gap: 24 }}>
          <TouchableOpacity onPress={() => setSelectedSign(null)} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={16} color={theme.violetLight} />
            <Text style={s.backBtnText}>Όλα τα ζώδια</Text>
          </TouchableOpacity>
          <HoroscopePanel signId={selectedSign} />
          <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerLabel}>ΕΞΑΤΟΜΙΚΕΥΜΕΝΗ</Text><View style={s.dividerLine} /></View>
          <PersonalizedForm />
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: 28 },
  headerOrb: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.violetDim, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerOrbText: { fontSize: 22, color: theme.amber },
  headerTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 },
  headerSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  signCard: { width: '30%', flexGrow: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  signCardSymbol: { fontSize: 28 },
  signCardName: { fontSize: 12, fontWeight: '600', color: theme.text },
  signCardElement: { fontSize: 10, fontWeight: '500' },
  signHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 16 },
  signSymbol: { fontSize: 44 },
  signName: { fontSize: 20, fontWeight: '700', color: theme.text },
  signDates: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  signElement: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  periodRow: { flexDirection: 'row', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 12, padding: 4 },
  periodTab: { flex: 1, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  periodTabActive: { backgroundColor: 'rgba(109,40,217,0.5)' },
  periodLabel: { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
  periodLabelActive: { color: theme.amber, fontWeight: '600' },
  sectionBox: { borderWidth: 1, borderRadius: 14, padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  sectionText: { fontSize: 14, color: theme.text, lineHeight: 21 },
  summaryBox: { backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 14, padding: 14 },
  summaryText: { fontSize: 14, color: '#fde68a', fontStyle: 'italic', lineHeight: 21 },
  personalCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 18 },
  personalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  personalOrb: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.amber, alignItems: 'center', justifyContent: 'center' },
  personalTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
  personalSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  fieldLabelSub: { fontSize: 10, color: theme.textDim, fontWeight: '400' },
  signPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signPickerBtn: { width: '22%', flexGrow: 1, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center', gap: 2 },
  signPickerBtnActive: { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)' },
  signPickerSymbol: { fontSize: 18 },
  signPickerName: { fontSize: 9, color: theme.textMuted, fontWeight: '500' },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: theme.text },
  optRow: { flexDirection: 'row', gap: 8 },
  optBtn: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.bg },
  optBtnActive: { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)' },
  optLabel: { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
  optLabelActive: { color: theme.amber, fontWeight: '600' },
  eyeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eyeBtn: { width: '30%', flexGrow: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: theme.bg },
  eyeBtnActive: { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)' },
  eyeLabel: { fontSize: 12, color: theme.textMuted },
  eyeLabelActive: { color: theme.amber, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.amber, borderRadius: 12, paddingVertical: 14, elevation: 6 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  costText: { fontSize: 12, color: theme.amberDark },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  resetBtnText: { fontSize: 14, color: theme.violetLight, fontWeight: '500' },
  error: { fontSize: 13, color: theme.rose, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontSize: 14, color: theme.violetLight },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(109,40,217,0.2)' },
  dividerLabel: { fontSize: 10, color: theme.textDim, letterSpacing: 1.5, fontWeight: '600' },
});
