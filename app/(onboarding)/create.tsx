import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { AccentButton, TextField } from "@/components/ui";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { font, useColors, type Colors } from "@/lib/theme";

export default function CreateHouseholdScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { createHousehold } = useStore();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  // Prefill "⟨Name⟩'s household" from the account (local session read — no
  // network). Never overwrite something the user already typed.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const accountName = (data.session?.user?.user_metadata as { name?: string } | null)?.name;
      if (accountName) {
        setName((prev) => (prev || touched ? prev : `${accountName}'s household`));
      }
    });
    // Prefill once on mount; `touched` guards inside the resolver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (busy) return;
    setBusy(true);
    const ok = await createHousehold(name);
    setBusy(false);
    // The store reloads with the new household; carry straight on to pets.
    if (ok) router.replace("/(onboarding)/first-pet");
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" alwaysBounceVertical={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Name your household</Text>
          <Text style={styles.subtitle}>
            This is what your family sees when they join — you can rename it any time.
          </Text>
        </View>
        <View style={styles.form}>
          <TextField
            value={name}
            onChangeText={(t) => {
              setTouched(true);
              setName(t);
            }}
            placeholder="e.g. The Mansouri family"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            autoFocus
          />
          <AccentButton onPress={handleCreate} loading={busy} disabled={!name.trim()}>
            Create household
          </AccentButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 24 },
    header: { marginBottom: 24, gap: 6 },
    title: { fontSize: 22, fontFamily: font.bold, color: colors.label, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
    form: { gap: 12 },
  });
