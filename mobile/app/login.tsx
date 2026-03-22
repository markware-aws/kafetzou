'use client';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Coffee, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { login, register, confirmRegistration, forgotPassword, confirmForgotPassword, loginWithGoogle } from '@/lib/auth';
import { theme } from '@/lib/theme';

type Step = 'login' | 'register' | 'confirm' | 'forgot' | 'reset';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  async function handleLogin() {
    setLoading(true); setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/upload');
    } catch (e: any) { setError(e.message ?? 'Login failed'); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    setLoading(true); setError('');
    try {
      await register(email, password);
      setStep('confirm');
    } catch (e: any) { setError(e.message ?? 'Registration failed'); }
    finally { setLoading(false); }
  }

  async function handleConfirm() {
    setLoading(true); setError('');
    try {
      await confirmRegistration(email, code, password); // handles auto-sign-in internally
      router.replace('/(tabs)/upload');
    } catch (e: any) { setError(e.message ?? 'Confirmation failed'); }
    finally { setLoading(false); }
  }

  async function handleForgot() {
    setLoading(true); setError('');
    try {
      await forgotPassword(email);
      setStep('reset');
    } catch (e: any) { setError(e.message ?? 'Αποτυχία αποστολής κωδικού'); }
    finally { setLoading(false); }
  }

  async function handleReset() {
    if (newPassword !== confirmNewPassword) {
      setError('Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    setLoading(true); setError('');
    try {
      await confirmForgotPassword(email, code, newPassword);
      await login(email, newPassword);
      router.replace('/(tabs)/upload');
    } catch (e: any) {
      setError(e.message ?? 'Αποτυχία επαναφοράς κωδικού');
    }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
      // Navigation handled by Hub listener in _layout.tsx
    } catch (e: any) { setError(e.message ?? 'Google sign-in failed'); }
  }

  const goTo = (s: Step) => { setStep(s); setError(''); };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.blob, { top: -80, left: -80, backgroundColor: 'rgba(109,40,217,0.15)' }]} />
      <View style={[s.blob, { bottom: -80, right: -80, backgroundColor: 'rgba(245,158,11,0.08)' }]} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoOrb}>
            <Coffee size={32} color="#000" />
          </View>
          <Text style={s.logoText}>Fortune Teller</Text>
          <Text style={s.logoSub}>Ανάγνωση Ελληνικού Καφέ</Text>
        </View>

        <View style={s.card}>
          {/* ── Login ── */}
          {step === 'login' && (
            <>
              <Text style={s.title}>Καλώς ήρθες</Text>
              <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" placeholder="you@example.com" />
              <PasswordField label="Κωδικός" value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(p => !p)} placeholder="Κωδικός" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Σύνδεση" loadingLabel="Σύνδεση…" loading={loading} onPress={handleLogin} />
              <Divider />
              <GoogleBtn onPress={handleGoogle} />
              <TouchableOpacity onPress={() => goTo('forgot')} style={s.linkRow}>
                <Text style={s.linkText}>Ξέχασες τον κωδικό;</Text>
              </TouchableOpacity>
              <Text style={s.switchText}>
                Δεν έχεις λογαριασμό;{' '}
                <Text style={s.switchLink} onPress={() => goTo('register')}>Δημιούργησε έναν</Text>
              </Text>
            </>
          )}

          {/* ── Register ── */}
          {step === 'register' && (
            <>
              <Text style={s.title}>Δημιουργία λογαριασμού</Text>
              <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" placeholder="you@example.com" />
              <PasswordField label="Κωδικός" value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(p => !p)} placeholder="Τουλάχιστον 8 χαρακτήρες" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={s.checkboxRow}
                onPress={() => setAgreedToTerms(v => !v)}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
                  {agreedToTerms && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={s.checkboxLabel}>
                  Αποδέχομαι τους{' '}
                  <Text style={s.checkboxLink} onPress={() => Linking.openURL('https://www.fortuneteller.gr/terms')}>
                    Όρους Χρήσης
                  </Text>
                  {' '}και την{' '}
                  <Text style={s.checkboxLink} onPress={() => Linking.openURL('https://www.fortuneteller.gr/privacy')}>
                    Πολιτική Απορρήτου
                  </Text>
                </Text>
              </TouchableOpacity>
              <Btn label="Δημιουργία λογαριασμού" loadingLabel="Δημιουργία…" loading={loading} onPress={handleRegister} disabled={!agreedToTerms} />
              <Divider />
              <GoogleBtn onPress={handleGoogle} />
              <Text style={s.switchText}>
                Έχεις ήδη λογαριασμό;{' '}
                <Text style={s.switchLink} onPress={() => goTo('login')}>Σύνδεση</Text>
              </Text>
            </>
          )}

          {/* ── Confirm ── */}
          {step === 'confirm' && (
            <>
              <View style={s.row}>
                <Sparkles size={16} color={theme.amber} />
                <Text style={[s.title, { marginBottom: 0 }]}>Έλεγξε το email σου</Text>
              </View>
              <Text style={s.sub}>Στείλαμε κωδικό στο <Text style={{ color: theme.text }}>{email}</Text></Text>
              <Field label="Κωδικός επιβεβαίωσης" value={code} onChange={setCode} keyboardType="number-pad" placeholder="123456" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Επιβεβαίωση & Σύνδεση" loadingLabel="Επιβεβαίωση…" loading={loading} onPress={handleConfirm} />
            </>
          )}

          {/* ── Forgot ── */}
          {step === 'forgot' && (
            <>
              <View style={s.row}>
                <Sparkles size={16} color={theme.amber} />
                <Text style={[s.title, { marginBottom: 0 }]}>Επαναφορά κωδικού</Text>
              </View>
              <Text style={s.sub}>Εισήγαγε το email σου και θα σου στείλουμε κωδικό επαναφοράς.</Text>
              <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" placeholder="you@example.com" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Αποστολή κωδικού" loadingLabel="Αποστολή…" loading={loading} onPress={handleForgot} />
              <TouchableOpacity onPress={() => goTo('login')} style={s.linkRow}>
                <Text style={s.linkText}>← Επιστροφή στη σύνδεση</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Reset ── */}
          {step === 'reset' && (
            <>
              <View style={s.row}>
                <Sparkles size={16} color={theme.amber} />
                <Text style={[s.title, { marginBottom: 0 }]}>Νέος κωδικός</Text>
              </View>
              <Text style={s.sub}>Στείλαμε κωδικό στο <Text style={{ color: theme.text }}>{email}</Text>. Εισήγαγε τον κωδικό και τον νέο σου κωδικό.</Text>
              <Field label="Κωδικός επαλήθευσης" value={code} onChange={setCode} keyboardType="number-pad" placeholder="123456" />
              <PasswordField label="Νέος κωδικός" value={newPassword} onChange={setNewPassword} show={showPass} onToggle={() => setShowPass(p => !p)} placeholder="Τουλάχιστον 8 χαρακτήρες" />
              <PasswordField label="Επιβεβαίωση νέου κωδικού" value={confirmNewPassword} onChange={setConfirmNewPassword} show={showPass} onToggle={() => setShowPass(p => !p)} placeholder="Επανάλαβε τον κωδικό" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Επαναφορά & Σύνδεση" loadingLabel="Επαναφορά…" loading={loading} onPress={handleReset} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, keyboardType, placeholder }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
      />
    </View>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.passWrap}>
        <TextInput
          style={[s.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder={placeholder}
          placeholderTextColor={theme.textDim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={onToggle} style={s.eyeBtn}>
          {show ? <EyeOff size={16} color={theme.textMuted} /> : <Eye size={16} color={theme.textMuted} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Btn({ label, loadingLabel, loading, onPress, disabled }: any) {
  const isDisabled = loading || disabled;
  return (
    <TouchableOpacity style={[s.btn, isDisabled && { opacity: 0.4 }]} onPress={onPress} disabled={isDisabled} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function Divider() {
  return (
    <View style={s.divider}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>ή</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

function GoogleBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.googleBtn} onPress={onPress} activeOpacity={0.85}>
      {/* Google G SVG — inline as text approximation */}
      <Text style={s.googleIcon}>G</Text>
      <Text style={s.googleText}>Συνέχεια με Google</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  blob: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoOrb: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.amber, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.amber, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    elevation: 10, marginBottom: 12,
  },
  logoText: { fontSize: 24, fontWeight: '700', color: '#fde68a', letterSpacing: 0.5 },
  logoSub: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  card: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sub: { fontSize: 13, color: theme.textMuted, marginBottom: 20, lineHeight: 19 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: theme.text,
  },
  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, paddingHorizontal: 14,
  },
  eyeBtn: { padding: 8 },
  error: { fontSize: 12, color: '#f87171', marginBottom: 10 },
  btn: {
    backgroundColor: theme.amber, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
    shadowColor: theme.amber, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(109,40,217,0.25)' },
  dividerText: { fontSize: 12, color: theme.textDim },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  googleIcon: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  linkRow: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: 12, color: theme.violetLight },
  switchText: { textAlign: 'center', fontSize: 12, color: theme.textMuted, marginTop: 12 },
  switchLink: { color: theme.amber, fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 4 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
    borderColor: theme.border, backgroundColor: theme.bg,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { borderColor: theme.amber, backgroundColor: 'rgba(245,158,11,0.15)' },
  checkmark: { fontSize: 11, color: theme.amber, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 11, color: theme.textMuted, lineHeight: 17 },
  checkboxLink: { color: theme.violetLight, textDecorationLine: 'underline' },
});
