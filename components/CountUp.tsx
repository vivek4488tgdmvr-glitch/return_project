import { useEffect, useState } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

export function CountUp({ value, prefix = '', style }: { value: number; prefix?: string; style?: StyleProp<TextStyle> }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / 900, 1);
      setV(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{prefix}{Math.round(v).toLocaleString()}</Text>;
}
