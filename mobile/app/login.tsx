import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Coffee, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { login, register, confirmRegistration } from '@/lib/auth';
import { theme } from '@/lib/theme';

type Step = 'login' | 'register' | 'confirm';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await confirmRegistration(email, code);
      await login(email, password);
      router.replace('/(tabs)/upload');
    } catch (e: any) { setError(e.message ?? 'Confirmation failed'); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Background blobs */}
      <View style={[s.blob, { top: -80, left: -80, backgroundColor: 'rgba(109,40,217,0.15)' }]} />
      <View style={[s.blob, { bottom: -80, right: -80, backgroundColor: 'rgba(245,158,11,0.08)' }]} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoOrb}>
            <Coffee size={32} color="#000" />
          </View>
          <Text style={s.logoText}>Kafetzou</Text>
          <Text style={s.logoSub}>AI Greek Coffee Cup Readings</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          {step === 'login' && (
            <>
              <Text style={s.title}>Welcome back</Text>
              <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" placeholder="you@example.com" />
              <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(p => !p)} placeholder="Password" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Sign in" loadingLabel="Signing in…" loading={loading} onPress={handleLogin} />
              <Text style={s.switchText}>
                No account?{' '}
                <Text style={s.switchLink} onPress={() => { setStep('register'); setError(''); }}>Create one</Text>
              </Text>
            </>
          )}

          {step === 'register' && (
            <>
              <Text style={s.title}>Create account</Text>
              <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" placeholder="you@example.com" />
              <PasswordField value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(p => !p)} placeholder="Min 8 characters" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Create account" loadingLabel="Creating…" loading={loading} onPress={handleRegister} />
              <Text style={s.switchText}>
                Have an account?{' '}
                <Text style={s.switchLink} onPress={() => { setStep('login'); setError(''); }}>Sign in</Text>
              </Text>
            </>
          )}

          {step === 'confirm' && (
            <>
              <View style={s.row}>
                <Sparkles size={16} color={theme.amber} />
                <Text style={s.title}>Check your email</Text>
              </View>
              <Text style={s.confirmSub}>We sent a code to <Text style={{ color: theme.text }}>{email}</Text></Text>
              <Field label="Verification code" value={code} onChange={setCode} keyboardType="number-pad" placeholder="123456" />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Btn label="Verify & sign in" loadingLabel="Verifying…" loading={loading} onPress={handleConfirm} />
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
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
      />
    </View>
  );
}

function PasswordField({ value, onChange, show, onToggle, placeholder }: any) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>Password</Text>
      <View style={s.passWrap}>
        <TextInput
          style={[s.input, { flex: 1, borderWidth: 0 }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder={placeholder}
          placeholderTextColor={theme.textDim}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} style={s.eyeBtn}>
          {show
            ? <EyeOff size={16} color={theme.textMuted} />
            : <Eye size={16} color={theme.textMuted} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Btn({ label, loadingLabel, loading, onPress }: any) {
  return (
    <TouchableOpacity style={s.btn} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading
        ? <ActivityIndicator color="#000" />
        : <Text style={s.btnText}>{label}</Text>}
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
    backgroundColor: theme.amber,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.amber, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    elevation: 10, marginBottom: 12,
  },
  logoText: { fontSize: 24, fontWeight: '700', color: '#fde68a', letterSpacing: 0.5 },
  logoSub: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  card: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  confirmSub: { fontSize: 13, color: theme.textMuted, marginBottom: 20 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: theme.text,
  },
  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 14,
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
  switchText: { textAlign: 'center', fontSize: 12, color: theme.textMuted, marginTop: 16 },
  switchLink: { color: theme.amber, fontWeight: '600' },
});
