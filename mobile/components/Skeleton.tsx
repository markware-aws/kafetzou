import { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolateColor,
} from 'react-native-reanimated';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(109,40,217,0.08)', 'rgba(109,40,217,0.2)'],
    ),
  }));

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius }, animStyle, style]}
    />
  );
}

// ── Preset skeletons ────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <Animated.View style={sk.card}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <Animated.View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={13} />
        <Skeleton width="90%" height={11} />
      </Animated.View>
    </Animated.View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <Animated.View style={sk.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(18,16,42,0.8)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.12)',
  },
});
