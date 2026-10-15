import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Mascot } from './Mascot';
import { MascotStage } from './MascotStage';
import {
  MASCOT_MOODS,
  MASCOT_REACTIONS,
  type MascotMood,
  type MascotReaction,
  type MascotReactionType,
} from './types';

const SPECIES = ['dog', 'cat', 'hamster'] as const;
const TINTS: { label: string; value: string | undefined }[] = [
  { label: 'default', value: undefined },
  { label: 'cocoa', value: '#9C6B4A' },
  { label: 'cream', value: '#F3E2BF' },
  { label: 'ginger', value: '#EE9A4D' },
  { label: 'ink', value: '#4A4A55' },
];

function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Dev-only: review every species x mood, fire reactions, try tints. */
export function MascotGallery() {
  const [species, setSpecies] = useState<string>('dog');
  const [mood, setMood] = useState<MascotMood>('happy');
  const [tint, setTint] = useState<string | undefined>(undefined);
  const [reaction, setReaction] = useState<MascotReaction | undefined>(undefined);
  const [animateGrid, setAnimateGrid] = useState(true);

  const fire = (type: MascotReactionType) =>
    setReaction((r) => ({ type, key: (r?.key ?? 0) + 1 }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <MascotStage
        species={species}
        mood={mood}
        tint={tint}
        reaction={reaction}
        height={340}
        bubble={
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{`${species} / ${mood}`}</Text>
          </View>
        }
      />

      <Text style={styles.h}>Species</Text>
      <View style={styles.row}>
        {SPECIES.map((s) => (
          <Chip key={s} label={s} on={s === species} onPress={() => setSpecies(s)} />
        ))}
      </View>
      <Text style={styles.h}>Mood</Text>
      <View style={styles.row}>
        {MASCOT_MOODS.map((m) => (
          <Chip key={m} label={m} on={m === mood} onPress={() => setMood(m)} />
        ))}
      </View>
      <Text style={styles.h}>Reaction</Text>
      <View style={styles.row}>
        {MASCOT_REACTIONS.map((r) => (
          <Chip key={r} label={r} on={reaction?.type === r} onPress={() => fire(r)} />
        ))}
      </View>
      <Text style={styles.h}>Fur tint</Text>
      <View style={styles.row}>
        {TINTS.map((t) => (
          <Chip key={t.label} label={t.label} on={t.value === tint} onPress={() => setTint(t.value)} />
        ))}
      </View>
      <Text style={styles.h}>Grid</Text>
      <View style={styles.row}>
        <Chip
          label={animateGrid ? 'animated' : 'still'}
          on={animateGrid}
          onPress={() => setAnimateGrid((v) => !v)}
        />
      </View>

      {SPECIES.map((s) => (
        <View key={s}>
          <Text style={styles.h}>{s}</Text>
          <View style={styles.grid}>
            {MASCOT_MOODS.map((m) => (
              <View key={m} style={styles.cell}>
                <Mascot species={s} mood={m} tint={tint} size={110} animated={animateGrid} />
                <Text style={styles.cellLabel}>{m}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const INK = '#262626';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF6E7' },
  content: { padding: 16, paddingBottom: 60, gap: 8 },
  h: { marginTop: 14, fontSize: 13, fontWeight: '700', color: INK, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EDEDF2',
  },
  chipOn: { backgroundColor: INK },
  chipText: { fontSize: 14, fontWeight: '600', color: INK },
  chipTextOn: { color: '#FFFFFF' },
  pressed: { opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  cell: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFE7E1',
  },
  cellLabel: { marginTop: 4, fontSize: 12, fontWeight: '600', color: INK },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleText: { fontSize: 14, fontWeight: '600', color: INK },
});
