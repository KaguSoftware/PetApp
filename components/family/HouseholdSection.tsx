import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import {
  AccentButton,
  Chevron,
  ConfirmRow,
  Group,
  IconCircle,
  Row,
  SectionHeader,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
} from "@/components/ui";
import { shareFamilyIdLink } from "@/lib/inviteShare";
import { useStore } from "@/lib/store";
import { useColors } from "@/lib/theme";
import { confirmDestructive, Field, ROLE_LABEL, useFamilyStyles } from "./shared";

/**
 * Household screen — the HOME itself: which household you're in, switching or
 * starting another one, its name, its shared identifiers, its lock, and (for
 * the owner) deleting it. People live in MembersSection, animals in PetsSection.
 */
export default function HouseholdSection() {
  const router = useRouter();
  const colors = useColors();
  const shared = useFamilyStyles();
  const {
    state,
    setActiveHousehold,
    createHousehold,
    renameHousehold,
    deleteHousehold,
    setFamilyPassword,
  } = useStore();

  const myRole = state.myRole;
  const canManage = myRole === "owner" || myRole === "admin";
  const activeHouseholdName = state.households.find((h) => h.id === state.activeHouseholdId)?.name ?? "Household";

  // Household create/rename sheets.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  // Family password sheet.
  const [familyPwOpen, setFamilyPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const closeFamilyPw = () => {
    setFamilyPwOpen(false);
    setCurrentPw("");
    setNewPw("");
    setPwError("");
    setPwBusy(false);
  };

  const shareFamilyId = async () => {
    if (!state.familyId) return;
    await shareFamilyIdLink(state.familyId);
  };

  return (
    <>
      {/* Households the user belongs to + create/join */}
      <SectionHeader>Your households</SectionHeader>
      <Group>
        {state.households.map((hh) => {
          const active = hh.id === state.activeHouseholdId;
          return (
            <Row
              key={hh.id}
              onPress={active ? undefined : () => setActiveHousehold(hh.id)}
              leading={<IconCircle icon="people" tint={colors.label2} bg={colors.fill} />}
              title={hh.name}
              subtitle={`${ROLE_LABEL[hh.role]}${active ? " · Current household" : " · Tap to switch"}`}
              trailing={active ? <Icon name="check" size={18} color={colors.accent} /> : <Chevron />}
            />
          );
        })}
        <Row
          onPress={() => router.push("/join")}
          leading={<IconCircle icon="people" tint={colors.green} bg={colors.greenSoft} />}
          title="Join a household"
          subtitle="Enter an invite code someone shared with you"
          trailing={<Chevron />}
        />
        <Row
          onPress={() => {
            setCreateName("");
            setCreateOpen(true);
          }}
          leading={<IconCircle icon="plus" tint={colors.accent} bg={colors.accentSoft} />}
          title="Create a household"
          subtitle="Start a separate home for other pets"
          trailing={<Chevron />}
        />
      </Group>

      {/* Household management — admin+ only */}
      {canManage ? (
        <>
          <SectionHeader>{activeHouseholdName}</SectionHeader>
          <Group>
            <Row
              onPress={() => {
                setRenameInput(activeHouseholdName);
                setRenameOpen(true);
              }}
              leading={<IconCircle icon="home" tint={colors.label2} bg={colors.fill} />}
              title="Household name"
              subtitle={activeHouseholdName}
              trailing={<Chevron />}
            />
            <Row
              leading={<IconCircle icon="people" tint={colors.label2} bg={colors.fill} />}
              title="Family ID"
              subtitle={state.familyId ? `For the web app · ${state.familyId.slice(0, 8)}…` : "Loading…"}
              interactiveTrailing
              trailing={<SmallButton label="Share" tone="gray" onPress={shareFamilyId} />}
            />
            <Row
              onPress={() => setFamilyPwOpen(true)}
              leading={<IconCircle icon="lock" tint={colors.label2} bg={colors.fill} />}
              title="Family password"
              subtitle={state.familyPasswordSet ? "Set — tap to change" : "Not set — tap to add one"}
              trailing={<Chevron />}
            />
            {myRole === "owner" ? (
              <Row
                destructive
                leading={<IconCircle icon="alert" tint={colors.red} bg={colors.redSoft} />}
                title="Delete this household"
                onPress={() =>
                  confirmDestructive(
                    `Delete ${activeHouseholdName}?`,
                    state.accounts.length > 1
                      ? `This removes the household for all ${state.accounts.length} members, along with every pet, log and reminder in it. This can't be undone.`
                      : "Every pet, log and reminder in it is permanently deleted. This can't be undone.",
                    "Delete",
                    async () => {
                      await deleteHousehold(state.activeHouseholdId);
                    }
                  )
                }
              />
            ) : null}
          </Group>
          <Text style={shared.footnote}>
            Invite codes expire and can be revoked — prefer them over the permanent Family ID, which anyone can use to join.
          </Text>
        </>
      ) : (
        <Text style={shared.footnote}>
          Only the owner and admins can rename this household or change its password.
        </Text>
      )}

      <View style={{ height: 16 }} />

      {/* Create household */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)}>
        <SheetTitle>Create a household</SheetTitle>
        <SheetSubtitle>A fresh, empty home — your other households aren{"'"}t affected.</SheetSubtitle>
        <Field label="Name" value={createName} onChangeText={setCreateName} placeholder="e.g. The lake house" style={{ marginTop: 8 }} />
        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!createName.trim()}
            loading={createBusy}
            onPress={async () => {
              setCreateBusy(true);
              const ok = await createHousehold(createName);
              setCreateBusy(false);
              if (ok) setCreateOpen(false);
            }}
          >
            Create household
          </AccentButton>
        </View>
      </Sheet>

      {/* Rename household */}
      <Sheet open={renameOpen} onClose={() => setRenameOpen(false)}>
        <SheetTitle>Rename household</SheetTitle>
        <Field label="Name" value={renameInput} onChangeText={setRenameInput} style={{ marginTop: 8 }} />
        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!renameInput.trim()}
            onPress={() => {
              renameHousehold(renameInput);
              setRenameOpen(false);
            }}
          >
            Save name
          </AccentButton>
        </View>
      </Sheet>

      {/* Family password */}
      <Sheet open={familyPwOpen} onClose={closeFamilyPw}>
        <SheetTitle>{state.familyPasswordSet ? "Change family password" : "Set a family password"}</SheetTitle>
        <SheetSubtitle>Protects the Family section on shared devices — not a full account login.</SheetSubtitle>

        {state.familyPasswordSet && <Field label="Current password" value={currentPw} onChangeText={setCurrentPw} secure />}

        <Field label="New password" value={newPw} onChangeText={setNewPw} secure placeholder="At least 6 characters" />
        {pwError ? <Text style={shared.errorText}>{pwError}</Text> : null}

        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={newPw.trim().length < 6 || (state.familyPasswordSet && !currentPw)}
            loading={pwBusy}
            onPress={async () => {
              setPwError("");
              setPwBusy(true);
              const ok = await setFamilyPassword(newPw.trim(), currentPw || undefined);
              setPwBusy(false);
              if (ok) closeFamilyPw();
              else setPwError("That current password isn't right — try again.");
            }}
          >
            {state.familyPasswordSet ? "Update password" : "Set password"}
          </AccentButton>
        </View>

        {state.familyPasswordSet && (
          <Group style={{ marginTop: 12 }}>
            <ConfirmRow
              label="Remove password"
              confirmLabel="Tap again to remove"
              onConfirm={async () => {
                setPwError("");
                const ok = await setFamilyPassword(null, currentPw || undefined);
                if (ok) closeFamilyPw();
                else setPwError("That current password isn't right — try again.");
              }}
            />
          </Group>
        )}
      </Sheet>
    </>
  );
}
