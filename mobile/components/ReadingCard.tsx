import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Heart, Briefcase, Star, Sparkles, Eye } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import type { CoffeeReading } from '@/lib/api';

interface Props {
  reading: CoffeeReading;
  symbolsDetected: string[];
  lettersDetected?: string[];
  imageUri?: string;
}

export function ReadingCard({ reading, symbolsDetected, lettersDetected = [], imageUri }: Props) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
        )}
        <View style={styles.headerText}>
          <View style={styles.row}>
            <Sparkles size={13} color={theme.amber} />
            <Text style={styles.label}>Η Μοίρα σου</Text>
          </View>
          <Text style={styles.generalMessage}>{reading.general_message}</Text>
        </View>
      </View>

      {/* Love / Career / Luck */}
      <View style={styles.sections}>
        <Section icon={<Heart size={14} color="#f87171" />} label="Αγάπη" color="#f87171" bg="rgba(239,68,68,0.1)">
          {reading.love}
        </Section>
        <Section icon={<Briefcase size={14} color="#38bdf8" />} label="Καριέρα" color="#38bdf8" bg="rgba(56,189,248,0.1)">
          {reading.career}
        </Section>
        <Section icon={<Star size={14} color={theme.amber} />} label="Τύχη" color={theme.amber} bg={theme.amberGlow}>
          {reading.luck}
        </Section>
      </View>

      {/* Symbols */}
      {(() => {
        const allSymbols = [...new Set([...symbolsDetected, ...(reading.symbols ?? [])])];
        return allSymbols.length > 0 ? (
          <View style={styles.symbolsContainer}>
            <View style={styles.row}>
              <Eye size={12} color={theme.textMuted} />
              <Text style={styles.symbolsLabel}>Σύμβολα που είδα</Text>
            </View>
            <View style={styles.chips}>
              {allSymbols.map((sym) => (
                <View key={sym} style={styles.chip}>
                  <Text style={styles.chipText}>{sym}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null;
      })()}

      {/* Letters */}
      {lettersDetected.length > 0 && (
        <View style={styles.symbolsContainer}>
          <View style={styles.row}>
            <Eye size={12} color={theme.amber} />
            <Text style={styles.lettersLabel}>Γράμματα που είδα</Text>
          </View>
          <View style={styles.chips}>
            {lettersDetected.map((letter) => (
              <View key={letter} style={styles.letterChip}>
                <Text style={styles.letterChipText}>{letter}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Prediction */}
      <View style={styles.prediction}>
        <Text style={styles.predictionLabel}>Πρόβλεψη</Text>
        <Text style={styles.predictionText}>"{reading.prediction_summary}"</Text>
      </View>
    </View>
  );
}

function Section({
  icon, label, color, bg, children,
}: {
  icon: React.ReactNode; label: string; color: string; bg: string; children: string;
}) {
  return (
    <View style={[styles.section, { backgroundColor: bg, borderColor: `${color}30` }]}>
      <View style={styles.row}>
        {icon}
        <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(109,40,217,0.2)',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerText: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  label: { fontSize: 10, color: theme.amber, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  generalMessage: { fontSize: 13, color: theme.text, lineHeight: 20 },
  sections: { padding: 12, gap: 8 },
  section: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  sectionText: { fontSize: 12, color: '#c4b8e0', lineHeight: 18, marginTop: 4 },
  symbolsContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  symbolsLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  lettersLabel: { fontSize: 10, color: theme.amber, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  chipText: { fontSize: 11, color: '#c4b8e0', textTransform: 'capitalize' },
  letterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  letterChipText: { fontSize: 12, color: theme.amber, fontWeight: '700' },
  prediction: {
    margin: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  predictionLabel: { fontSize: 9, color: 'rgba(245,158,11,0.7)', fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  predictionText: { fontSize: 13, color: '#c4b8e0', fontStyle: 'italic', lineHeight: 20 },
});
