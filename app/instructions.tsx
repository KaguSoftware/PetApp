import { useRef, useState } from "react";
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import { PushedScreen } from "@/components/Screen";
import { colors, font, radius } from "@/lib/theme";

type Guide = {
  icon: IconName;
  tint: string;
  bg: string;
  title: string;
  summary: string;
  steps: string[];
};

const GUIDES: Guide[] = [
  {
    icon: "scale",
    tint: "#c2410c",
    bg: "rgba(234,88,12,0.10)",
    title: "Weight check",
    summary: "A monthly weigh-in catches problems before they become vet visits.",
    steps: [
      "Step on your bathroom scale and note your own weight.",
      "Pick your pet up and weigh yourself holding them.",
      "Subtract — the difference is their weight. Log it in the app.",
      "For small pets, use a kitchen scale with a towel-lined bowl.",
      "Watch the trend over months, not the day-to-day number.",
    ],
  },
  {
    icon: "cross",
    tint: "#dc2626",
    bg: "rgba(220,38,38,0.10)",
    title: "Dental care",
    summary: "Daily brushing prevents painful, expensive dental disease.",
    steps: [
      "Use a pet toothbrush and pet-safe toothpaste — never human paste.",
      "Let them lick the paste first so the taste becomes a treat.",
      "Lift the lip and brush the outer surfaces in small circles.",
      "Start with a few seconds and build up over a week or two.",
      "Add dental treats or a water additive between brushings.",
    ],
  },
  {
    icon: "scissors",
    tint: "#b23f9e",
    bg: "rgba(178,63,158,0.10)",
    title: "Brushing & grooming",
    summary: "Regular brushing controls shedding and prevents painful mats.",
    steps: [
      "Choose the right tool for the coat — slicker brush or undercoat rake.",
      "Brush in the direction the fur grows, in short sections.",
      "Work gently through tangles; never yank a mat.",
      "Check ears, paws and tail where mats hide.",
      "Finish with praise and a treat so it stays a good experience.",
    ],
  },
  {
    icon: "clipper",
    tint: "#6d5ae6",
    bg: "rgba(109,90,230,0.10)",
    title: "Nail trimming",
    summary: "Short nails keep paws healthy and your floors scratch-free.",
    steps: [
      "Trim only the tip — stop well before the pink 'quick'.",
      "Hold the paw firmly but gently; press to extend the nail.",
      "Cut at a slight angle with sharp pet clippers.",
      "Keep styptic powder nearby in case you nick the quick.",
      "Do one or two nails a day if your pet is anxious.",
    ],
  },
  {
    icon: "bowl",
    tint: "#15803d",
    bg: "rgba(22,163,74,0.10)",
    title: "Feeding & portions",
    summary: "The right portion is the single biggest lever on lifelong health.",
    steps: [
      "Follow the food's guide by weight, then adjust to body condition.",
      "You should feel the ribs easily but not see them.",
      "Split the daily amount into consistent meals — don't free-feed.",
      "Measure with a cup or scale; eyeballing drifts high over time.",
      "Count treats as part of the daily total, not extra.",
    ],
  },
  {
    icon: "stethoscope",
    tint: "#6b55df",
    bg: "rgba(107,85,223,0.10)",
    title: "Vet visits",
    summary: "Routine checkups find issues while they're still small and cheap.",
    steps: [
      "Book a wellness exam at least once a year (twice for seniors).",
      "Bring a list of any changes in eating, drinking or behavior.",
      "Keep vaccines and parasite prevention up to date.",
      "Ask for a body-condition score and weight target.",
      "Log the visit and next due date so the family sees it.",
    ],
  },
];

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 32; // 16pt page padding on each side

export default function InstructionsScreen() {
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    if (p !== page) setPage(p);
  };

  return (
    <PushedScreen title="How-to guides" scroll={false}>
      <Text style={styles.intro}>Swipe through the essentials of everyday pet care.</Text>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_W}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.track}
      >
        {GUIDES.map((g) => (
          <View key={g.title} style={[styles.card, { width: CARD_W }]}>
            <View style={[styles.cardIcon, { backgroundColor: g.bg }]}>
              <Icon name={g.icon} size={26} color={g.tint} />
            </View>
            <Text style={styles.cardTitle}>{g.title}</Text>
            <Text style={styles.cardSummary}>{g.summary}</Text>
            <View style={styles.steps}>
              {g.steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {GUIDES.map((g, i) => (
          <View key={g.title} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, fontFamily: font.regular, color: colors.label2, paddingHorizontal: 4, paddingBottom: 16 },
  track: { alignItems: "flex-start" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
  },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardTitle: { marginTop: 16, fontSize: 22, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label },
  cardSummary: { marginTop: 6, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },
  steps: { marginTop: 20, gap: 14 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 13, fontFamily: font.bold, color: colors.accent },
  stepText: { flex: 1, fontSize: 14, fontFamily: font.regular, color: colors.label, lineHeight: 20 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, paddingTop: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sep },
  dotActive: { backgroundColor: colors.accent, width: 20 },
});
