import type React from "react";
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
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { Icon, type IconName } from "@/components/Icons";
import { PushedScreen } from "@/components/Screen";
import { colors, font, radius } from "@/lib/theme";

/* ---- Small inline diagrams (theme-colored, no assets) ---- */

/** Three body-condition silhouettes: underweight · ideal · overweight. */
function BodyConditionDiagram() {
  const Body = ({ rx, label, tint }: { rx: number; label: string; tint: string }) => (
    <View style={styles.diagItem}>
      <Svg width={72} height={56} viewBox="0 0 72 56">
        <Ellipse cx="34" cy="30" rx={rx} ry="15" fill={colors.fill} stroke={tint} strokeWidth={2} />
        <Circle cx={34 - rx - 4} cy="24" r="9" fill={colors.fill} stroke={tint} strokeWidth={2} />
        <Line x1="52" y1="20" x2="60" y2="12" stroke={tint} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <Text style={[styles.diagLabel, { color: tint }]}>{label}</Text>
    </View>
  );
  return (
    <View style={styles.diagRow}>
      <Body rx={13} label="Too thin" tint={colors.orange} />
      <Body rx={18} label="Ideal" tint={colors.green} />
      <Body rx={25} label="Overweight" tint={colors.red} />
    </View>
  );
}

/** Toothbrush held at ~45° to the gum line. */
function BrushAngleDiagram() {
  return (
    <View style={styles.diagSingle}>
      <Svg width={160} height={80} viewBox="0 0 160 80">
        {/* gum line */}
        <Line x1="16" y1="60" x2="144" y2="60" stroke={colors.label3} strokeWidth={2} />
        {/* tooth */}
        <Rect x="66" y="34" width="28" height="26" rx="6" fill={colors.fill} stroke={colors.label2} strokeWidth={2} />
        {/* brush at 45° */}
        <Line x1="96" y1="30" x2="130" y2="8" stroke={colors.accent} strokeWidth={6} strokeLinecap="round" />
        <Path d="M92 34 l10 -8" stroke={colors.accent} strokeWidth={10} strokeLinecap="round" />
      </Svg>
      <Text style={styles.diagCaption}>Hold the brush at ~45° to the gum line.</Text>
    </View>
  );
}

/** Where the nail "quick" is — cut only past it. */
function NailQuickDiagram() {
  return (
    <View style={styles.diagSingle}>
      <Svg width={150} height={70} viewBox="0 0 150 70">
        {/* nail shape */}
        <Path d="M20 35 Q20 20 45 20 L120 30 Q135 35 120 40 L45 50 Q20 50 20 35 Z" fill={colors.fill} stroke={colors.label2} strokeWidth={2} />
        {/* quick (pink) */}
        <Path d="M22 35 Q22 24 44 24 L70 31 Q74 35 70 39 L44 46 Q22 46 22 35 Z" fill="rgba(220,38,38,0.18)" stroke={colors.red} strokeWidth={1.5} />
        {/* cut line */}
        <Line x1="96" y1="14" x2="96" y2="56" stroke={colors.green} strokeWidth={2} strokeDasharray="4 4" />
      </Svg>
      <View style={styles.diagKeyRow}>
        <View style={[styles.diagDot, { backgroundColor: colors.red }]} />
        <Text style={styles.diagKeyText}>the quick — never cut here</Text>
        <View style={[styles.diagDot, { backgroundColor: colors.green, marginLeft: 12 }]} />
        <Text style={styles.diagKeyText}>safe cut line</Text>
      </View>
    </View>
  );
}

type Diagram = "body" | "brush" | "nail";

type Guide = {
  icon: IconName;
  tint: string;
  bg: string;
  title: string;
  summary: string;
  diagram?: Diagram;
  sections: { heading: string; steps: string[] }[];
  tip?: string;
};

