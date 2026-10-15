import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { showToast, signOut, useSession } from "@/data";
import { supabase } from "@/lib/supabase";
import { PillButton, Text } from "@/ui";
import { Row, Section } from "./parts";

export function AccountSection() {
  const { session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", onPress: () => void signOut() },
    ]);
  }

  async function deleteAccount() {
    setDeleting(true);
    let deleted = false;
    try {
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
      if (error) throw error;
      deleted = true;
    } catch {
      showToast({ kind: "error", text: "Couldn't delete your account. Please try again." });
    }
    if (deleted) {
      // The account is gone; a failed local sign-out must not read as a failed delete.
      try {
        await signOut();
      } catch {
        showToast({ kind: "info", text: "Your account was deleted. Please close and reopen the app." });
      }
    }
    if (mounted.current) setDeleting(false);
  }

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your account and the pets you own. Families you share will be handed to someone else. This can't be undone.",
      [
        { text: "Keep my account", style: "cancel" },
        { text: "Delete forever", style: "destructive", onPress: () => void deleteAccount() },
      ],
    );
  }

  return (
    <>
      <Section title="Account" tone="grey">
        <Row label="Signed in as" hint={session?.user.email ?? "your account"} />
        <PillButton label="Sign out" variant="secondary" size="sm" onPress={confirmSignOut} />
        <PillButton label="Delete account" variant="secondary" size="sm" loading={deleting} onPress={confirmDelete} />
      </Section>
      <Section title="About">
        <Row label="Terms of Service" chevron onPress={() => router.push("/legal/terms")} />
        <Row label="Privacy Policy" chevron onPress={() => router.push("/legal/privacy")} />
        <Text variant="caption" tone="ink3">
          Version {Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </Section>
    </>
  );
}
