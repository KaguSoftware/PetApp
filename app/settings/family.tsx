import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, type KeyboardTypeOptions } from "react-native";
import PageLoading from "@/components/PageLoading";
import PetAvatar, { InitialAvatar } from "@/components/PetAvatar";
import BreedField from "@/components/BreedField";
import RoleField from "@/components/RoleField";
import { PushedScreen } from "@/components/Screen";
import { usePullToRefresh } from "@/lib/useRefresh";
import DateField from "@/components/DateField";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  Chevron,
  ConfirmRow,
  FieldLabel,
  Group,
  IconCircle,
  Row,
  SectionHeader,
  Segmented,
  SelectableChip,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
  TextField,
} from "@/components/ui";
import {
  BREEDS_BY_SPECIES,
  formatAge,
  formatMemberRoles,
  formatWeight,
  FUN_ROLE_EXAMPLES,
  kgToUnit,
  NO_FUN_ROLE,
  OTHER_BREED,
  OTHER_ROLE,
  parseMemberRoles,
  unitToKg,
  weightUnitLabel,
  type HouseholdAccount,
  type HouseholdInvite,
  type Member,
  type Pet,
} from "@/lib/data";
import { copyInviteCode, inviteExpiryLabel, shareFamilyIdLink, shareInvite } from "@/lib/inviteShare";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";

const CAREGIVER_TERMS_TEXT = `By assigning the Pet caregiver role to a household member, you acknowledge and agree to the following:

PetPal is a coordination tool that connects people who already share responsibility for a pet's care. We do not vet, supervise, screen, or guarantee the conduct of any caregiver, family member, or other person you choose to add to your household.

PetPal and its operators are not responsible or liable for any theft, loss, damage, injury, or other harm that results — directly or indirectly — from granting someone the Pet caregiver role, or from any actions taken by a caregiver, whether inside or outside the app.

You are solely responsible for deciding who you trust with this role. Only assign it to people you already know and trust with your pets, your home, and your belongings.

The Pet caregiver role is currently a label only, with no special app permissions attached. Assigning or removing it does not grant or restrict access to any account, billing, or household-management features.

By tapping "Accept terms and conditions" below, you confirm that you understand and agree to the above.`;

const ROLE_LABEL: Record<HouseholdAccount["role"], string> = { owner: "Owner", admin: "Admin", member: "Member" };

/** Labelled text field — FieldLabel + TextField primitives plus an optional hint line. */
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure = false,
  autoCapitalize,
  hint,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secure?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  hint?: string;
  style?: object;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={style}>
      <FieldLabel>{label}</FieldLabel>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/** Liability disclaimer shown before a member can be assigned the Pet caregiver role. */
function CaregiverTermsView({ onAccept, onBack }: { onAccept: () => void; onBack: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      <SheetTitle>Pet caregiver terms</SheetTitle>
      <SheetSubtitle>Please read before continuing.</SheetSubtitle>
      <View style={styles.termsScroll}>
        <Text style={styles.termsBody}>{CAREGIVER_TERMS_TEXT}</Text>
      </View>
      <View style={{ marginTop: 20 }}>
        <AccentButton onPress={onAccept}>Accept terms and conditions</AccentButton>
      </View>
      <View style={{ marginTop: 12 }}>
        <SmallButton label="Back" tone="gray" onPress={onBack} />
      </View>
    </>
  );
}

