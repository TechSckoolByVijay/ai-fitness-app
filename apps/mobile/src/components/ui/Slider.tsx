import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Track fill colour, e.g. "bg-primary-500". */
  colorClassName?: string;
  accessibilityLabel?: string;
}

const THUMB = 26;

/**
 * Minimal horizontal slider.
 *
 * Hand-rolled rather than pulling in a dependency: the app needs exactly one
 * behaviour (drag a value between two bounds) and a slider package would add
 * a native module to install and rebuild for.
 *
 * Width comes from onLayout rather than being assumed, so the same component
 * works in a full-width card and in a narrow column.
 */
export function Slider({
  value,
  min,
  max,
  onChange,
  colorClassName = 'bg-primary-500',
  accessibilityLabel,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  // PanResponder closes over its callbacks on creation, so the live width and
  // bounds are read through a ref instead of stale captured props.
  const state = useRef({ width: 0, min, max, onChange });
  state.current = { width, min, max, onChange };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => emit(e.nativeEvent.locationX),
      onPanResponderMove: (_, gesture) => emit(gesture.moveX - offset.current),
    }),
  ).current;

  const offset = useRef(0);

  function emit(x: number) {
    const { width: w, min: lo, max: hi, onChange: cb } = state.current;
    if (w <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / w));
    cb(Math.round(lo + ratio * (hi - lo)));
  }

  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      className="justify-center"
      style={{ height: THUMB + 8 }}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        e.currentTarget.measure?.((_x, _y, _w, _h, pageX) => {
          offset.current = pageX;
        });
      }}
      {...pan.panHandlers}
    >
      <View className="h-2.5 w-full overflow-hidden rounded-full bg-muted-light dark:bg-muted-dark">
        <View className={`h-full rounded-full ${colorClassName}`} style={{ width: `${ratio * 100}%` }} />
      </View>
      <View
        pointerEvents="none"
        className={`absolute rounded-full border-[3px] border-white shadow-sm dark:border-gray-900 ${colorClassName}`}
        style={{
          width: THUMB,
          height: THUMB,
          // Offset by half the thumb so it centres on the value rather than
          // hanging off the end of the track at the extremes.
          left: Math.max(0, ratio * width - THUMB / 2),
        }}
      />
    </View>
  );
}
