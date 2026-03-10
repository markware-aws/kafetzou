import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Constants from 'expo-constants';
import { Coins, X, ShoppingCart, Star } from 'lucide-react-native';
import { theme } from '@/lib/theme';

const STORE_URL: string =
  (Constants.expoConfig?.extra?.storeUrl as string) ?? 'https://kafetzou.gr/credits';

const PACKS = [
  { label: '10 credits', price: '0,99 €', highlight: false },
  { label: '50 credits', price: '3,99 €', highlight: true, badge: 'Δημοφιλές' },
  { label: '150 credits', price: '9,99 €', highlight: false },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function InsufficientCreditsModal({ visible, onClose }: Props) {
  function buyCredits() {
    Linking.openURL(STORE_URL);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sheet */}
      <View style={s.sheet}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Close */}
        <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={12}>
          <X size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={s.iconWrap}>
          <Coins size={32} color={theme.amber} />
        </View>

        <Text style={s.title}>Δεν έχεις αρκετά credits</Text>
        <Text style={s.sub}>
          Αγόρασε credits για να συνεχίσεις τις αναγνώσεις σου.
        </Text>

        {/* Packs */}
        <View style={s.packs}>
          {PACKS.map(p => (
            <TouchableOpacity
              key={p.label}
              style={[s.pack, p.highlight && s.packHighlight]}
              onPress={buyCredits}
              activeOpacity={0.8}
            >
              {p.badge && (
                <View style={s.packBadge}>
                  <Star size={8} color={theme.amber} />
                  <Text style={s.packBadgeText}>{p.badge}</Text>
                </View>
              )}
              <Text style={[s.packLabel, p.highlight && s.packLabelHighlight]}>{p.label}</Text>
              <Text style={[s.packPrice, p.highlight && s.packPriceHighlight]}>{p.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.cta} onPress={buyCredits} activeOpacity={0.85}>
          <ShoppingCart size={16} color="#000" />
          <Text style={s.ctaText}>Αγορά Credits</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={s.cancelLink}>
          <Text style={s.cancelText}>Όχι τώρα</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1a1730',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.borderLight,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 24 },

  packs: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 },
  pack: {
    flex: 1, borderWidth: 1, borderColor: theme.borderLight,
    backgroundColor: theme.surface, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', gap: 4,
    overflow: 'hidden',
  },
  packHighlight: {
    borderColor: 'rgba(245,158,11,0.5)',
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  packBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4,
  },
  packBadgeText: { fontSize: 8, color: theme.amber, fontWeight: '700', letterSpacing: 0.5 },
  packLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
  packLabelHighlight: { color: theme.amber },
  packPrice: { fontSize: 15, color: theme.text, fontWeight: '700' },
  packPriceHighlight: { color: theme.amber },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', backgroundColor: theme.amber,
    borderRadius: 14, paddingVertical: 15,
    shadowColor: theme.amber, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 12,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#000' },

  cancelLink: { paddingVertical: 8 },
  cancelText: { fontSize: 13, color: theme.textDim },
});
