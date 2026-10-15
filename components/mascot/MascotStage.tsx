import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Mascot } from './Mascot';
import type { MascotStageProps } from './types';

/**
 * Home-hero "room": soft pastel rounded card, rug + floor shadow, the pet centred,
 * and a speech-bubble slot above-right (`bubble` or `children`).
 */
export function MascotStage({
  background = '#E9F0FF',
  rug = '#FFFFFF66',
  height = 380,
  bubble,
  children,
  size,
  ...mascot
}: MascotStageProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const petSize = size ?? Math.max(120, Math.min(width * 0.72, height * 0.78));

  return (
    <View onLayout={onLayout} style={[styles.room, { backgroundColor: background, height }]}>
      <View style={[styles.petBox, { width: petSize, height: petSize }]}>
        {rug === false ? null : (
          <View
            style={[
              styles.rug,
              {
                backgroundColor: rug,
                width: petSize * 1.25,
                height: petSize * 0.3,
                borderRadius: petSize * 0.15,
                left: -petSize * 0.125,
                bottom: -petSize * 0.09,
              },
            ]}
          />
        )}
        <View
          style={[
            styles.shadow,
            {
              width: petSize * 0.62,
              height: petSize * 0.09,
              borderRadius: petSize * 0.05,
              left: petSize * 0.19,
              bottom: -petSize * 0.015,
            },
          ]}
        />
        <Mascot size={petSize} {...mascot} />
      </View>
      {bubble || children ? <View style={styles.bubbleSlot}>{bubble ?? children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 36,
  },
  petBox: { position: 'relative' },
  rug: { position: 'absolute' },
  shadow: { position: 'absolute', backgroundColor: 'rgba(38,38,38,0.12)' },
  bubbleSlot: {
    position: 'absolute',
    top: 18,
    right: 18,
    maxWidth: '58%',
    alignItems: 'flex-end',
  },
});