/** Small role pill shown on account rows ("Owner" / "Admin" / "Member"). */
function RoleBadge({ role }: { role: HouseholdAccount["role"] }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const owner = role === "owner";
  const admin = role === "admin";
  return (
    <View style={[styles.roleBadge, (owner || admin) && { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.roleBadgeLabel, (owner || admin) && { color: colors.accentDeep }]}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

/**
 * An active invite, code-first. The code is the thing being handed over — it
 * gets the largest type on the sheet and is `selectable` so it can also be
 * long-pressed out of the app, next to explicit Copy and Share buttons. The
 * old row put it in a 15pt title with only a Share button, which forced every
 * hand-off through the share sheet.
 */
function InviteCard({
  invite,
  onCopy,
  onShare,
  onRevoke,
}: {
  invite: HouseholdInvite;
  onCopy: () => void;
  onShare: () => void;
  onRevoke: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = [
    invite.role === "admin" ? "Admin invite" : null,
    `Expires in ${inviteExpiryLabel(invite)}`,
    invite.maxUses ? `${invite.useCount}/${invite.maxUses} used` : "Whole family",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.inviteCard}>
      <Text style={styles.inviteCode} selectable accessibilityLabel={`Invite code ${invite.code.split("").join(" ")}`}>
        {invite.code}
      </Text>
      <Text style={styles.inviteMeta}>{meta}</Text>
      <View style={styles.inviteActions}>
        <SmallButton label="Copy code" onPress={onCopy} />
        <SmallButton label="Share" tone="gray" onPress={onShare} />
        <SmallButton label="Revoke" tone="gray" onPress={onRevoke} />
      </View>
    </View>
  );
}

/* -- Local date helper -- birth-date entry now uses the shared <DateField>. -- */

function atNoon(d: Date) {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.getTime();
}

export default function FamilySettingsPage() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    state,
    hydrated,
    userId,
    editPet,
    deletePet,
    editMember,
    setFamilyPassword,
    verifyFamilyPassword,
    setActiveHousehold,
    createHousehold,
    renameHousehold,
    leaveHousehold,
    deleteHousehold,
    removeHouseholdMember,
    setMemberRole,
    transferOwnership,
    createInvite,
    fetchInvites,
    revokeInvite,
    toast,
  } = useStore();

  // Lock gate — component-local so it resets whenever the user leaves the page.
  const [unlocked, setUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // The ENFORCED role (household_members.role, RLS-backed from 0026) — the
  // free-text card chips are cosmetic and grant nothing.
  const myRole = state.myRole;
  const refreshControl = usePullToRefresh();
  const canManage = myRole === "owner" || myRole === "admin";

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

  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editPetName, setEditPetName] = useState("");
  const [editPetBreed, setEditPetBreed] = useState<string>(OTHER_BREED);
  const [editPetCustomBreed, setEditPetCustomBreed] = useState("");
  const [editPetAge, setEditPetAge] = useState("");
  const [editPetWeight, setEditPetWeight] = useState("");
  const [editPetCup, setEditPetCup] = useState("");
  const [editPetGender, setEditPetGender] = useState<"male" | "female" | "unset">("unset");
  const [editPetBirth, setEditPetBirth] = useState<number | null>(null);
  const [editPetChip, setEditPetChip] = useState("");
  const [editPetAllergies, setEditPetAllergies] = useState("");

  const openEditPet = (p: Pet) => {
    setEditingPet(p);
    setEditPetName(p.name);
    if (BREEDS_BY_SPECIES[p.species].includes(p.breed)) {
      setEditPetBreed(p.breed);
      setEditPetCustomBreed("");
    } else {
      setEditPetBreed(OTHER_BREED);
      setEditPetCustomBreed(p.breed);
    }
    setEditPetAge(String(Math.round(p.ageYears * 10) / 10));
    setEditPetWeight(String(kgToUnit(p.weightKg, state.units)));
    setEditPetCup(String(p.cupGrams));
    setEditPetGender(p.gender ?? "unset");
    setEditPetBirth(p.birthDate != null ? atNoon(new Date(p.birthDate)) : null);
    setEditPetChip(p.microchip ?? "");
    setEditPetAllergies(p.allergies ?? "");
  };

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberIsCaregiver, setEditMemberIsCaregiver] = useState(false);
  const [editMemberFunRole, setEditMemberFunRole] = useState(NO_FUN_ROLE);
  const [editMemberCustomFunRole, setEditMemberCustomFunRole] = useState("");
  const [editMemberTermsAccepted, setEditMemberTermsAccepted] = useState(false);
  const [editMemberShowTerms, setEditMemberShowTerms] = useState(false);

  const openEditMember = (m: Member) => {
    setEditingMember(m);
    setEditMemberName(m.name);
    // parsed.isAdmin is read and DISCARDED on purpose: legacy cards may still
    // carry the old cosmetic "Admin" label, and saving now drops it.
    const parsed = parseMemberRoles(m.role);
    setEditMemberIsCaregiver(parsed.isCaregiver);
    // Already a caregiver from before this gate existed — grandfathered in, no re-prompt.
    setEditMemberTermsAccepted(parsed.isCaregiver);
    setEditMemberShowTerms(false);
    if (!parsed.customRole) {
      setEditMemberFunRole(NO_FUN_ROLE);
      setEditMemberCustomFunRole("");
    } else if (FUN_ROLE_EXAMPLES.includes(parsed.customRole)) {
      setEditMemberFunRole(parsed.customRole);
      setEditMemberCustomFunRole("");
    } else {
      setEditMemberFunRole(OTHER_ROLE);
      setEditMemberCustomFunRole(parsed.customRole);
    }
  };

  // Account management sheet (tap a signed-in family member).
  const [managing, setManaging] = useState<HouseholdAccount | null>(null);
  const [managingBusy, setManagingBusy] = useState(false);

  // Invite sheet.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteExpiry, setInviteExpiry] = useState<24 | 168>(168);
  const [inviteUses, setInviteUses] = useState<"multi" | "single">("multi");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [activeInvites, setActiveInvites] = useState<HouseholdInvite[]>([]);

  const openInvite = () => {
    setInviteRole("member");
    setInviteExpiry(168);
    setInviteUses("multi");
    setInviteOpen(true);
    fetchInvites().then(setActiveInvites);
  };

  // Household create/rename sheets.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  // Assigning "Pet caregiver" requires accepting the liability disclaimer first —
  // the Save button itself turns into the "Terms and conditions" prompt until then.
  const editMemberCaregiverGateActive = editMemberIsCaregiver && !editMemberTermsAccepted;

  const resolveFunRole = (funRole: string, customFunRole: string) =>
    funRole === NO_FUN_ROLE ? "" : funRole === OTHER_ROLE ? customFunRole.trim() : funRole;

  const resolvedEditMemberRole = formatMemberRoles({
    isCaregiver: editMemberIsCaregiver,
    customRole: resolveFunRole(editMemberFunRole, editMemberCustomFunRole),
  });
  // The ACCOUNT behind the card being edited, if any — drives the read-only
  // household-role badge in that sheet.
  const editingMemberAccount = editingMember
    ? state.accounts.find((a) => a.memberId === editingMember.id)
    : undefined;

  const resolvedEditBreed =
    editPetBreed === OTHER_BREED
      ? editPetCustomBreed.trim() || (editingPet?.species === "dog" ? "Mixed breed" : "House cat")
      : editPetBreed;

  if (!hydrated) {
    return (
      <PushedScreen title="Family" refreshControl={refreshControl}>
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
        setUnlocked(true);
        setUnlockInput("");
      } else {
        setUnlockError("Incorrect password.");
      }
    };
    return (
      <PushedScreen title="Family" refreshControl={refreshControl}>
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

  const shareFamilyId = async () => {
    if (!state.familyId) return;
    await shareFamilyIdLink(state.familyId);
  };

  const shareInviteCode = (invite: HouseholdInvite) => shareInvite(invite);

  const copyInvite = async (invite: HouseholdInvite) => {
    await copyInviteCode(invite.code);
    toast("check", "Code copied", invite.code);
  };

  async function handleCreateInvite() {
    if (inviteBusy) return;
    setInviteBusy(true);
    const invite = await createInvite({
      role: inviteRole,
      ttlHours: inviteExpiry,
      maxUses: inviteUses === "single" ? 1 : undefined,
    });
    setInviteBusy(false);
    if (!invite) return;
    // Land the new code in the list rather than firing the share sheet
    // immediately — the card below shows it big, with Copy and Share side by
    // side, so reading it out or pasting it are equally easy.
    setActiveInvites((prev) => [invite, ...prev]);
  }

  // Sorted: owner first, then admins, then members; ties by tenure.
  const sortedAccounts = [...state.accounts].sort((a, b) => {
    const rank = (r: HouseholdAccount["role"]) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
    return rank(a.role) - rank(b.role) || a.joinedAt - b.joinedAt;
  });
  const cardFor = (a: HouseholdAccount) => (a.memberId ? state.members.find((m) => m.id === a.memberId) : undefined);
  const managingCard = managing ? cardFor(managing) : undefined;
  const managingIsSelf = managing?.userId === userId;
  const activeHouseholdName = state.households.find((h) => h.id === state.activeHouseholdId)?.name ?? "Household";

  const confirmDestructive = (title: string, message: string, actionLabel: string, action: () => void) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: actionLabel, style: "destructive", onPress: action },
    ]);
  };

  return (
    <PushedScreen title="Family" refreshControl={refreshControl}>
      {/* Signed-in family accounts */}
      <SectionHeader>Family</SectionHeader>
      <Group>
        {sortedAccounts.map((a) => {
          const card = cardFor(a);
          const isSelf = a.userId === userId;
          return (
            <Row
              key={a.userId}
              onPress={() => setManaging(a)}
              leading={
                card ? (
                  <InitialAvatar name={card.name} gradient={card.gradient} size={38} />
                ) : (
                  <IconCircle icon="person" tint={colors.label2} bg={colors.fill} size={38} />
                )
              }
              title={`${card?.name ?? "Family member"}${isSelf ? " (you)" : ""}`}
              subtitle={`Joined ${new Date(a.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
              trailing={
                <View style={styles.rowActions}>
                  <RoleBadge role={a.role} />
                  <Chevron />
                </View>
              }
            />
          );
        })}
        {/* THE growth affordance of the whole app — a full-width accent row, not
            a grey pill tucked in the section header where nobody found it. */}
        {canManage ? (
          <Row
            onPress={openInvite}
            leading={<IconCircle icon="plus" tint={colors.white} bg={colors.accent} size={38} />}
            title="Invite someone"
            subtitle="Share a code so they can join this household"
            trailing={<Chevron />}
          />
        ) : null}
      </Group>
      <Text style={styles.footnote}>
        Everyone here has their own PetPal account. Roles are enforced — only the owner and admins can invite or manage.
      </Text>

      {/* Households the user belongs to + create/join */}
      <SectionHeader>Households</SectionHeader>
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
      {canManage && (
        <>
          <SectionHeader>Household</SectionHeader>
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
          <Text style={styles.footnote}>
            Invite codes expire and can be revoked — prefer them over the permanent Family ID, which anyone can use to join.
          </Text>
        </>
      )}

      {/* Pets */}
      <SectionHeader>Pets</SectionHeader>
      <Group>
        {state.pets.map((p) => (
          <Row
            key={p.id}
            onPress={() => router.push(`/pet/${p.id}`)}
            leading={<PetAvatar pet={p} size="sm" />}
            title={p.name}
            subtitle={`${p.breed} · ${formatAge(p.ageYears)} · ${formatWeight(p.weightKg, state.units)}`}
            interactiveTrailing
            trailing={<SmallButton label="Edit" tone="gray" onPress={() => openEditPet(p)} />}
          />
        ))}
      </Group>
      <Text style={styles.footnote}>Tap a pet for full details, or Edit to change its info.</Text>

      <View style={{ height: 16 }} />

      {/* Manage a signed-in account */}
      <Sheet open={managing !== null} onClose={() => setManaging(null)}>
        {managing && (
          <>
            <SheetTitle>{managingCard?.name ?? "Family member"}</SheetTitle>
            <SheetSubtitle>
              {ROLE_LABEL[managing.role]} · joined{" "}
              {new Date(managing.joinedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </SheetSubtitle>
            <Group style={{ marginTop: 16 }}>
              {managingCard && (managingIsSelf || canManage) ? (
                <Row
                  onPress={() => {
                    setManaging(null);
                    openEditMember(managingCard);
                  }}
                  leading={<IconCircle icon="person" tint={colors.label2} bg={colors.fill} />}
                  title="Edit card"
                  subtitle="Name and cosmetic roles"
                  trailing={<Chevron />}
                />
              ) : null}
              {myRole === "owner" && !managingIsSelf && managing.role !== "owner" ? (
                <>
                  <Row
                    onPress={async () => {
                      if (managingBusy) return;
                      setManagingBusy(true);
                      await setMemberRole(managing.userId, managing.role === "admin" ? "member" : "admin");
                      setManagingBusy(false);
                      setManaging(null);
                    }}
                    leading={<IconCircle icon="star" tint={colors.accent} bg={colors.accentSoft} />}
                    title={managing.role === "admin" ? "Make member" : "Make admin"}
                    subtitle={managing.role === "admin" ? "Removes invite & manage powers" : "Can invite and manage members"}
                    trailing={<Chevron />}
                  />
                  <Row
                    onPress={() =>
                      confirmDestructive(
                        "Transfer ownership?",
                        `${managingCard?.name ?? "This member"} becomes the owner of ${activeHouseholdName}; you stay on as an admin.`,
                        "Transfer",
                        async () => {
                          await transferOwnership(managing.userId);
                          setManaging(null);
                        }
                      )
                    }
                    leading={<IconCircle icon="home" tint={colors.orange} bg={colors.orangeSoft} />}
                    title="Transfer ownership"
                    subtitle="They become the owner; you become an admin"
                    trailing={<Chevron />}
                  />
                </>
              ) : null}
              {!managingIsSelf && (myRole === "owner" || (myRole === "admin" && managing.role === "member")) ? (
                <Row
                  destructive
                  onPress={() =>
                    confirmDestructive(
                      "Remove from household?",
                      `${managingCard?.name ?? "This member"} loses access to ${activeHouseholdName}. Their card and logged history stay.`,
                      "Remove",
                      async () => {
                        await removeHouseholdMember(managing.userId);
                        setManaging(null);
                      }
                    )
                  }
                  leading={<IconCircle icon="alert" tint={colors.red} bg={colors.redSoft} />}
                  title="Remove from household"
                />
              ) : null}
              {managingIsSelf && myRole !== "owner" ? (
                <Row
                  destructive
                  onPress={() =>
                    confirmDestructive(
                      "Leave this household?",
                      `You'll lose access to ${activeHouseholdName}. Your card and logged history stay for the family.`,
                      "Leave",
                      async () => {
                        const ok = await leaveHousehold(state.activeHouseholdId);
                        if (ok) setManaging(null);
                      }
                    )
                  }
                  leading={<IconCircle icon="alert" tint={colors.red} bg={colors.redSoft} />}
                  title="Leave household"
                />
              ) : null}
            </Group>
            {managingIsSelf && myRole === "owner" ? (
              <Text style={styles.footnote}>
                Owners can{"'"}t leave — transfer ownership to another member first (tap them, then Transfer ownership).
              </Text>
            ) : null}
          </>
        )}
      </Sheet>

      {/* Invite sheet */}
      <Sheet open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <SheetTitle>Invite family</SheetTitle>
        <SheetSubtitle>Share one code with the whole family, or lock it to a single use.</SheetSubtitle>

        {myRole === "owner" ? (
          <>
            <FieldLabel>Role</FieldLabel>
            <View style={styles.chipRow}>
              <SelectableChip label="Member" selected={inviteRole === "member"} onPress={() => setInviteRole("member")} />
              <SelectableChip label="Admin" selected={inviteRole === "admin"} onPress={() => setInviteRole("admin")} />
            </View>
          </>
        ) : null}

        <FieldLabel>Expires</FieldLabel>
        <View style={styles.chipRow}>
          <SelectableChip label="7 days" selected={inviteExpiry === 168} onPress={() => setInviteExpiry(168)} />
          <SelectableChip label="24 hours" selected={inviteExpiry === 24} onPress={() => setInviteExpiry(24)} />
        </View>

        <FieldLabel>Uses</FieldLabel>
        <View style={styles.chipRow}>
          <SelectableChip label="Whole family" selected={inviteUses === "multi"} onPress={() => setInviteUses("multi")} />
          <SelectableChip label="One person" selected={inviteUses === "single"} onPress={() => setInviteUses("single")} />
        </View>

        {activeInvites.length > 0 ? (
          <>
            <FieldLabel>Active invites</FieldLabel>
            {activeInvites.map((inv) => (
              <InviteCard
                key={inv.id}
                invite={inv}
                onShare={() => shareInviteCode(inv)}
                onCopy={() => copyInvite(inv)}
                onRevoke={async () => {
                  const ok = await revokeInvite(inv.id);
                  if (ok) setActiveInvites((prev) => prev.filter((i) => i.id !== inv.id));
                }}
              />
            ))}
          </>
        ) : null}

        <View style={{ marginTop: 28 }}>
          <AccentButton loading={inviteBusy} onPress={handleCreateInvite}>
            Create invite code
          </AccentButton>
        </View>
      </Sheet>

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

      {/* Edit pet */}
      <Sheet open={editingPet !== null} onClose={() => setEditingPet(null)}>
        {editingPet && (
          <>
            <SheetTitle>Edit {editingPet.name}</SheetTitle>

            <Field label="Name" value={editPetName} onChangeText={setEditPetName} />

            <FieldLabel>Breed</FieldLabel>
            <BreedField
              species={editingPet.species}
              breed={editPetBreed}
              customBreed={editPetCustomBreed}
              onChangeBreed={setEditPetBreed}
              onChangeCustomBreed={setEditPetCustomBreed}
            />

            <View style={styles.twoCol}>
              <Field style={{ flex: 1 }} label="Age (years)" value={editPetAge} onChangeText={setEditPetAge} keyboardType="decimal-pad" />
              <Field
                style={{ flex: 1 }}
                label={`Weight (${weightUnitLabel(state.units)})`}
                value={editPetWeight}
                onChangeText={setEditPetWeight}
                keyboardType="decimal-pad"
              />
            </View>

            <FieldLabel>Gender</FieldLabel>
            <Segmented
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "unset", label: "Not set" },
              ]}
              value={editPetGender}
              onChange={setEditPetGender}
            />
            <Text style={styles.fieldHint}>Used for the age-and-gender-specific weight & feeding guide.</Text>

            <FieldLabel>Birth date (optional)</FieldLabel>
            <DateField value={editPetBirth} onChange={setEditPetBirth} mode="past" allowClear />
            {editPetBirth != null ? (
              <Text style={styles.fieldHint}>With a birth date set, age is calculated automatically.</Text>
            ) : null}

            <Field
              label="Microchip number (optional)"
              value={editPetChip}
              onChangeText={setEditPetChip}
              placeholder="e.g. 985112003456789"
              autoCapitalize="none"
            />

            <Field
              label="Allergies & alerts (optional)"
              value={editPetAllergies}
              onChangeText={setEditPetAllergies}
              placeholder="e.g. Chicken allergy, sensitive stomach"
            />

            <Field
              label="Cup size (grams of food per cup)"
              value={editPetCup}
              onChangeText={setEditPetCup}
              keyboardType="number-pad"
            />

            <View style={{ marginTop: 28 }}>
              <AccentButton
                disabled={!editPetName.trim()}
                onPress={() => {
                  // The stepper clamps at today, but quick chips + stale state
                  // keep the guard worth having.
                  if (editPetBirth != null && editPetBirth > Date.now()) {
                    toast("alert", "Birth date is in the future", "Pick the actual birth date");
                    return;
                  }
                  editPet(editingPet.id, {
                    name: editPetName.trim(),
                    breed: resolvedEditBreed,
                    ageYears: Number(editPetAge) || editingPet.ageYears,
                    weightKg: unitToKg(Number(editPetWeight) || kgToUnit(editingPet.weightKg, state.units), state.units),
                    cupGrams: Math.round(Number(editPetCup)) || editingPet.cupGrams,
                    gender: editPetGender === "unset" ? null : editPetGender,
                    birthDate: editPetBirth,
                    microchip: editPetChip.trim() || null,
                    allergies: editPetAllergies.trim() || null,
                  });
                  toast("paw", `${editPetName.trim()} updated`, "");
                  setEditingPet(null);
                }}
              >
                Save changes
              </AccentButton>
            </View>

            <Group style={{ marginTop: 12 }}>
              <ConfirmRow
                label="Delete pet"
                confirmLabel={`Tap again — deletes ${editingPet.name} and all history`}
                onConfirm={() => {
                  const name = editingPet.name;
                  deletePet(editingPet.id);
                  setEditingPet(null);
                  toast("person", `${name} was removed`, "");
                }}
              />
            </Group>
          </>
        )}
      </Sheet>

      {/* Family password */}
      <Sheet open={familyPwOpen} onClose={closeFamilyPw}>
        <SheetTitle>{state.familyPasswordSet ? "Change family password" : "Set a family password"}</SheetTitle>
        <SheetSubtitle>Protects the Family section on shared devices — not a full account login.</SheetSubtitle>

        {state.familyPasswordSet && <Field label="Current password" value={currentPw} onChangeText={setCurrentPw} secure />}

        <Field label="New password" value={newPw} onChangeText={setNewPw} secure placeholder="At least 6 characters" />
        {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}

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

      {/* Edit card — reachable only from the manage-account sheet, and only for
          your own card or (as owner/admin) someone else's. */}
      <Sheet
        open={editingMember !== null}
        onClose={() => {
          setEditingMember(null);
          setEditMemberShowTerms(false);
        }}
      >
        {editingMember &&
          (editMemberShowTerms ? (
            <CaregiverTermsView
              onAccept={() => {
                setEditMemberTermsAccepted(true);
                setEditMemberShowTerms(false);
              }}
              onBack={() => setEditMemberShowTerms(false)}
            />
          ) : (
            <>
              <SheetTitle>Edit {editingMember.name}</SheetTitle>

              <Field label="Name" value={editMemberName} onChangeText={setEditMemberName} />

              {/* The REAL household role, read-only. Only the owner changes
                  roles, from the manage-account sheet. */}
              {editingMemberAccount ? (
                <>
                  <FieldLabel>Household role</FieldLabel>
                  <View style={styles.roleReadOnlyRow}>
                    <RoleBadge role={editingMemberAccount.role} />
                    <Text style={styles.fieldHint}>
                      {editingMemberAccount.role === "owner"
                        ? "Owners can do everything, including transferring the household."
                        : editingMemberAccount.role === "admin"
                          ? "Admins can invite and manage members."
                          : "Members can log care and see everything."}
                    </Text>
                  </View>
                </>
              ) : null}

              <FieldLabel>Card labels</FieldLabel>
              <RoleField
                isCaregiver={editMemberIsCaregiver}
                onToggleCaregiver={() =>
                  setEditMemberIsCaregiver((prev) => {
                    const next = !prev;
                    if (!next) setEditMemberTermsAccepted(false);
                    return next;
                  })
                }
                funRole={editMemberFunRole}
                customFunRole={editMemberCustomFunRole}
                onChangeFunRole={setEditMemberFunRole}
                onChangeCustomFunRole={setEditMemberCustomFunRole}
              />

              <View style={{ marginTop: 28 }}>
                {editMemberCaregiverGateActive ? (
                  <AccentButton onPress={() => setEditMemberShowTerms(true)}>Terms and conditions</AccentButton>
                ) : (
                  <AccentButton
                    disabled={!editMemberName.trim()}
                    onPress={() => {
                      editMember(editingMember.id, { name: editMemberName.trim(), role: resolvedEditMemberRole });
                      toast("person", `${editMemberName.trim()} updated`, "");
                      setEditingMember(null);
                    }}
                  >
                    Save changes
                  </AccentButton>
                )}
              </View>
            </>
          ))}
      </Sheet>
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    rowActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roleBadge: { borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 10, paddingVertical: 4 },
    roleBadgeLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.label2 },
    roleReadOnlyRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    inviteCard: { marginTop: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 4 },
    // Wide letter-spacing so the ambiguity-free alphabet stays readable when
    // someone is reading it aloud or copying it by hand.
    inviteCode: { fontSize: 26, fontFamily: font.bold, color: colors.label, letterSpacing: 3, textAlign: "center" },
    inviteMeta: { fontSize: 12, fontFamily: font.regular, color: colors.label3, textAlign: "center" },
    inviteActions: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 8 },
    termsScroll: { marginTop: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
    termsBody: { fontSize: 14, lineHeight: 21, fontFamily: font.regular, color: colors.label2 },
    footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
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
    fieldHint: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
    twoCol: { flexDirection: "row", gap: 12 },
  });
