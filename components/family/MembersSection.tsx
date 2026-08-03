import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MemberAvatarField from "@/components/MemberAvatarField";
import { InitialAvatar } from "@/components/PetAvatar";
import RoleField from "@/components/RoleField";
import Sheet from "@/components/Sheet";
import {
  AccentButton,
  Chevron,
  FieldLabel,
  Footnote,
  Group,
  IconCircle,
  Row,
  SectionHeader,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
} from "@/components/ui";
import {
  formatMemberRoles,
  FUN_ROLE_EXAMPLES,
  NO_FUN_ROLE,
  OTHER_ROLE,
  parseMemberRoles,
  type HouseholdAccount,
  type HouseholdInvite,
  type JoinRequest,
  type Member,
} from "@/lib/data";
import { copyInviteCode, inviteExpiryLabel, shareInvite } from "@/lib/inviteShare";
import { DEFAULT_MEMBER_EMOJI, MEMBER_GRADIENTS } from "@/lib/memberCard";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import { confirmDestructive, Field, RoleBadge, ROLE_LABEL, useFamilyStyles } from "./shared";

const CAREGIVER_TERMS_TEXT = `By assigning the Pet caregiver role to a household member, you acknowledge and agree to the following:

PetPal is a coordination tool that connects people who already share responsibility for a pet's care. We do not vet, supervise, screen, or guarantee the conduct of any caregiver, family member, or other person you choose to add to your household.

PetPal and its operators are not responsible or liable for any theft, loss, damage, injury, or other harm that results — directly or indirectly — from granting someone the Pet caregiver role, or from any actions taken by a caregiver, whether inside or outside the app.

You are solely responsible for deciding who you trust with this role. Only assign it to people you already know and trust with your pets, your home, and your belongings.

The Pet caregiver role is currently a label only, with no special app permissions attached. Assigning or removing it does not grant or restrict access to any account, billing, or household-management features.

By tapping "Accept terms and conditions" below, you confirm that you understand and agree to the above.`;

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

/**
 * Family screen — the PEOPLE in this household: who's in it, what they can do,
 * and how someone new gets in. Anything about the household itself lives in
 * HouseholdSection, anything about the animals in PetsSection.
 */
