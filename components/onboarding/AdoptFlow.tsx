import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelectedPet } from "@/components/home/selectedPet";
import { addPet, createHousehold, reloadHousehold, showToast, useHousehold, useMembers, useSession, type Species } from "@/data";
import { Icon, PillButton, PressableScale, Text, spacing, useTheme } from "@/ui";
import { firstNameOf } from "./firstName";
import { NameStep } from "./NameStep";
import { birthDateError, EMPTY_DETAILS, type PetDetails } from "./PetDetailsFields";
import { ProgressDots } from "./ProgressDots";
import { RevealStep } from "./RevealStep";
import { SpeciesStep } from "./SpeciesStep";

const STEPS = 3;

interface Props {
  /** "first" is the signed-up-with-nothing flow; "add" is a pushed screen for another pet. */
  mode: "first" | "add";
  onFinished: () => void;
}

/** Species -> name -> reveal. Creates the household first when the user has none. */
export function AdoptFlow({ mode, onFinished }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { householdId, loadError } = useHousehold();
  const { session } = useSession();
  const members = useMembers();
  const { select } = useSelectedPet();

  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<Species | null>(null);
  const [name, setName] = useState("");
  const [details, setDetails] = useState<PetDetails>(EMPTY_DETAILS);
  const [busy, setBusy] = useState(false);

  const meta = session?.user.user_metadata as { full_name?: unknown; name?: unknown } | undefined;
  const ownerName =
    firstNameOf(meta?.full_name) ?? firstNameOf(meta?.name) ?? firstNameOf(members.find((m) => m.isMe)?.name) ?? "friend";
  const trimmed = name.trim();

  const canGoBack = step > 0 || (router.canGoBack() && !(mode === "first" && !householdId));
  const nextDisabled = step === 0 ? species === null : step === 1 ? trimmed.length === 0 : birthDateError(details.birthDate) !== null;

  function back() {
    if (step > 0) setStep(step - 1);
    else if (router.canGoBack()) router.back();
  }

  async function finish() {
    if (!species || busy) return;
    if (!householdId && loadError) {
      showToast({
        kind: "error",
        text: "We couldn’t reach your family’s data. Check your connection and retry.",
        actionLabel: "Retry",
        onAction: () => void reloadHousehold(),
      });
      return;
    }
    setBusy(true);
    try {
      if (!householdId) await createHousehold();
      const pet = await addPet({
        name: trimmed,
        species,
        breed: details.breed.trim() || null,
        birthDate: details.birthDate.trim() || null,
        gender: details.gender,
        weightKg: null,
        notes: null,
      });
      select(pet.id);
      onFinished();
    } catch {
      // The data layer already showed a toast; stay here so they can retry.
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (nextDisabled) return;
    if (step < STEPS - 1) setStep(step + 1);
    else void finish();
  }

  const label = step === 0 ? "Continue" : step === 1 ? "Meet them" : mode === "first" ? `Welcome home, ${trimmed}!` : `Add ${trimmed}`;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        {canGoBack ? (
          <PressableScale
            onPress={back}
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.back, { backgroundColor: colors.surface }]}
          >
            <View>
              <Icon name="chevron-left" size={22} color={colors.ink} />
            </View>
          </PressableScale>
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.dots}>
          <ProgressDots count={STEPS} index={step} />
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View key={step}>
          {step === 0 ? <SpeciesStep species={species} onChange={setSpecies} /> : null}
          {step === 1 && species ? (
            <NameStep species={species} name={name} onChange={setName} onSubmit={next} />
          ) : null}
          {step === 2 && species ? (
            <RevealStep species={species} name={trimmed} ownerName={ownerName} details={details} onDetails={setDetails} />
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PillButton label={label} size="lg" onPress={next} disabled={nextDisabled} loading={busy} />
        {step === 0 && mode === "first" ? (
          <PressableScale
            onPress={() => router.push("/join")}
            haptic="select"
            accessibilityRole="link"
            accessibilityLabel="I was invited, enter a code"
            style={styles.link}
          >
            <Text variant="headline" tone="ink2">
              I was invited — enter a code
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  spacer: { width: 44, height: 44 },
  dots: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.sm },
  link: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg },
});
