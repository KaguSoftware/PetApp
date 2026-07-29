import { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { AccentButton, TextField } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";
import { isFamilyUnlocked, unlockFamily } from "./lock";

/**
 * The scaffold every Family screen sits in: hydration, pull-to-refresh and the
 * household's family-password gate.
 *
 * The three jobs — the PEOPLE (`/settings/family`), the HOME
 * (`/settings/household`) and the PETS (`/settings/pets`) — are three separate
 * entries in Settings, so each is its own route with its own back stack entry.
 * The gate they share is here, once, rather than copied into each route; the
 * unlock itself is module state (see ./lock) so it survives moving between them.
 */
export default function FamilyScreen({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, verifyFamilyPassword } = useStore();
  const refreshControl = usePullToRefresh();

  const [unlocked, setUnlocked] = useState(isFamilyUnlocked);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  if (!hydrated) {
    return (
      <PushedScreen title={title} refreshControl={refreshControl}>
        <PageLoading />
      </PushedScreen>
    );
  }

  // On a shared device, the Family section is protected by the household's
  // family password. Show an unlock gate until it's entered this visit.
  if (state.familyPasswordSet && !unlocked) {
    const submitUnlock = async () => {
      setUnlockError("");
      setUnlocking(true);
      const ok = await verifyFamilyPassword(unlockInput);
      setUnlocking(false);
      if (ok) {
        unlockFamily();
        setUnlocked(true);
        setUnlockInput("");
      } else {
        setUnlockError("Incorrect password.");
      }
    };
    return (
      <PushedScreen title={title} refreshControl={refreshControl}>
        <View style={styles.lockCard}>
          <View style={styles.lockIcon}>
            <Icon name="lock" size={26} color={colors.accent} />
          </View>
          <Text style={styles.lockTitle}>Family section locked</Text>
          <Text style={styles.lockBody}>Enter the family password to manage members, pets, and household settings.</Text>
          <TextField
            secureTextEntry
            autoFocus
            value={unlockInput}
            onChangeText={setUnlockInput}
            onSubmitEditing={submitUnlock}
            placeholder="Family password"
            style={{ marginTop: 16, backgroundColor: colors.fill, alignSelf: "stretch" }}
          />
          {unlockError ? <Text style={styles.errorText}>{unlockError}</Text> : null}
          <View style={{ marginTop: 12, width: "100%" }}>
            <AccentButton disabled={!unlockInput} loading={unlocking} onPress={submitUnlock}>
              Unlock
            </AccentButton>
          </View>
        </View>
      </PushedScreen>
    );
  }

  return (
    <PushedScreen title={title} refreshControl={refreshControl}>
      {children}
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    lockCard: {
      marginTop: 24,
      alignItems: "center",
      borderRadius: radius.md,
      backgroundColor: colors.card,
      paddingHorizontal: 24,
      paddingVertical: 36,
    },
    lockIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
    lockTitle: { marginTop: 12, fontSize: 15, fontFamily: font.semibold, color: colors.label },
    lockBody: {
      marginTop: 4,
      maxWidth: 240,
      fontSize: 13,
      fontFamily: font.regular,
      lineHeight: 18,
      color: colors.label2,
      textAlign: "center",
    },
    errorText: { marginTop: 8, alignSelf: "stretch", textAlign: "left", fontSize: 14, fontFamily: font.medium, color: colors.red },
  });
