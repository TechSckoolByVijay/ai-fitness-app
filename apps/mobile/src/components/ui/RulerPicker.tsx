import { useCallback, useRef, useState } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, View } from 'react-native';
import {
  indexToOffset,
  indexToValue,
  isMajorTick,
  offsetToIndex,
  type RulerConfig,
  tickCount,
  valueToIndex,
} from '../../utils/ruler';
import { Text } from './Text';

const TICK_WIDTH = 12;
const TICK_HEIGHT_MINOR = 22;
const TICK_HEIGHT_MAJOR = 40;

interface RulerPickerProps {
  value: number;
  onChange: (value: number) => void;
  config: RulerConfig;
  /** Rendered next to the large readout, e.g. "kg". */
  unitLabel: string;
}

/**
 * Horizontal drag-to-pick scale, replacing a numeric text field.
 *
 * Backed by a FlatList rather than a ScrollView of Views: a 30-250kg range
 * at 0.1 precision is 2,201 ticks, and rendering them all at once drops
 * frames badly. getItemLayout keeps scroll positioning O(1) so the list can
 * still jump straight to the initial value.
 */
export function RulerPicker({ value, onChange, config, unitLabel }: RulerPickerProps) {
  const listRef = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  // Tracked separately from `value` so the big readout follows the drag
  // continuously, rather than only updating once scrolling settles.
  const [displayValue, setDisplayValue] = useState(value);

  const total = tickCount(config);
  const indices = useRef<number[]>([]);
  if (indices.current.length !== total) {
    indices.current = Array.from({ length: total }, (_, i) => i);
  }

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = offsetToIndex(event.nativeEvent.contentOffset.x, TICK_WIDTH, config);
      setDisplayValue(indexToValue(index, config));
    },
    [config],
  );

  // Commit only once the scroll settles, so a flick through the scale does
  // not fire a change for every value it passes over.
  const handleSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = offsetToIndex(event.nativeEvent.contentOffset.x, TICK_WIDTH, config);
      onChange(indexToValue(index, config));
    },
    [config, onChange],
  );

  const renderTick = useCallback(
    ({ item: index }: { item: number }) => {
      const major = isMajorTick(index);
      return (
        <View style={{ width: TICK_WIDTH }} className="items-center">
          <View
            style={{ height: major ? TICK_HEIGHT_MAJOR : TICK_HEIGHT_MINOR, width: major ? 2 : 1 }}
            className={major ? 'bg-gray-500 dark:bg-gray-300' : 'bg-gray-300 dark:bg-gray-600'}
          />
          {major ? (
            <Text className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {Math.round(indexToValue(index, config))}
            </Text>
          ) : null}
        </View>
      );
    },
    [config],
  );

  // Half the viewport of padding at each end so the first and last ticks can
  // still reach the centre line.
  const sidePadding = width > 0 ? (width - TICK_WIDTH) / 2 : 0;

  return (
    <View className="gap-3" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View className="flex-row items-baseline justify-center gap-1.5">
        <Text className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
          {displayValue}
        </Text>
        <Text variant="body" className="font-semibold text-gray-500 dark:text-gray-400">
          {unitLabel}
        </Text>
      </View>

      <View className="relative">
        {width > 0 ? (
          <FlatList
            ref={listRef}
            data={indices.current}
            keyExtractor={(index) => String(index)}
            renderItem={renderTick}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: sidePadding }}
            getItemLayout={(_, index) => ({
              length: TICK_WIDTH,
              offset: indexToOffset(index, TICK_WIDTH),
              index,
            })}
            initialScrollIndex={valueToIndex(value, config)}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleSettled}
            // A slow drag released without momentum never fires
            // onMomentumScrollEnd, so the value would never commit.
            onScrollEndDrag={handleSettled}
          />
        ) : (
          <View style={{ height: TICK_HEIGHT_MAJOR + 18 }} />
        )}

        {/* Centre indicator — the thing the value is read against. */}
        <View
          pointerEvents="none"
          className="absolute top-0 w-[2px] rounded-full bg-primary-500"
          style={{ height: TICK_HEIGHT_MAJOR, left: '50%' }}
        />
      </View>
    </View>
  );
}
