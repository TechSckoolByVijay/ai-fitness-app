import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function SkeletonBlock({ className = '' }: { className?: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={`rounded-xl bg-muted-light dark:bg-muted-dark ${className}`}
      style={{ opacity }}
    />
  );
}
