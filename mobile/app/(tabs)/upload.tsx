import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ImagePlus, X, Coffee, Sparkles, CheckCircle, AlertCircle,
} from 'lucide-react-native';
import { ReadingCard } from '@/components/ReadingCard';
import { getUploadUrl, uploadImageToS3, createReading, type ReadCoffeeResponse } from '@/lib/api';
import { theme } from '@/lib/theme';

const MAX = 3;
const { width } = Dimensions.get('window');
const THUMB = (width - 48 - 16) / 3;

interface Slot {
  id: string;
  uri: string;
  status: 'idle' | 'uploading' | 'reading' | 'done' | 'error';
  result?: ReadCoffeeResponse;
  error?: string;
}

function statusLabel(s: Slot['status']) {
  if (s === 'uploading') return 'Μεταφόρτωση…';
  if (s === 'reading') return 'Ανάγνωση…';
  if (s === 'done') return 'Έγινε';
  return 'Αποτυχία';
}

export default function UploadScreen() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [processing, setProcessing] = useState(false);

  function resetSlots() {
    setSlots([]);
  }

  const update = (id: string, patch: Partial<Slot>) =>
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  async function pickImages() {
    const remaining = MAX - slots.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: remaining,
    });
    if (result.canceled) return;

    const newSlots: Slot[] = result.assets.slice(0, remaining).map(a => ({
      id: Math.random().toString(36).slice(2),
      uri: a.uri,
      status: 'idle' as const,
    }));
    setSlots(prev => [...prev, ...newSlots].slice(0, MAX));
  }

  async function takePhoto() {
    if (slots.length >= MAX) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Απαιτείται άδεια', 'Απαιτείται πρόσβαση στην κάμερα.'); return; }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled) return;

    setSlots(prev => [...prev, { id: Math.random().toString(36).slice(2), uri: result.assets[0].uri, status: 'idle' as const }].slice(0, MAX));
  }

  function removeSlot(id: string) {
    setSlots(prev => prev.filter(s => s.id !== id));
  }

  async function processSlot(slot: Slot) {
    update(slot.id, { status: 'uploading', error: undefined });
    try {
      const { upload_url, image_key, reading_id } = await getUploadUrl();
      await uploadImageToS3(upload_url, slot.uri);
      update(slot.id, { status: 'reading' });
      const result = await createReading(image_key, reading_id);
      update(slot.id, { status: 'done', result });
    } catch (e: any) {
      update(slot.id, { status: 'error', error: e.message ?? 'Κάτι πήγε στραβά' });
    }
  }

  async function handleReadAll() {
    if (processing) return;
    const toProcess = slots.filter(s => s.status === 'idle' || s.status === 'error');
    if (toProcess.length === 0) return;
    setProcessing(true);
    for (const slot of toProcess) await processSlot(slot);
    setProcessing(false);
  }

  const results = slots.filter(s => s.status === 'done' && s.result);
  const idleCount = slots.filter(s => s.status === 'idle' || s.status === 'error').length;
  const allDone = slots.length > 0 && slots.every(s => s.status === 'done');

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroRow}>
          <Sparkles size={14} color={theme.amber} />
          <Text style={s.heroLabel}>Λειτουργία Μαντείου</Text>
        </View>
        <Text style={s.heroTitle}>Διάβασε τον Καφέ μου</Text>
        <Text style={s.heroSub}>Ανέβασε έως {MAX} φωτογραφίες του φλιτζανιού σου</Text>
      </View>

      {/* Image slots */}
      {slots.length > 0 && (
        <View style={s.thumbRow}>
          {slots.map((slot, i) => (
            <View key={slot.id} style={[s.thumb, { width: THUMB, height: THUMB }]}>
              <Image source={{ uri: slot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

              {/* Status overlay */}
              {slot.status !== 'idle' && (
                <View style={s.overlay}>
                  {(slot.status === 'uploading' || slot.status === 'reading') && (
                    <>
                      <ActivityIndicator color={theme.amber} />
                      <Text style={s.overlayText}>{statusLabel(slot.status)}</Text>
                    </>
                  )}
                  {slot.status === 'done' && <CheckCircle size={28} color="#10b981" />}
                  {slot.status === 'error' && (
                    <>
                      <AlertCircle size={24} color="#f87171" />
                      <Text style={s.overlayError}>{slot.error}</Text>
                    </>
                  )}
                </View>
              )}

              {/* Badge */}
              <View style={s.badge}><Text style={s.badgeText}>{i + 1}</Text></View>

              {/* Remove */}
              {!processing && (slot.status === 'idle' || slot.status === 'error') && (
                <TouchableOpacity style={s.removeBtn} onPress={() => removeSlot(slot.id)}>
                  <X size={10} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Add buttons — only when no images yet */}
      {slots.length === 0 && (
        <View style={s.addRow}>
          <TouchableOpacity style={s.addBtn} onPress={pickImages} activeOpacity={0.8}>
            <ImagePlus size={20} color={theme.amber} />
            <Text style={s.addBtnText}>Γκαλερί</Text>
            <Text style={s.addBtnSub}>έως {MAX} φωτογραφίες</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={takePhoto} activeOpacity={0.8}>
            <Coffee size={20} color={theme.violetLight} />
            <Text style={s.addBtnText}>Κάμερα</Text>
            <Text style={s.addBtnSub}>Φωτογράφισε</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add more tile — when images selected but room remains */}
      {slots.length > 0 && slots.length < MAX && !processing && (
        <View style={s.addMoreRow}>
          <TouchableOpacity style={s.addMoreBtn} onPress={pickImages} activeOpacity={0.8}>
            <ImagePlus size={16} color={theme.textDim} />
            <Text style={s.addMoreText}>Προσθήκη ({MAX - slots.length} ακόμα)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CTA */}
      {slots.length > 0 && !allDone && (
        <View style={s.ctaWrap}>
          <TouchableOpacity
            style={[s.ctaBtn, (processing || idleCount === 0) && s.ctaBtnDisabled]}
            onPress={handleReadAll}
            disabled={processing || idleCount === 0}
            activeOpacity={0.8}
          >
            {processing
              ? <ActivityIndicator color="#000" />
              : <Coffee size={16} color="#000" />}
            <Text style={s.ctaBtnText}>
              {processing ? 'Διαβάζω τον καφέ…' : `Διάβασε τον καφέ μου${slots.length > 1 ? ` (${idleCount})` : ''}`}
            </Text>
          </TouchableOpacity>
          {!processing && (
            <TouchableOpacity onPress={resetSlots}>
              <Text style={s.resetText}>Νέα Ανάγνωση</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {allDone && (
        <View style={s.doneRow}>
          <TouchableOpacity style={s.newReadingBtn} onPress={resetSlots} activeOpacity={0.8}>
            <Text style={s.newReadingText}>Νέα Ανάγνωση</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={s.dashLinkText}>Δες όλες →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {results.length > 0 && (
        <View style={s.results}>
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Η Καφετζού Μιλά</Text>
            <View style={s.dividerLine} />
          </View>
          {results.map(slot => (
            <ReadingCard
              key={slot.id}
              reading={slot.result!.reading}
              symbolsDetected={slot.result!.symbols_detected}
              lettersDetected={slot.result!.letters_detected}
              imageUri={slot.uri}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 40 },

  hero: { alignItems: 'center', marginBottom: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  heroLabel: { fontSize: 10, color: theme.amber, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 6 },
  heroSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', maxWidth: 260 },

  thumbRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  thumb: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6,
  },
  overlayText: { fontSize: 10, color: theme.amber, textAlign: 'center' },
  overlayError: { fontSize: 9, color: '#f87171', textAlign: 'center' },
  badge: {
    position: 'absolute', top: 6, left: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(109,40,217,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 9, color: '#e8e0f0', fontWeight: '700' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },

  addRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  addBtn: {
    flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border,
    borderRadius: 16, paddingVertical: 20, alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  addBtnText: { fontSize: 13, color: theme.text, fontWeight: '600' },
  addBtnSub: { fontSize: 11, color: theme.textMuted },

  ctaWrap: { alignItems: 'center', marginBottom: 12, gap: 8 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.amber, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 16,
    shadowColor: theme.amber, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  ctaSub: { fontSize: 11, color: theme.textMuted },

  addMoreRow: { marginBottom: 16 },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border,
    borderRadius: 12, paddingVertical: 12,
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  addMoreText: { fontSize: 12, color: theme.textDim, fontWeight: '600' },

  resetText: { fontSize: 12, color: theme.textDim, textDecorationLine: 'underline' },

  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  newReadingBtn: {
    backgroundColor: theme.amber, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  newReadingText: { fontSize: 13, fontWeight: '700', color: '#000' },
  dashLinkText: { fontSize: 13, color: theme.textMuted },

  results: { marginTop: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(109,40,217,0.2)' },
  dividerText: { fontSize: 10, color: theme.textDim, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
});