export default function MembersSection() {
  const colors = useColors();
  const shared = useFamilyStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    state,
    userId,
    editMember,
    leaveHousehold,
    removeHouseholdMember,
    setMemberRole,
    transferOwnership,
    createInvite,
    fetchInvites,
    revokeInvite,
    fetchJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    toast,
  } = useStore();

  // The ENFORCED role (household_members.role, RLS-backed from 0026) — the
  // free-text card chips are cosmetic and grant nothing.
  const myRole = state.myRole;
  const canManage = myRole === "owner" || myRole === "admin";

  // Pending invite redemptions awaiting approval — admin+ only.
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [decidingRequestId, setDecidingRequestId] = useState<string | null>(null);
  useEffect(() => {
    if (!canManage) return;
    fetchJoinRequests().then(setJoinRequests);
  }, [canManage, state.activeHouseholdId, fetchJoinRequests]);

  // Account management sheet (tap a signed-in family member).
  //
  // "Edit card" and the caregiver terms are VIEWS INSIDE this one sheet, never
  // a second <Sheet>. Sheet renders a native Modal, and on iOS presenting a
  // second modal while the first is still dismissing (ours animates out over
  // 240ms) is refused by UIKit — RCTModalHostViewManager calls
  // presentViewController: unconditionally, so the new sheet silently never
  // appeared and "Edit card" did nothing at all. Same reason the terms view
  // was already inlined here.
  const [managing, setManaging] = useState<HouseholdAccount | null>(null);
  const [managingBusy, setManagingBusy] = useState(false);
  const [managingView, setManagingView] = useState<"manage" | "edit" | "terms">("manage");

  const closeManaging = () => {
    setManaging(null);
    setManagingView("manage");
  };

  // Invite sheet.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteExpiry, setInviteExpiry] = useState<24 | 168>(168);
  const [inviteUses, setInviteUses] = useState<"multi" | "single">("multi");
  // The role/expiry/uses rows stay hidden behind "Customize" — the defaults
  // (member · 7 days · whole family) are what nearly every invite wants.
  const [inviteCustomOpen, setInviteCustomOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [activeInvites, setActiveInvites] = useState<HouseholdInvite[]>([]);

  const openInvite = () => {
    setInviteRole("member");
    setInviteExpiry(168);
    setInviteUses("multi");
    setInviteCustomOpen(false);
    setInviteOpen(true);
    fetchInvites().then(setActiveInvites);
  };

  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberEmoji, setEditMemberEmoji] = useState(DEFAULT_MEMBER_EMOJI);
  const [editMemberGradient, setEditMemberGradient] = useState<[string, string]>(MEMBER_GRADIENTS[0]);
  const [editMemberIsCaregiver, setEditMemberIsCaregiver] = useState(false);
  const [editMemberFunRole, setEditMemberFunRole] = useState(NO_FUN_ROLE);
  const [editMemberCustomFunRole, setEditMemberCustomFunRole] = useState("");
  const [editMemberTermsAccepted, setEditMemberTermsAccepted] = useState(false);

  const openEditMember = (m: Member) => {
    setEditMemberName(m.name);
    setEditMemberEmoji(m.emoji || DEFAULT_MEMBER_EMOJI);
    setEditMemberGradient(m.gradient);
    // parsed.isAdmin is read and DISCARDED on purpose: legacy cards may still
    // carry the old cosmetic "Admin" label, and saving now drops it.
    const parsed = parseMemberRoles(m.role);
    setEditMemberIsCaregiver(parsed.isCaregiver);
    // Already a caregiver from before this gate existed — grandfathered in, no re-prompt.
    setEditMemberTermsAccepted(parsed.isCaregiver);
    setManagingView("edit");
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

  // Assigning "Pet caregiver" requires accepting the liability disclaimer first —
  // the Save button itself turns into the "Terms and conditions" prompt until then.
  const editMemberCaregiverGateActive = editMemberIsCaregiver && !editMemberTermsAccepted;

  const resolveFunRole = (funRole: string, customFunRole: string) =>
    funRole === NO_FUN_ROLE ? "" : funRole === OTHER_ROLE ? customFunRole.trim() : funRole;

  const resolvedEditMemberRole = formatMemberRoles({
    isCaregiver: editMemberIsCaregiver,
    customRole: resolveFunRole(editMemberFunRole, editMemberCustomFunRole),
  });

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

  return (
    <>
      {/* Signed-in family accounts */}
      <SectionHeader>Members</SectionHeader>
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
                  <InitialAvatar name={card.name} gradient={card.gradient} size={38} emoji={card.emoji} />
                ) : (
                  <IconCircle icon="person" tint={colors.label2} bg={colors.fill} size={38} />
                )
              }
              title={`${card?.name ?? "Family member"}${isSelf ? " (you)" : ""}`}
              subtitle={`Joined ${new Date(a.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
              trailing={
                <View style={shared.rowActions}>
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
      <Text style={shared.footnote}>
        Everyone here has their own PetPal account. Roles are enforced — only the owner and admins can invite or manage.
      </Text>

      {/* Pending invite redemptions — must be approved before they get access. */}
      {canManage && joinRequests.length > 0 ? (
        <>
          <SectionHeader>Pending requests</SectionHeader>
          <Group>
            {joinRequests.map((r) => (
              <Row
                key={r.id}
                leading={
                  <InitialAvatar
                    name={r.requesterName ?? "New member"}
                    gradient={["oklch(0.6 0.13 200)", "oklch(0.48 0.13 240)"]}
                    size={36}
                  />
                }
                title={r.requesterName ?? "New member"}
                subtitle={`Wants to join as ${r.role === "admin" ? "an admin" : "a member"}`}
                trailing={
                  <View style={shared.rowActions}>
                    <SmallButton
                      label="Reject"
                      tone="red"
                      disabled={decidingRequestId === r.id}
                      onPress={async () => {
                        setDecidingRequestId(r.id);
                        const ok = await rejectJoinRequest(r.id);
                        setDecidingRequestId(null);
                        if (ok) setJoinRequests((prev) => prev.filter((x) => x.id !== r.id));
                      }}
                    />
                    <SmallButton
                      label="Approve"
                      tone="green"
                      disabled={decidingRequestId === r.id}
                      onPress={async () => {
                        setDecidingRequestId(r.id);
                        const ok = await approveJoinRequest(r.id);
                        setDecidingRequestId(null);
                        if (ok) setJoinRequests((prev) => prev.filter((x) => x.id !== r.id));
                      }}
                    />
                  </View>
                }
              />
            ))}
          </Group>
        </>
      ) : null}

      <View style={{ height: 16 }} />

      {/* Manage a signed-in account */}
      <Sheet open={managing !== null} onClose={closeManaging}>
        {managing && managingView === "manage" && (
          <>
            <SheetTitle>{managingCard?.name ?? "Family member"}</SheetTitle>
            <SheetSubtitle>
              {ROLE_LABEL[managing.role]} · joined{" "}
              {new Date(managing.joinedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </SheetSubtitle>
            <Group style={{ marginTop: 16 }}>
              {managingCard && (managingIsSelf || canManage) ? (
                <Row
                  onPress={() => openEditMember(managingCard)}
                  leading={
                    <InitialAvatar name={managingCard.name} gradient={managingCard.gradient} size={36} emoji={managingCard.emoji} />
                  }
                  title="Edit card"
                  subtitle="Name, icon, color and cosmetic roles"
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
                      closeManaging();
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
                          closeManaging();
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
                        closeManaging();
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
                        if (ok) closeManaging();
                      }
                    )
                  }
                  leading={<IconCircle icon="alert" tint={colors.red} bg={colors.redSoft} />}
                  title="Leave household"
                />
              ) : null}
            </Group>
            {managingIsSelf && myRole === "owner" ? (
              <Text style={shared.footnote}>
                Owners can{"'"}t leave — transfer ownership to another member first (tap them, then Transfer ownership).
              </Text>
            ) : null}
          </>
        )}

        {/* Edit card — a view of the manage sheet, not a sheet of its own. */}
        {managing && managingCard && managingView === "edit" && (
          <>
            <SheetTitle>Edit card</SheetTitle>
            <SheetSubtitle>How {managingIsSelf ? "you appear" : `${managingCard.name} appears`} across the app.</SheetSubtitle>

            <Field label="Name" value={editMemberName} onChangeText={setEditMemberName} />

            <MemberAvatarField
              name={editMemberName}
              emoji={editMemberEmoji}
              gradient={editMemberGradient}
              onChangeEmoji={setEditMemberEmoji}
              onChangeGradient={setEditMemberGradient}
            />

            {/* The REAL household role, read-only. Only the owner changes
                roles, from the manage view. */}
            <FieldLabel>Household role</FieldLabel>
            <View style={styles.roleReadOnlyRow}>
              <RoleBadge role={managing.role} />
              <Text style={shared.fieldHint}>
                {managing.role === "owner"
                  ? "Owners can do everything, including transferring the household."
                  : managing.role === "admin"
                    ? "Admins can invite and manage members."
                    : "Members can log care and see everything."}
              </Text>
            </View>

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

            <SheetFooter>
              {editMemberCaregiverGateActive ? (
                <AccentButton onPress={() => setManagingView("terms")}>Terms and conditions</AccentButton>
              ) : (
                <AccentButton
                  disabled={!editMemberName.trim()}
                  onPress={() => {
                    const name = editMemberName.trim();
                    editMember(managingCard.id, {
                      name,
                      role: resolvedEditMemberRole,
                      emoji: editMemberEmoji,
                      gradient: editMemberGradient,
                    });
                    toast("person", `${name} updated`, "");
                    closeManaging();
                  }}
                >
                  Save changes
                </AccentButton>
              )}
              <View style={{ marginTop: 12 }}>
                <SmallButton label="Back" tone="gray" onPress={() => setManagingView("manage")} />
              </View>
            </SheetFooter>
          </>
        )}

        {managing && managingView === "terms" && (
          <CaregiverTermsView
            onAccept={() => {
              setEditMemberTermsAccepted(true);
              setManagingView("edit");
            }}
            onBack={() => setManagingView("edit")}
          />
        )}
      </Sheet>

      {/* Invite sheet */}
      <Sheet open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <SheetTitle>Invite family</SheetTitle>
        <SheetSubtitle>Share one code with the whole family, or lock it to a single use.</SheetSubtitle>

        {inviteCustomOpen ? (
          <>
            {myRole === "owner" ? (
              <>
                <FieldLabel>Role</FieldLabel>
                <View style={shared.chipRow}>
                  <SelectableChip label="Member" selected={inviteRole === "member"} onPress={() => setInviteRole("member")} />
                  <SelectableChip label="Admin" selected={inviteRole === "admin"} onPress={() => setInviteRole("admin")} />
                </View>
              </>
            ) : null}

            <FieldLabel>Expires</FieldLabel>
            <View style={shared.chipRow}>
              <SelectableChip label="7 days" selected={inviteExpiry === 168} onPress={() => setInviteExpiry(168)} />
              <SelectableChip label="24 hours" selected={inviteExpiry === 24} onPress={() => setInviteExpiry(24)} />
            </View>

            <FieldLabel>Uses</FieldLabel>
            <View style={shared.chipRow}>
              <SelectableChip label="Whole family" selected={inviteUses === "multi"} onPress={() => setInviteUses("multi")} />
              <SelectableChip label="One person" selected={inviteUses === "single"} onPress={() => setInviteUses("single")} />
            </View>
          </>
        ) : (
          <View style={{ marginTop: 12, gap: 12, alignItems: "flex-start" }}>
            <Footnote>The code joins people as members, works for the whole family, and lasts 7 days.</Footnote>
            <SmallButton label="Customize" onPress={() => setInviteCustomOpen(true)} />
          </View>
        )}

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
    </>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    roleReadOnlyRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    inviteCard: { marginTop: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 4 },
    // Wide letter-spacing so the ambiguity-free alphabet stays readable when
    // someone is reading it aloud or copying it by hand.
    inviteCode: { fontSize: 26, fontFamily: font.bold, color: colors.label, letterSpacing: 3, textAlign: "center" },
    inviteMeta: { fontSize: 12, fontFamily: font.regular, color: colors.label3, textAlign: "center" },
    inviteActions: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 8 },
    termsScroll: { marginTop: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
    termsBody: { fontSize: 14, lineHeight: 21, fontFamily: font.regular, color: colors.label2 },
  });