const GUIDES: Guide[] = [
  {
    icon: "scale",
    tint: "#c2410c",
    bg: "rgba(234,88,12,0.10)",
    title: "Weight check",
    summary: "A monthly weigh-in and a hands-on body check catch problems early.",
    diagram: "body",
    sections: [
      {
        heading: "Weigh them",
        steps: [
          "Step on your bathroom scale and note your own weight.",
          "Pick your pet up, weigh yourself holding them, and subtract.",
          "For pets under ~5 kg use a kitchen scale with a towel-lined bowl.",
          "Log the number in PetPal so you can watch the trend.",
        ],
      },
      {
        heading: "Body-condition check",
        steps: [
          "Ribs: you should feel them easily under a thin layer, not see them.",
          "Waist: looking down, there should be a visible tuck behind the ribs.",
          "Profile: the belly should tuck up, not hang level or sag.",
        ],
      },
    ],
    tip: "Weigh at the same time of day, ideally before a meal, for comparable numbers.",
  },
  {
    icon: "cross",
    tint: "#dc2626",
    bg: "rgba(220,38,38,0.10)",
    title: "Dental care",
    summary: "Daily brushing prevents painful, expensive dental disease.",
    diagram: "brush",
    sections: [
      {
        heading: "Get set up",
        steps: [
          "Use a pet toothbrush (or finger brush) and pet-safe toothpaste.",
          "Never use human toothpaste — it's toxic to pets.",
          "Let them lick the paste first so the taste becomes a reward.",
        ],
      },
      {
        heading: "Brush",
        steps: [
          "Lift the lip and rest the brush at ~45° to the gum line.",
          "Brush the outer surfaces in small circles — that's where plaque sits.",
          "Start with a few seconds; build up over a week or two.",
          "Finish with praise and a treat every single time.",
        ],
      },
    ],
    tip: "Between brushings, dental treats or a water additive help — but don't replace the brush.",
  },
  {
    icon: "scissors",
    tint: "#b23f9e",
    bg: "rgba(178,63,158,0.10)",
    title: "Brushing & grooming",
    summary: "Regular brushing controls shedding and prevents painful mats.",
    sections: [
      {
        heading: "Pick the tool",
        steps: [
          "Short coats: a rubber curry or bristle brush.",
          "Double coats: an undercoat rake, then a slicker.",
          "Long coats: a slicker plus a comb to find hidden tangles.",
        ],
      },
      {
        heading: "Technique",
        steps: [
          "Brush in the direction the fur grows, in short sections.",
          "Work gently through tangles from the tip inward — never yank a mat.",
          "Check the hidden spots: behind ears, armpits, belly and tail.",
          "End on a good note with praise and a treat.",
        ],
      },
    ],
    tip: "A quick daily brush beats a long weekly battle — and keeps mats from ever forming.",
  },
  {
    icon: "clipper",
    tint: "#6d5ae6",
    bg: "rgba(109,90,230,0.10)",
    title: "Nail trimming",
    summary: "Short nails keep paws healthy and your floors scratch-free.",
    diagram: "nail",
    sections: [
      {
        heading: "Before you cut",
        steps: [
          "Find the 'quick' — the pink area with the blood vessel inside the nail.",
          "On dark nails, trim tiny slivers until you see a grey/pink dot.",
          "Keep styptic powder (or cornstarch) nearby in case you nick it.",
        ],
      },
      {
        heading: "Trim",
        steps: [
          "Hold the paw gently and press the pad to extend the nail.",
          "Cut a small amount at a slight angle, staying well past the quick.",
          "Do one or two nails a day if your pet is anxious — it all counts.",
          "Reward calm behavior so the next session is easier.",
        ],
      },
    ],
    tip: "If you hear nails clicking on the floor, they're overdue for a trim.",
  },
  {
    icon: "bowl",
    tint: "#15803d",
    bg: "rgba(22,163,74,0.10)",
    title: "Feeding & portions",
    summary: "The right portion is the single biggest lever on lifelong health.",
    sections: [
      {
        heading: "Get the amount right",
        steps: [
          "Start from the food label's guide for your pet's target weight.",
          "Adjust to body condition — feel the ribs, watch the waist.",
          "Measure with a cup or scale; eyeballing drifts high over time.",
        ],
      },
      {
        heading: "Build the routine",
        steps: [
          "Split the daily amount into set meals — avoid free-feeding.",
          "Count treats as part of the daily total, not extra.",
          "Switch foods gradually over 7 days to avoid stomach upset.",
          "Always keep fresh water available.",
        ],
      },
    ],
    tip: "PetPal's Care Plan calculates exact grams per meal for your pet — use it as your baseline.",
  },
  {
    icon: "stethoscope",
    tint: "#6b55df",
    bg: "rgba(107,85,223,0.10)",
    title: "Vet visits",
    summary: "Routine checkups find issues while they're still small and cheap.",
    sections: [
      {
        heading: "Plan the visit",
        steps: [
          "Book a wellness exam yearly — twice a year for seniors.",
          "Keep vaccines and parasite prevention up to date.",
          "Bring a list of any changes in eating, drinking, or behavior.",
        ],
      },
      {
        heading: "Make it count",
        steps: [
          "Ask for a body-condition score and a weight target.",
          "Discuss dental health and whether a cleaning is due.",
          "Log the visit and the next due date so the whole family sees it.",
        ],
      },
    ],
    tip: "Snap a photo of anything unusual (a lump, limp, or rash) before it changes — vets love context.",
  },
];

