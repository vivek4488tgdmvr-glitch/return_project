import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AP = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
};

export function PressableScale({ children, onPress, style, disabled, scaleTo = 0.96 }: Props) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AP
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => { s.value = withSpring(scaleTo, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      style={[style, a]}
    >
      {children}
    </AP>
  );
}
