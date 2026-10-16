import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { copyInviteCode, createInvite, leaveHousehold, removeMember, shareInvite, useHousehold, useMembers, type Member } from "@/data";
import { PillButton, PressableScale, Text, radius, spacing, useTheme } from "@/ui";
import { Row, Section } from "./parts";

type Invite = { code: string; expiresAt: number };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", member: "Member" } as const;

function expiryText(expiresAt: number): string {
  const days = Math.round((expiresAt - Date.now()) / 86_400_000);
  return days > 1 ? `Works for about ${days} days.` : "Works for the next 24 hours.";
}

function InviteCard({ invite }: { invite: Invite }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.invite, { backgroundColor: colors.bg }]}>
      <Text variant="caption" tone="ink2">
        Your invite code
      </Text>
      <Text
        variant="largeTitle"
        selectable
        accessibilityLabel={`Invite code ${invite.code.split("").join(" ")}`}
        style={styles.code}
      >
        {invite.code}
      </Text>
      <Text variant="callout" tone="ink2">
        {expiryText(invite.expiresAt)}
      </Text>
      <View style={styles.inviteButtons}>
        <PillButton label="Share" icon="share" size="sm" fullWidth={false} onPress={() => void shareInvite(invite)} />
        <PillButton
          label="Copy"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => void copyInviteCode(invite.code)}
        />
      </View>
    </View>
  );
}

function MemberRow({ member, canRemove }: { member: Member; canRemove: boolean }) {
  function confirmRemove() {
    Alert.alert(`Remove ${member.name}?`, "They'll lose access to your pets until you invite them again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void removeMember(member.id) },
    ]);
  }
  return (
    <Row
      label={member.isMe ? `${member.name} (You)` : member.name}
      icon="user"
      right={
        <View style={styles.rowRight}>
          {member.role ? (
            <Text variant="callout" tone="ink2">
              {ROLE_LABEL[member.role]}
            </Text>
          ) : null}
          {canRemove ? (
            <PressableScale onPress={confirmRemove} haptic="tap" accessibilityRole="button" accessibilityLabel={`Remove ${member.name}`} hitSlop={8}>
              <Text variant="callout">Remove</Text>
            </PressableScale>
          ) : null}
        </View>
      }
    />
  );
}

export function SharingSection() {
  const { householdId, myRole } = useHousehold();
  const members = useMembers();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [leftFrom, setLeftFrom] = useState<string | null>(null);
  const { colors } = useTheme();

  const canManage = myRole === "owner" || myRole === "admin";
  const canLeave = myRole === "member" || myRole === "admin";

  // After leaving, the household reloads: no household left means onboarding, another one means home.
  useEffect(() => {
    if (!leftFrom || householdId === leftFrom) return;
    router.replace(householdId ? "/home" : "/(onboarding)/adopt");
  }, [leftFrom, householdId]);

  async function invitePerson() {
    setBusy(true);
    try {
      setInvite(await createInvite());
    } catch {
      // createInvite already showed a toast.
    } finally {
      setBusy(false);
    }
  }

  function confirmLeave() {
    Alert.alert("Leave this family?", "You'll stop seeing their pets and logs.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          const from = householdId;
          await leaveHousehold();
          if (from) setLeftFrom(from);
        },
      },
    ]);
  }

  return (
    <Section title="Family & friends">
      {members.map((m) => (
        <MemberRow
          key={m.id}
          member={m}
          canRemove={canManage && !m.isMe && m.userId !== null && m.role !== "owner"}
        />
      ))}
      {canManage ? (
        <>
          {invite ? <InviteCard invite={invite} /> : null}
          <Row
            label={invite ? "Make a new code" : "Invite someone"}
            icon="plus"
            right={busy ? <ActivityIndicator color={colors.ink} /> : undefined}
            onPress={busy ? undefined : () => void invitePerson()}
          />
        </>
      ) : null}
      {canLeave ? <Row label="Leave this family" onPress={confirmLeave} /> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  invite: { borderRadius: radius.md, padding: spacing.xl, alignItems: "center", gap: spacing.xs, marginVertical: spacing.md },
  code: { letterSpacing: 3, textAlign: "center" },
  inviteButtons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
});