const DIAGRAMS: Record<Diagram, () => React.JSX.Element> = {
  body: BodyConditionDiagram,
  brush: BrushAngleDiagram,
  nail: NailQuickDiagram,
};

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 32;

export default function InstructionsScreen() {
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    if (p !== page) setPage(p);
  };

  return (
    <PushedScreen title="How-to guides" scroll={false}>
      <Text style={styles.intro}>
        Swipe through the essentials of everyday pet care — {page + 1} of {GUIDES.length}.
      </Text>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_W}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {GUIDES.map((g) => {
          const DiagramCmp = g.diagram ? DIAGRAMS[g.diagram] : null;
          return (
            <View key={g.title} style={{ width: CARD_W }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardInner}>
                <View style={[styles.cardIcon, { backgroundColor: g.bg }]}>
                  <Icon name={g.icon} size={26} color={g.tint} />
                </View>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Text style={styles.cardSummary}>{g.summary}</Text>

                {DiagramCmp ? (
                  <View style={styles.diagramCard}>
                    <DiagramCmp />
                  </View>
                ) : null}

                {g.sections.map((sec) => (
                  <View key={sec.heading} style={styles.section}>
                    <Text style={styles.sectionHeading}>{sec.heading}</Text>
                    <View style={styles.steps}>
                      {sec.steps.map((s, i) => (
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

                {g.tip ? (
                  <View style={styles.tipCard}>
                    <Icon name="sparkles" size={16} color={colors.accent} />
                    <Text style={styles.tipText}>{g.tip}</Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          );
        })}
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
  intro: { fontSize: 14, fontFamily: font.regular, color: colors.label2, paddingHorizontal: 4, paddingBottom: 12 },
  cardInner: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
    paddingBottom: 28,
  },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardTitle: { marginTop: 16, fontSize: 24, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label },
  cardSummary: { marginTop: 6, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },

  diagramCard: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  diagRow: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  diagItem: { alignItems: "center", gap: 4 },
  diagLabel: { fontSize: 11, fontFamily: font.semibold },
  diagSingle: { alignItems: "center", gap: 8 },
  diagCaption: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  diagKeyRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  diagDot: { width: 8, height: 8, borderRadius: 4 },
  diagKeyText: { fontSize: 11, fontFamily: font.medium, color: colors.label2, marginLeft: 5 },

  section: { marginTop: 20 },
  sectionHeading: { fontSize: 12, fontFamily: font.bold, letterSpacing: 0.6, color: colors.label3, textTransform: "uppercase" },
  steps: { marginTop: 12, gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 13, fontFamily: font.bold, color: colors.accent },
  stepText: { flex: 1, fontSize: 14, fontFamily: font.regular, color: colors.label, lineHeight: 20 },

  tipCard: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontSize: 13, fontFamily: font.medium, color: colors.label, lineHeight: 19 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 7, paddingTop: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sep },
  dotActive: { backgroundColor: colors.accent, width: 20 },
});
