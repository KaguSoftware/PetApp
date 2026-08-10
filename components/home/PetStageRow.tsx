import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import PetStageCard from "@/components/home/PetStageCard";
import type { PetDayCard } from "@/lib/home";

const GAP = 12;
/** TabScreen's page gutter — the row bleeds to the screen edge and restores it
 *  as content padding so cards can peek from under the margin. */
const GUTTER = 16;

/**
 * The stage: every animal in the household on one snap-scrolling shelf.
 *
 * A single pet gets the whole width — a lone card sized to peek at a sibling it
 * doesn't have reads as a mistake. Two or more get ~2.2 cards per screen so the
 * next one always peeks in from the edge.
 */
export default function PetStageRow({
  cards,
  selectedId,
  reduceMotion,
  onSelect,
}: {
  cards: PetDayCard[];
  selectedId: string | undefined;
  reduceMotion: boolean;
  onSelect: (petId: string) => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const single = cards.length === 1;
  const cardW = single ? screenW - GUTTER * 2 : Math.min(200, Math.round((screenW - GUTTER * 2 - GAP) * 0.46));

  // Bring the selected card into view when selection moves for a reason other
  // than a tap on it (the neediest changing under the 60s tick, a deletion).
  const selectedIndex = cards.findIndex((c) => c.pet.id === selectedId);
  useEffect(() => {
    if (selectedIndex < 0 || single) return;
    scrollRef.current?.scrollTo({ x: selectedIndex * (cardW + GAP), animated: !reduceMotion });
  }, [selectedIndex, cardW, single, reduceMotion]);

  if (single) {
    return (
      <View style={styles.singleWrap}>
        {cards.map((card) => (
          <PetStageCard
            key={card.pet.id}
            card={card}
            width={cardW}
            selected
            reduceMotion={reduceMotion}
            onPress={() => onSelect(card.pet.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardW + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      style={styles.bleed}
      contentContainerStyle={styles.content}
    >
      {cards.map((card) => (
        <PetStageCard
          key={card.pet.id}
          card={card}
          width={cardW}
          selected={card.pet.id === selectedId}
          reduceMotion={reduceMotion}
          onPress={() => onSelect(card.pet.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  singleWrap: { marginTop: 16 },
  bleed: { marginHorizontal: -GUTTER, marginTop: 16 },
  content: { paddingHorizontal: GUTTER, paddingVertical: 4, gap: GAP, flexDirection: "row" },
});
