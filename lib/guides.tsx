import { useMemo } from "react";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { StyleSheet, Text, View } from "react-native";
import type { IconName } from "@/components/Icons";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * Shared how-to guide content. One source of truth for the guides list menu
 * (Care tab + /instructions) and the per-guide detail screen (/instructions/[id]).
 */

export type GuideSection = { heading: string; steps: string[] };

export type Guide = {
  id: string;
  icon: IconName;
  tint: string;
  bg: string;
  title: string;
  summary: string;
  minutes: number;
  diagram?: "body" | "brush" | "nail" | "coat" | "portion" | "vet";
  sections: GuideSection[];
  tip?: string;
};

export const GUIDES: Guide[] = [
  {
    id: "weight-check",
    icon: "scale",
    tint: "#c2410c",
    bg: "rgba(234,88,12,0.10)",
    title: "Weight check",
    summary: "Weigh-in method + a hands-on body-condition check.",
    minutes: 3,
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
    id: "dental-care",
    icon: "cross",
    tint: "#dc2626",
    bg: "rgba(220,38,38,0.10)",
    title: "Dental care",
    summary: "Daily brushing that prevents painful dental disease.",
    minutes: 4,
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
    id: "grooming",
    icon: "scissors",
    tint: "#b23f9e",
    bg: "rgba(178,63,158,0.10)",
    title: "Brushing & grooming",
    summary: "Control shedding and stop mats before they form.",
    minutes: 5,
    diagram: "coat",
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
    id: "nail-trimming",
    icon: "clipper",
    tint: "#6d5ae6",
    bg: "rgba(109,90,230,0.10)",
    title: "Nail trimming",
    summary: "Trim safely without hitting the quick.",
    minutes: 4,
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
    id: "feeding",
    icon: "bowl",
    tint: "#15803d",
    bg: "rgba(22,163,74,0.10)",
    title: "Feeding & portions",
    summary: "Get portions right — the biggest lever on health.",
    minutes: 4,
    diagram: "portion",
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
    id: "vet-visits",
    icon: "stethoscope",
    tint: "#6b55df",
    bg: "rgba(107,85,223,0.10)",
    title: "Vet visits",
    summary: "Make routine checkups count — and cheaper.",
    minutes: 3,
    diagram: "vet",
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

export function guideById(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}

/* ---- Inline, theme-colored diagrams (no image assets) ---- */

/**
 * Explicit dispatch, never a fallback: a guide whose `diagram` doesn't match a
 * branch renders nothing rather than silently drawing somebody else's picture.
 */
export function GuideDiagram({ kind }: { kind: NonNullable<Guide["diagram"]> }) {
  switch (kind) {
    case "body":
      return <BodyConditionDiagram />;
    case "brush":
      return <BrushAngleDiagram />;
    case "nail":
      return <NailQuickDiagram />;
    case "coat":
      return <CoatTypeDiagram />;
    case "portion":
      return <PortionDiagram />;
    case "vet":
      return <VetTimelineDiagram />;
    default:
      return null;
  }
}

function BodyConditionDiagram() {
  const colors = useColors();
  const dstyles = useMemo(() => makeDstyles(colors), [colors]);
  const Body = ({ rx, label, tint }: { rx: number; label: string; tint: string }) => (
    <View style={dstyles.item}>
      <Svg width={72} height={56} viewBox="0 0 72 56">
        <Ellipse cx="34" cy="30" rx={rx} ry="15" fill={colors.fill} stroke={tint} strokeWidth={2} />
        <Circle cx={34 - rx - 4} cy="24" r="9" fill={colors.fill} stroke={tint} strokeWidth={2} />
        <Line x1="52" y1="20" x2="60" y2="12" stroke={tint} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <Text style={[dstyles.label, { color: tint }]}>{label}</Text>
    </View>
  );
  return (
    <View style={dstyles.row}>
      <Body rx={13} label="Too thin" tint={colors.orange} />
      <Body rx={18} label="Ideal" tint={colors.green} />
      <Body rx={25} label="Overweight" tint={colors.red} />
    </View>
  );
}

function BrushAngleDiagram() {
  const colors = useColors();
  const dstyles = useMemo(() => makeDstyles(colors), [colors]);
  return (
    <View style={dstyles.single}>
      <Svg width={160} height={80} viewBox="0 0 160 80">
        <Line x1="16" y1="60" x2="144" y2="60" stroke={colors.label3} strokeWidth={2} />
        <Rect x="66" y="34" width="28" height="26" rx="6" fill={colors.fill} stroke={colors.label2} strokeWidth={2} />
        <Line x1="96" y1="30" x2="130" y2="8" stroke={colors.accent} strokeWidth={6} strokeLinecap="round" />
        <Path d="M92 34 l10 -8" stroke={colors.accent} strokeWidth={10} strokeLinecap="round" />
      </Svg>
      <Text style={dstyles.caption}>Hold the brush at ~45° to the gum line.</Text>
    </View>
  );
}

function NailQuickDiagram() {
  const colors = useColors();
  const dstyles = useMemo(() => makeDstyles(colors), [colors]);
  return (
    <View style={dstyles.single}>
      <Svg width={150} height={70} viewBox="0 0 150 70">
        <Path d="M20 35 Q20 20 45 20 L120 30 Q135 35 120 40 L45 50 Q20 50 20 35 Z" fill={colors.fill} stroke={colors.label2} strokeWidth={2} />
        <Path d="M22 35 Q22 24 44 24 L70 31 Q74 35 70 39 L44 46 Q22 46 22 35 Z" fill="rgba(220,38,38,0.18)" stroke={colors.red} strokeWidth={1.5} />
        <Line x1="96" y1="14" x2="96" y2="56" stroke={colors.green} strokeWidth={2} strokeDasharray="4 4" />
      </Svg>
      <View style={dstyles.keyRow}>
        <View style={[dstyles.dot, { backgroundColor: colors.red }]} />
        <Text style={dstyles.keyText}>the quick — never cut here</Text>
        <View style={[dstyles.dot, { backgroundColor: colors.green, marginLeft: 12 }]} />
        <Text style={dstyles.keyText}>safe cut line</Text>
      </View>
    </View>
  );
}

/**
 * Coat cross-sections: skin line at the bottom, hair drawn above it. The three
 * differ in what actually decides the tool — strand LENGTH and whether there
 * are two layers — so that's what's drawn, rather than three dog outlines.
 */
function CoatTypeDiagram() {
  const colors = useColors();
  const dstyles = useMemo(() => makeDstyles(colors), [colors]);

  const Coat = ({
    label,
    tool,
    tint,
    top,
    under,
  }: {
    label: string;
    tool: string;
    tint: string;
    /** Length of the outer strands, in px. */
    top: number;
    /** Length of the dense undercoat, or 0 for a single-layer coat. */
    under: number;
  }) => (
    <View style={dstyles.item}>
      <Svg width={72} height={52} viewBox="0 0 72 52">
        {/* Skin */}
        <Line x1="8" y1="42" x2="64" y2="42" stroke={colors.label3} strokeWidth={2} strokeLinecap="round" />
        {under > 0
          ? Array.from({ length: 15 }, (_, i) => (
              <Line
                key={`u${i}`}
                x1={9 + i * 3.9}
                y1="42"
                x2={9 + i * 3.9}
                y2={42 - under}
                stroke={colors.label3}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))
          : null}
        {Array.from({ length: 8 }, (_, i) => {
          const x = 10 + i * 7.4;
          return (
            <Path
              key={`t${i}`}
              d={`M${x} 42 Q${x + 3} ${42 - top / 2} ${x + 1.5} ${42 - top}`}
              stroke={tint}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>
      <Text style={[dstyles.label, { color: tint }]}>{label}</Text>
      <Text style={dstyles.sublabel}>{tool}</Text>
    </View>
  );

  return (
    <View style={dstyles.row}>
      <Coat label="Short" tool="Curry / bristle" tint={colors.green} top={9} under={0} />
      <Coat label="Double" tool="Rake, then slicker" tint={colors.orange} top={18} under={9} />
      <Coat label="Long" tool="Slicker + comb" tint={colors.groomTint} top={28} under={0} />
    </View>
  );
}

/**
 * The day's food as one bar: the whole bar is the daily allowance, split into
 * set meals, with treats taking a bite out of the SAME bar rather than sitting
 * beside it — the single point people get wrong.
 */
function PortionDiagram() {
  const colors = useColors();
  const dstyles = useMemo(() => makeDstyles(colors), [colors]);
  return (
    <View style={dstyles.single}>
      <Svg width={180} height={64} viewBox="0 0 180 64">
        {/* The daily allowance, as an outline the segments fill. */}
        <Rect x="9" y="19" width="162" height="28" rx="9" fill={colors.fill} />
        <Rect x="10" y="20" width="68" height="26" rx="8" fill={withAlpha(colors.accent, 0.85)} />
        <Rect x="82" y="20" width="68" height="26" rx="8" fill={withAlpha(colors.accent, 0.5)} />
        <Rect x="154" y="20" width="16" height="26" rx="7" fill={colors.orange} />
        {/* Span bracket: everything above is one day's food. */}
        <Path d="M10 13 L10 8 L170 8 L170 13" stroke={colors.label3} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </Svg>
      <View style={dstyles.keyRow}>
        <View style={[dstyles.dot, { backgroundColor: colors.accent }]} />
        <Text style={dstyles.keyText}>set meals</Text>
        <View style={[dstyles.dot, { backgroundColor: colors.orange, marginLeft: 12 }]} />
        <Text style={dstyles.keyText}>treats</Text>
      </View>
      <Text style={dstyles.caption}>One day&apos;s food. Treats come out of it — not on top.</Text>
    </View>
  );
}

/** A 12-month bar with the checkups marked on it. */
function VetTimelineDiagram() {
  const colors = useColors();
  const dstyles = useMemo(() => makeDstyles(colors), [colors]);

  const Year = ({ label, tint, visits }: { label: string; tint: string; visits: number[] }) => (
    <View style={dstyles.item}>
      <Svg width={108} height={38} viewBox="0 0 108 38">
        <Line x1="10" y1="22" x2="98" y2="22" stroke={colors.label3} strokeWidth={2} strokeLinecap="round" />
        {[0, 3, 6, 9, 12].map((m) => (
          <Line
            key={m}
            x1={10 + (m / 12) * 88}
            y1="18"
            x2={10 + (m / 12) * 88}
            y2="26"
            stroke={colors.label3}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}
        {visits.map((m) => (
          <Circle key={m} cx={10 + (m / 12) * 88} cy="22" r="6" fill={tint} stroke={colors.card} strokeWidth={2} />
        ))}
      </Svg>
      <Text style={[dstyles.label, { color: tint }]}>{label}</Text>
    </View>
  );

  return (
    <View style={dstyles.single}>
      <View style={dstyles.row}>
        <Year label="Adult — once a year" tint={colors.accent} visits={[12]} />
        <Year label="Senior — every 6 months" tint={colors.vetTint} visits={[6, 12]} />
      </View>
      <Text style={dstyles.caption}>Ticks are 3 months. Dots are wellness exams.</Text>
    </View>
  );
}

const makeDstyles = (colors: Colors) => StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  item: { alignItems: "center", gap: 4, flexShrink: 1 },
  label: { fontSize: 11, fontFamily: font.semibold, textAlign: "center" },
  sublabel: { fontSize: 10, fontFamily: font.medium, color: colors.label3, textAlign: "center" },
  single: { alignItems: "center", gap: 8, width: "100%" },
  caption: { fontSize: 12, fontFamily: font.medium, color: colors.label2, textAlign: "center", paddingHorizontal: 16 },
  keyRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  keyText: { fontSize: 11, fontFamily: font.medium, color: colors.label2, marginLeft: 5 },
});
