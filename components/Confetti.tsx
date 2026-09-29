import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8', '#f472b6'];

function Piece({ i }: { i: number }) {
  const p = useSharedValue(0);
  const cfg = useMemo(() => ({
    x: (Math.random() - 0.5) * W * 0.95,
    peak: 260 + Math.random() * 260,
    rot: (Math.random() - 0.5) * 900,
    size: 8 + Math.random() * 8,
    delay: Math.random() * 200,
    color: COLORS[i % COLORS.length],
  }), []);

  useEffect(() => {
    p.value = withDelay(cfg.delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
  }, []);

  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: 1 - t * t * t,
      transform: [
        { translateX: cfg.x * t },
        { translateY: -cfg.peak * t + 520 * t * t },
        { rotate: `${cfg.rot * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ position: 'absolute', left: W / 2, top: H * 0.5, width: cfg.size, height: cfg.size * 0.6, backgroundColor: cfg.color, borderRadius: 2 }, st]}
    />
  );
}

export function Confetti({ count = 40 }: { count?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => <Piece key={i} i={i} />)}
    </View>
  );
}
