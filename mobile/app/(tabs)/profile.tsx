import { useState, useEffect, useCallback, ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, LogOut, Coins, Star, Moon, Sun, Edit2, Check, X } from 'lucide-react-native';
import { getMe, getBirthProfile, saveBirthProfile, User as UserType, BirthProfile } from '@/lib/api';
import { SIGN_BY_ID } from '@/lib/astrology';
import { logout } from '@/lib/auth';
import { theme } from '@/lib/theme';

const SEX_OPTIONS = ['Άνδρας', 'Γυναίκα', 'Άλλο'];
const EYE_OPTIONS = ['Καστανά', 'Μπλε', 'Πράσινα', 'Γκρι', 'Μαύρα', 'Ανοιχτά'];

function PillSelect({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={s.pillRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[s.pill, value === opt && s.pillActive]}
          onPress={() => onChange(opt)}
          activeOpacity={0.7}
        >
          <Text style={[s.pillText, value === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ChartBadge({ label, sign, degree, symbol }: {
  label: string; sign: string; degree: number; symbol: string;
}) {
  const signData = SIGN_BY_ID[sign];
  return (
    <View style={s.chartBadge}>
      <Text style={s.chartBadgeSymbol}>{signData?.symbol ?? symbol}</Text>
      <View>
        <Text style={s.chartBadgeLabel}>{label}</Text>
        <Text style={s.chartBadgeName}>{signData?.nameGr ?? sign} {Math.round(degree)}°</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [birth, setBirth] = useState<BirthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [timeKnown, setTimeKnown] = useState(false);
  const [birthPlace, setBirthPlace] = useState('');
  const [sex, setSex] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([getMe(), getBirthProfile()]);
      setUser(u);
      setBirth(b);
      if (b) {
        setDob(b.date_of_birth ?? '');
        setTob(b.time_of_birth ?? '');
        setTimeKnown(b.time_known ?? false);
        setBirthPlace(b.birth_place ?? '');
        setSex(b.sex ?? '');
        setEyeColor(b.eye_color ?? '');
      }
    } catch {
      // silent — user/birth errors shown inline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit() {
    if (birth) {
      setDob(birth.date_of_birth ?? '');
      setTob(birth.time_of_birth ?? '');
      setTimeKnown(birth.time_known ?? false);
      setBirthPlace(birth.birth_place ?? '');
      setSex(birth.sex ?? '');
      setEyeColor(birth.eye_color ?? '');
    }
    setSaveError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError('');
  }

  async function saveEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!dob || !birthPlace) {
      setSaveError('Ημερομηνία γέννησης και τόπος είναι υποχρεωτικά');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updated = await saveBirthProfile({
        date_of_birth: dob,
        time_of_birth: timeKnown && tob ? tob : null,
        birth_place: birthPlace,
        sex: sex || undefined,
        eye_color: eyeColor || undefined,
      });
      setBirth(updated);
      setEditing(false);
    } catch (e: any) {
      setSaveError(e.message ?? 'Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Αποσύνδεση', 'Είσαι σίγουρος/η ότι θέλεις να αποσυνδεθείς;', [
      { text: 'Άκυρο', style: 'cancel' },
      {
        text: 'Αποσύνδεση', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.amber} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Account card */}
      <View style={s.card}>
        <View style={s.accountRow}>
          <View style={s.avatar}>
            <User size={22} color={theme.violetLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.email}>{user?.email ?? '—'}</Text>
            <Text style={s.plan}>{user?.plan === 'premium' ? 'Premium' : 'Δωρεάν πρόγραμμα'}</Text>
          </View>
        </View>

        {/* Credits */}
        <View style={s.creditsRow}>
          <Coins size={14} color={theme.amber} />
          <Text style={s.creditsLabel}>Υπόλοιπο credits</Text>
          <View style={s.creditsBadge}>
            <Text style={s.creditsValue}>{user?.credits ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* Birth chart */}
      {birth?.chart && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Γενέθλιος Χάρτης</Text>
          <View style={s.chartRow}>
            <ChartBadge label="☀ Ήλιος" sign={birth.chart.sun_sign} degree={birth.chart.sun_degree} symbol="☀" />
            <ChartBadge label="☾ Σελήνη" sign={birth.chart.moon_sign} degree={birth.chart.moon_degree} symbol="☾" />
            {birth.chart.ascendant_sign && (
              <ChartBadge
                label="↑ Ωροσκόπος"
                sign={birth.chart.ascendant_sign}
                degree={birth.chart.ascendant_degree ?? 0}
                symbol="↑"
              />
            )}
          </View>
          {!birth.chart.time_known && (
            <Text style={s.chartNote}>* Χωρίς ώρα γέννησης — ο Ωροσκόπος δεν υπολογίστηκε</Text>
          )}
        </View>
      )}

      {/* Birth profile — view or edit */}
      <View style={s.card}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Στοιχεία Γέννησης</Text>
          {!editing ? (
            <TouchableOpacity onPress={startEdit} style={s.editBtn} activeOpacity={0.7}>
              <Edit2 size={13} color={theme.violetLight} />
              <Text style={s.editBtnText}>Επεξεργασία</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.editActions}>
              <TouchableOpacity onPress={cancelEdit} style={s.iconBtn} activeOpacity={0.7}>
                <X size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[s.iconBtn, s.iconBtnSave]} activeOpacity={0.7} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!editing ? (
          birth ? (
            <View style={s.infoGrid}>
              <InfoRow label="Ημερομηνία" value={birth.date_of_birth} />
              <InfoRow label="Ώρα" value={birth.time_known && birth.time_of_birth ? birth.time_of_birth : 'Άγνωστη'} />
              <InfoRow label="Τόπος" value={birth.birth_place} />
              {birth.sex && <InfoRow label="Φύλο" value={birth.sex} />}
              {birth.eye_color && <InfoRow label="Χρώμα ματιών" value={birth.eye_color} />}
            </View>
          ) : (
            <Text style={s.emptyNote}>Δεν έχεις συμπληρώσει στοιχεία γέννησης ακόμα.</Text>
          )
        ) : (
          <View style={s.form}>
            <Field label="Ημερομηνία γέννησης (ΕΕΕΕ-ΜΜ-ΗΗ)">
              <TextInput
                style={s.input}
                value={dob}
                onChangeText={setDob}
                placeholder="1990-06-15"
                placeholderTextColor={theme.textDim}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
              />
            </Field>

            <Field label="Ώρα γέννησης">
              <View style={s.switchRow}>
                <Switch
                  value={timeKnown}
                  onValueChange={setTimeKnown}
                  trackColor={{ false: theme.border, true: 'rgba(109,40,217,0.5)' }}
                  thumbColor={timeKnown ? theme.violetLight : theme.textDim}
                />
                <Text style={s.switchLabel}>{timeKnown ? 'Γνωστή' : 'Άγνωστη'}</Text>
              </View>
              {timeKnown && (
                <TextInput
                  style={[s.input, { marginTop: 8 }]}
                  value={tob}
                  onChangeText={setTob}
                  placeholder="14:30"
                  placeholderTextColor={theme.textDim}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
              )}
            </Field>

            <Field label="Τόπος γέννησης">
              <TextInput
                style={s.input}
                value={birthPlace}
                onChangeText={setBirthPlace}
                placeholder="Αθήνα, Ελλάδα"
                placeholderTextColor={theme.textDim}
                autoCorrect={false}
              />
            </Field>

            <Field label="Φύλο">
              <PillSelect options={SEX_OPTIONS} value={sex} onChange={setSex} />
            </Field>

            <Field label="Χρώμα ματιών">
              <PillSelect options={EYE_OPTIONS} value={eyeColor} onChange={setEyeColor} />
            </Field>

            {!!saveError && <Text style={s.saveError}>{saveError}</Text>}
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut size={16} color={theme.rose} />
        <Text style={s.logoutText}>Αποσύνδεση</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.borderLight, borderRadius: 16, padding: 16,
  },

  // Account
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(109,40,217,0.2)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  email: { fontSize: 14, fontWeight: '600', color: theme.text },
  plan: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

  creditsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 10,
  },
  creditsLabel: { flex: 1, fontSize: 13, color: theme.textMuted },
  creditsBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  creditsValue: { fontSize: 15, fontWeight: '700', color: theme.amber },

  // Chart
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.violetLight, letterSpacing: 0.8, marginBottom: 12 },
  chartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chartBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(109,40,217,0.1)', borderWidth: 1,
    borderColor: 'rgba(109,40,217,0.25)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, flex: 1, minWidth: 100,
  },
  chartBadgeSymbol: { fontSize: 20 },
  chartBadgeLabel: { fontSize: 9, color: theme.textDim, fontWeight: '600', letterSpacing: 0.5 },
  chartBadgeName: { fontSize: 12, color: theme.text, fontWeight: '600', marginTop: 1 },
  chartNote: { fontSize: 11, color: theme.textDim, marginTop: 10, fontStyle: 'italic' },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 12, color: theme.violetLight, fontWeight: '500' },
  editActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnSave: { backgroundColor: theme.violet, borderColor: theme.violet },

  // Info view
  infoGrid: { gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: theme.textDim },
  infoValue: { fontSize: 13, color: theme.text, fontWeight: '500' },
  emptyNote: { fontSize: 13, color: theme.textMuted, fontStyle: 'italic' },

  // Form
  form: { gap: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, color: theme.textDim, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: theme.text,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 13, color: theme.textMuted },
  saveError: { fontSize: 12, color: theme.rose, textAlign: 'center' },

  // Pills
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: theme.borderLight,
    backgroundColor: theme.bg,
  },
  pillActive: { borderColor: 'rgba(109,40,217,0.5)', backgroundColor: 'rgba(109,40,217,0.15)' },
  pillText: { fontSize: 12, color: theme.textMuted },
  pillTextActive: { color: theme.violetLight, fontWeight: '600' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: theme.roseDim, borderRadius: 12, paddingVertical: 13,
    marginTop: 4,
  },
  logoutText: { fontSize: 14, color: theme.rose, fontWeight: '600' },
});
