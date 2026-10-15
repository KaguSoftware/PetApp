import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/a11y";
import { haptic, type HapticKind } from "./haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. */
  scaleTo?: number;
  /** Haptic fired on press. Omit for none. */
  haptic?: HapticKind;
}

/** The app's only press feedback: a springy squish. Bare opacity presses are banned. */
export function PressableScale({ style, scaleTo = 0.96, haptic: hapticKind, onPress, children, ...rest }: PressableScaleProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={(e) => {
        if (!reduceMotion) scale.value = withSpring(scaleTo, { damping: 16, stiffness: 420 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduceMotion) scale.value = withSpring(1, { damping: 11, stiffness: 320 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticKind) haptic(hapticKind);
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
