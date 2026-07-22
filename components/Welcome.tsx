import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icons";
import { InitialAvatar } from "@/components/PetAvatar";
import PixelPet from "@/components/pixel/PixelPet";
import { AccentButton, PressableScale } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors, font, radius, withAlpha, HIT } from "@/lib/theme";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "bell", title: "Log care together", body: "Feed, walk, clean — everyone in the family gets notified instantly." },
  { icon: "heart-text", title: "Vet-built care plans", body: "Breed-specific guidance so you always know what your pet needs." },
  { icon: "bag", title: "Dress up & play", body: "Earn coins caring for your pet, then spoil them with pixel outfits." },
];

const TABS: { icon: IconName; title: string; body: string }[] = [
  { icon: "list", title: "Logs", body: "Log feeding, walks, meds and more with one tap — see everything today." },
  { icon: "heart-text", title: "Care", body: "Feeding portions, schedules, reminders and vet visits for each pet." },
  { icon: "home", title: "Home", body: "Your dashboard — today's stats, streaks and quick actions." },
  { icon: "paw", title: "Pets", body: "Manage profiles and stats, and dress pets up in pixel outfits." },
  { icon: "people", title: "Community", body: "Swap tips and vote with other pet parents." },
];

/**
 * First-run intro overlay — mirrors the web Welcome: gated on the household's
 * seenWelcome flag, four steps (brand, features, tab tour, family), skippable.
 * Mounted on Home; renders as a full-screen Modal so it covers the tab bar
 * exactly like the web's absolute overlay covers the phone shell.
 */
export default function Welcome() {
  const { state, hydrated, setSeenWelcome } = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  if (!hydrated || state.seenWelcome || state.pets.length === 0) return null;

  const finish = () => setSeenWelcome(true);
  const [catPet, dogPet] = state.pets;

  return (
    <Modal visible statusBarTranslucent animationType="fade" onRequestClose={finish}>
      <View style={styles.root}>
        <View style={[styles.stage, step === 0 && { backgroundColor: colors.arcadeGlow }]}>
          {step === 0 && (
            <>
              <View style={styles.petsRow}>
                <PixelPet pet={catPet} size={92} idle />
                {dogPet ? <PixelPet pet={dogPet} size={92} idle /> : null}
              </View>
              <Text style={styles.brandTitle}>PetPal</Text>
              <Text style={styles.brandBody}>
                The family hub for taking care of your pets — together. Let&apos;s take a quick look.
              </Text>
            </>
          )}

          {step === 1 && (
            <View style={styles.stepCol}>
              <Text style={styles.stepTitle}>What you can do</Text>
              <View style={styles.featureList}>
                {FEATURES.map((f) => (
                  <View key={f.title} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Icon name={f.icon} size={18} color={colors.accent} />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureBody}>{f.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepCol}>
              <Text style={styles.stepTitle}>Around the app</Text>
              <View style={styles.featureList}>
                {TABS.map((t) => (
                  <View key={t.title} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Icon name={t.icon} size={18} color={colors.accent} />
                    </View>
                    <View style={styles.featureText}>
                      <Text style={styles.featureTitle}>{t.title}</Text>
                      <Text style={styles.featureBody}>{t.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.stepHint}>Tap the gear icon on any tab for settings, family and reminders.</Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepCol}>
              <Text style={[styles.stepTitle, { textAlign: "center" }]}>Meet the family</Text>
              <Text style={styles.stepBody}>These are the family members on your account.</Text>
              <View style={styles.memberGrid}>
                {state.members.map((m) => (
                  <View key={m.id} style={styles.memberCard}>
                    <InitialAvatar name={m.name} gradient={m.gradient} size={36} />
                    <View style={styles.memberText}>
                      <Text numberOfLines={1} style={styles.memberName}>
                        {m.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.memberRole}>
                        {m.role}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.stepHint}>Switch between them anytime from the Family tab.</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <AccentButton onPress={() => (step < 3 ? setStep(step + 1) : finish())}>
            {step < 3 ? "Next" : "Start exploring"}
          </AccentButton>
          {step < 3 ? (
            <PressableScale onPress={finish} accessibilityRole="button">
              <View style={styles.skip}>
                <Text style={styles.skipLabel}>Skip</Text>
              </View>
            </PressableScale>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  petsRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  brandTitle: { marginTop: 32, fontSize: 28, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
  brandBody: {
    marginTop: 12,
    maxWidth: 280,
    fontSize: 15,
    fontFamily: font.regular,
    lineHeight: 23,
    color: colors.label2,
    textAlign: "center",
  },
  stepCol: { width: "100%", maxWidth: 320 },
  stepTitle: { fontSize: 24, fontFamily: font.bold, letterSpacing: -0.4, color: colors.label },
  stepBody: { marginTop: 8, fontSize: 14, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
  featureList: { marginTop: 24, gap: 16 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  featureIcon: {
    marginTop: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  featureBody: { marginTop: 1, fontSize: 13, fontFamily: font.regular, lineHeight: 17, color: colors.label2 },
  memberGrid: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  memberCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.sep,
  },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
  memberRole: { fontSize: 12, fontFamily: font.regular, color: colors.label2 },
  stepHint: { marginTop: 20, fontSize: 13, fontFamily: font.regular, color: colors.label3, textAlign: "center" },
  controls: { paddingHorizontal: 28 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: withAlpha(colors.label, 0.18) },
  dotActive: { width: 20, backgroundColor: colors.accent },
  skip: { marginTop: 4, minHeight: HIT, alignItems: "center", justifyContent: "center" },
  skipLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
});
