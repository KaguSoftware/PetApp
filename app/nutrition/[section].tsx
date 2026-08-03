import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { NutritionSectionBody, VetDisclaimer } from "@/components/nutrition/sections";
import { sectionById } from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * One nutrition subject, full screen.
 *
 * Every section is a real pushed screen rather than an accordion on the hub, so
 * each one gets the system back chevron, the edge-swipe pop and a nav-bar title
 * naming where you are. That is also what keeps the hub short: nothing on it can
 * expand, so it can't grow back into the wall it replaced.
 */
export default function NutritionSectionScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { section, petId } = useLocalSearchParams<{ section: string; petId?: string }>();
  const { state, hydrated } = useStore();

  const meta = sectionById(section);

  if (!hydrated) {
    return (
      <PushedScreen title={meta?.navTitle ?? "Nutrition"}>
        <PageLoading />
      </PushedScreen>
    );
  }

  const pet = state.pets.find((p) => p.id === petId) ?? state.pets[0];
  if (!meta || !pet) {
    return (
      <PushedScreen title="Nutrition">
        <Text style={s.missing}>That section isn&apos;t available for this pet.</Text>
      </PushedScreen>
    );
  }

  return (
    <PushedScreen title={meta.navTitle}>
      <NutritionSectionBody id={meta.id} pet={pet} />
      <VetDisclaimer pet={pet} />
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    missing: { marginTop: 40, textAlign: "center", fontSize: 15, lineHeight: 22, fontFamily: font.regular, color: colors.label2 },
  });
