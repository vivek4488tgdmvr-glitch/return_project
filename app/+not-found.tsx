import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { C } from '../lib/theme';
import { PressableScale } from '../components/PressableScale';

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={s.container}>
      <Animated.Text entering={ZoomIn.springify()} style={s.icon}>🧾</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100)} style={s.title}>Receipt not found</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(180)} style={s.sub}>This item may have been deleted or the link is no longer valid.</Animated.Text>
      <Animated.View entering={FadeInDown.delay(260)}>
        <PressableScale style={s.button} onPress={() => router.replace('/')}>
          <Text style={s.buttonText}>Back to Return</Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { fontSize: 70 },
  title: { color: C.text, fontSize: 26, fontWeight: '900', marginTop: 18 },
  sub: { color: C.sub, textAlign: 'center', lineHeight: 21, marginTop: 8, maxWidth: 320 },
  button: { marginTop: 24, backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 15, borderRadius: 14 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
