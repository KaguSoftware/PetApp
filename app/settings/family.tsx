import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import PageLoading from "@/components/PageLoading";
import PetAvatar, { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { AccentButton, Chevron, ConfirmRow, Group, IconCircle, Row, SectionHeader, Segmented } from "@/components/ui";
import { formatAge, formatWeight, isAdminRole, kgToUnit, unitToKg, weightUnitLabel, type Member, type Pet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { colors, font, radius, HIT } from "@/lib/theme";

// The web builds its invite link as `${window.location.origin}/join?f=<familyId>`;
// on native the deployed web origin is fixed here. The app itself opens
// petpal://join?f=<id> (app.json scheme "petpal" → app/join.tsx).
const WEB_ORIGIN = "https://petpal.app";

/** Labelled text field — the RN counterpart of the web sheet inputs. */
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
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.label3}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export default function FamilySettingsPage() {
  const router = useRouter();
  const {
    state,
    hydrated,
    switchMember,
    editPet,
    deletePet,
    addMember,
    editMember,
    removeMember,
    setFamilyPassword,
    verifyFamilyPassword,
    joinHousehold,
    setActiveHousehold,
    toast,
  } = useStore();

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [joining, setJoining] = useState(false);

  // Lock gate — component-local so it resets whenever the user leaves the page.
  const [unlocked, setUnlocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const currentMember = state.members.find((m) => m.id === state.currentMemberId);
  const isAdmin = !!currentMember && isAdminRole(currentMember.role);

  const [familyPwOpen, setFamilyPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");

  const closeFamilyPw = () => {
    setFamilyPwOpen(false);
    setCurrentPw("");
    setNewPw("");
    setPwError("");
  };

  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editPetName, setEditPetName] = useState("");
  const [editPetBreed, setEditPetBreed] = useState("");
  const [editPetAge, setEditPetAge] = useState("");
  const [editPetWeight, setEditPetWeight] = useState("");
  const [editPetCup, setEditPetCup] = useState("");
  const [editPetSex, setEditPetSex] = useState<"male" | "female" | "unset">("unset");
  const [editPetBirth, setEditPetBirth] = useState("");
  const [editPetChip, setEditPetChip] = useState("");
  const [editPetAllergies, setEditPetAllergies] = useState("");

  const [deletingPet, setDeletingPet] = useState<Pet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const openEditPet = (p: Pet) => {
    setEditingPet(p);
    setEditPetName(p.name);
    setEditPetBreed(p.breed);
    setEditPetAge(String(Math.round(p.ageYears * 10) / 10));
    setEditPetWeight(String(kgToUnit(p.weightKg, state.units)));
    setEditPetCup(String(p.cupGrams));
    setEditPetSex(p.sex ?? "unset");
    setEditPetBirth(p.birthDate != null ? new Date(p.birthDate).toISOString().slice(0, 10) : "");
    setEditPetChip(p.microchip ?? "");
    setEditPetAllergies(p.allergies ?? "");
  };

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberRole, setEditMemberRole] = useState("");

  const openEditMember = (m: Member) => {
    setEditingMember(m);
    setEditMemberName(m.name);
    setEditMemberRole(m.role);
  };

  if (!hydrated) {
    return (
      <PushedScreen title="Family">
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
      <PushedScreen title="Family">
        <View style={styles.lockCard}>
          <View style={styles.lockIcon}>
            <Icon name="lock" size={26} color={colors.accent} />
          </View>
          <Text style={styles.lockTitle}>Family section locked</Text>
          <Text style={styles.lockBody}>Enter the family password to manage members, pets, and household settings.</Text>
          <TextInput
            secureTextEntry
            autoFocus
            value={unlockInput}
            onChangeText={setUnlockInput}
            onSubmitEditing={submitUnlock}
            placeholder="Family password"
            placeholderTextColor={colors.label3}
            style={[styles.input, { marginTop: 16, backgroundColor: colors.fill }]}
          />
          {unlockError ? <Text style={styles.errorText}>{unlockError}</Text> : null}
          <View style={{ marginTop: 12, width: "100%" }}>
            <AccentButton disabled={unlocking || !unlockInput} onPress={submitUnlock}>
              {unlocking ? "Checking…" : "Unlock"}
            </AccentButton>
          </View>
        </View>
      </PushedScreen>
    );
  }

  const shareInvite = async () => {
    if (!state.familyId) return;
    const url = `${WEB_ORIGIN}/join?f=${state.familyId}`;
    const text = "Join our PetPal household to share pet care:";
    try {
      await Share.share({ title: "Join our PetPal family", message: `${text} ${url}\nIn the app: petpal://join?f=${state.familyId}` });
    } catch {
      // user closed the OS sheet — that's a cancel, not a failure
    }
  };

  const shareFamilyId = async () => {
    if (!state.familyId) return;
    try {
      await Share.share({ message: state.familyId });
    } catch {
      // cancelled
    }
  };

  return (
    <PushedScreen title="Family">
      {/* Members */}
      <SectionHeader
        trailing={
          <Pressable onPress={() => setAddMemberOpen(true)} hitSlop={10}>
            <Text style={styles.accentAction}>Add member</Text>
          </Pressable>
        }
      >
        Members
      </SectionHeader>
      <Group>
        {state.members.map((m) => {
          const active = m.id === state.currentMemberId;
          return (
            <View key={m.id} style={styles.memberRow}>
              <Pressable
                onPress={() => {
                  if (!active) {
                    switchMember(m.id);
                    toast("person", `Viewing as ${m.name}`, "Actions will be logged as them");
                  }
                }}
                accessibilityLabel={active ? `${m.name}, current member` : `View the demo as ${m.name}`}
                style={({ pressed }) => [styles.memberMain, pressed && { opacity: 0.6 }]}
              >
                <InitialAvatar name={m.name} gradient={m.gradient} size={38} />
                <View style={styles.memberText}>
                  <Text numberOfLines={1} style={styles.memberName}>
                    {m.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.memberRole}>
                    {m.role}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => openEditMember(m)}
                accessibilityLabel={`Edit ${m.name}`}
                hitSlop={10}
                style={({ pressed }) => pressed && { transform: [{ scale: 0.95 }] }}
              >
                <Text style={styles.accentAction}>Edit</Text>
              </Pressable>
              {active ? (
                <Icon name="check" size={18} color={colors.accent} />
              ) : (
                <Text style={styles.switchHint}>Switch</Text>
              )}
            </View>
          );
        })}
      </Group>
      <Text style={styles.footnote}>Tap a member to view the demo as them, or Edit to manage them.</Text>

      {/* Households the user belongs to + join another */}
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
              subtitle={active ? "Current household" : "Tap to switch"}
              trailing={active ? <Icon name="check" size={18} color={colors.accent} /> : <Chevron />}
            />
          );
        })}
        <Row
          onPress={() => {
            setJoinId("");
            setJoinOpen(true);
          }}
          leading={<IconCircle icon="plus" tint={colors.accent} bg={colors.accentSoft} />}
          title="Join a household"
          subtitle="Enter a Family ID someone shared with you"
          trailing={<Chevron />}
        />
      </Group>

      {/* Family ID + admin password — admin role only */}
      {isAdmin && (
        <>
          <SectionHeader>Household</SectionHeader>
          <Group>
            <Row
              leading={<IconCircle icon="people" tint={colors.label2} bg={colors.fill} />}
              title="Family ID"
              subtitle={state.familyId ? `${state.familyId.slice(0, 8)}…` : "Loading…"}
              trailing={
                <View style={styles.idActions}>
                  {/* Native has no clipboard dependency — sharing the raw ID replaces the web's Copy. */}
                  <Pressable onPress={shareFamilyId} hitSlop={10}>
                    <Text style={styles.accentAction}>Share</Text>
                  </Pressable>
                  <Pressable onPress={shareInvite} hitSlop={10}>
                    <Text style={styles.accentAction}>Invite</Text>
                  </Pressable>
                </View>
              }
            />
            <Row
              onPress={() => setFamilyPwOpen(true)}
              leading={<IconCircle icon="lock" tint={colors.label2} bg={colors.fill} />}
              title="Family password"
              subtitle={state.familyPasswordSet ? "Set — tap to change" : "Not set — tap to add one"}
              trailing={<Chevron />}
            />
          </Group>
          <Text style={styles.footnote}>
            Share the Family ID so others can find this household. Only admins can see this and lock it with a password.
          </Text>
        </>
      )}

      {/* Pets */}
      <SectionHeader>Pets</SectionHeader>
      <Group>
        {state.pets.map((p) => (
          <View key={p.id} style={styles.memberRow}>
            <Pressable
              onPress={() => openEditPet(p)}
              accessibilityLabel={`Edit ${p.name}`}
              style={({ pressed }) => [styles.memberMain, pressed && { opacity: 0.6 }]}
            >
              <PetAvatar pet={p} size="sm" />
              <View style={styles.memberText}>
                <Text numberOfLines={1} style={styles.memberName}>
                  {p.name}
                </Text>
                <Text numberOfLines={1} style={styles.memberRole}>
                  {`${p.breed} · ${formatAge(p.ageYears)} · ${formatWeight(p.weightKg, state.units)}`}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/pet/${p.id}`)}
              accessibilityLabel={`View ${p.name}'s details`}
              hitSlop={10}
              style={({ pressed }) => [styles.viewButton, pressed && { transform: [{ scale: 0.95 }] }]}
            >
              <Text style={styles.accentAction}>View</Text>
              <Icon name="chevron-right" size={15} color={colors.label3} />
            </Pressable>
          </View>
        ))}
      </Group>
      <Text style={styles.footnote}>Tap a pet to edit it, or View for full details.</Text>

      <View style={{ height: 16 }} />

      {/* Edit pet */}
      <Sheet open={editingPet !== null} onClose={() => setEditingPet(null)}>
        {editingPet && (
          <>
            <Text style={styles.sheetTitle}>Edit {editingPet.name}</Text>

            <Field label="Name" value={editPetName} onChangeText={setEditPetName} />
            <Field label="Breed" value={editPetBreed} onChangeText={setEditPetBreed} />

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

            <Text style={styles.fieldLabel}>SEX</Text>
            <Segmented
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "unset", label: "Not set" },
              ]}
              value={editPetSex}
              onChange={setEditPetSex}
            />
            <Text style={styles.fieldHint}>Used for the age-and-sex-specific weight & feeding guide.</Text>

            <Field
              label="Birth date (optional)"
              value={editPetBirth}
              onChangeText={setEditPetBirth}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              hint={editPetBirth ? "With a birth date set, age is calculated automatically." : undefined}
            />

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
                disabled={!editPetName.trim() || !editPetBreed.trim()}
                onPress={() => {
                  const birthTrimmed = editPetBirth.trim();
                  const birthDate = birthTrimmed ? new Date(`${birthTrimmed}T12:00:00`).getTime() : null;
                  if (birthTrimmed && (birthDate == null || Number.isNaN(birthDate))) {
                    toast("alert", "Birth date not recognized", "Use the YYYY-MM-DD format");
                    return;
                  }
                  if (birthDate != null && birthDate > Date.now()) {
                    toast("alert", "Birth date is in the future", "Pick the actual birth date");
                    return;
                  }
                  editPet(editingPet.id, {
                    name: editPetName.trim(),
                    breed: editPetBreed.trim(),
                    ageYears: Number(editPetAge) || editingPet.ageYears,
                    weightKg: unitToKg(Number(editPetWeight) || kgToUnit(editingPet.weightKg, state.units), state.units),
                    cupGrams: Math.round(Number(editPetCup)) || editingPet.cupGrams,
                    sex: editPetSex === "unset" ? null : editPetSex,
                    birthDate,
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
              <Row
                destructive
                title="Delete pet"
                onPress={() => {
                  setDeletingPet(editingPet);
                  setDeleteConfirm("");
                }}
              />
            </Group>
          </>
        )}
      </Sheet>

      {/* Delete pet */}
      <Sheet
        open={deletingPet !== null}
        onClose={() => {
          setDeletingPet(null);
          setDeleteConfirm("");
        }}
      >
        {deletingPet && (
          <>
            <Text style={styles.sheetTitle}>Delete {deletingPet.name}?</Text>
            <Text style={styles.sheetSub}>
              This permanently removes {deletingPet.name}, along with its supplies, plan progress, and history. This can&apos;t be undone.
            </Text>

            <Field
              label={`Type ${deletingPet.name} to confirm`}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder={deletingPet.name}
              autoCapitalize="none"
            />

            <View style={{ marginTop: 28, gap: 8 }}>
              <View style={{ borderRadius: radius.md, overflow: "hidden" }}>
                <Pressable
                  disabled={deleteConfirm.trim().toLowerCase() !== deletingPet.name.trim().toLowerCase()}
                  onPress={() => {
                    const name = deletingPet.name;
                    deletePet(deletingPet.id);
                    setDeletingPet(null);
                    setDeleteConfirm("");
                    setEditingPet(null);
                    toast("person", `${name} was removed`, "");
                  }}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    deleteConfirm.trim().toLowerCase() !== deletingPet.name.trim().toLowerCase() && { opacity: 0.4 },
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text style={styles.deleteButtonLabel}>Delete {deletingPet.name}</Text>
                </Pressable>
              </View>
              <AccentButton
                variant="gray"
                onPress={() => {
                  setDeletingPet(null);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </AccentButton>
            </View>
          </>
        )}
      </Sheet>

      {/* Family password */}
      <Sheet open={familyPwOpen} onClose={closeFamilyPw}>
        <Text style={styles.sheetTitle}>{state.familyPasswordSet ? "Change family password" : "Set a family password"}</Text>
        <Text style={styles.sheetSub}>Protects the Family section on shared devices — not a full account login.</Text>

        {state.familyPasswordSet && <Field label="Current password" value={currentPw} onChangeText={setCurrentPw} secure />}

        <Field label="New password" value={newPw} onChangeText={setNewPw} secure placeholder="At least 6 characters" />
        {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}

        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={newPw.trim().length < 6 || (state.familyPasswordSet && !currentPw)}
            onPress={async () => {
              setPwError("");
              const ok = await setFamilyPassword(newPw.trim(), currentPw || undefined);
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

      {/* Add member */}
      <Sheet open={addMemberOpen} onClose={() => setAddMemberOpen(false)}>
        <Text style={styles.sheetTitle}>Add a member</Text>

        <Field label="Name" value={newMemberName} onChangeText={setNewMemberName} placeholder="e.g. Alex" />
        <Field label="Role" value={newMemberRole} onChangeText={setNewMemberRole} />

        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!newMemberName.trim() || !hydrated}
            onPress={() => {
              addMember(newMemberName.trim(), newMemberRole.trim() || "Member");
              setAddMemberOpen(false);
              setNewMemberName("");
              setNewMemberRole("Member");
            }}
          >
            {hydrated ? "Add to family" : "Loading…"}
          </AccentButton>
        </View>
      </Sheet>

      {/* Edit member */}
      <Sheet open={editingMember !== null} onClose={() => setEditingMember(null)}>
        {editingMember && (
          <>
            <Text style={styles.sheetTitle}>Edit {editingMember.name}</Text>

            <Field label="Name" value={editMemberName} onChangeText={setEditMemberName} />
            <Field label="Role" value={editMemberRole} onChangeText={setEditMemberRole} />

            <View style={{ marginTop: 28 }}>
              <AccentButton
                disabled={!editMemberName.trim()}
                onPress={() => {
                  editMember(editingMember.id, { name: editMemberName.trim(), role: editMemberRole.trim() || "Member" });
                  toast("person", `${editMemberName.trim()} updated`, "");
                  setEditingMember(null);
                }}
              >
                Save changes
              </AccentButton>
            </View>

            {state.members.length > 1 && (
              <Group style={{ marginTop: 12 }}>
                <ConfirmRow
                  label="Remove member"
                  confirmLabel="Tap again — also deletes their activity history"
                  onConfirm={() => {
                    const name = editingMember.name;
                    removeMember(editingMember.id);
                    setEditingMember(null);
                    toast("person", `${name} was removed`, "");
                  }}
                />
              </Group>
            )}
          </>
        )}
      </Sheet>

      {/* Join a household */}
      <Sheet
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          setJoinId("");
        }}
      >
        <Text style={styles.sheetTitle}>Join a household</Text>
        <Text style={styles.sheetSub}>
          Paste the Family ID another member shared with you. You&apos;ll be added as a member and switched to it.
        </Text>
        <TextInput
          value={joinId}
          onChangeText={setJoinId}
          placeholder="Family ID"
          placeholderTextColor={colors.label3}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { marginTop: 20 }]}
        />
        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!joinId.trim() || joining}
            onPress={async () => {
              setJoining(true);
              const ok = await joinHousehold(joinId.trim());
              // On success the store reloads the household, so only reset
              // state if the join failed.
              if (!ok) setJoining(false);
            }}
          >
            {joining ? "Joining…" : "Join household"}
          </AccentButton>
        </View>
      </Sheet>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  accentAction: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  switchHint: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 52 },
  memberMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, minHeight: HIT - 12 },
  memberText: { flex: 1, minWidth: 0, paddingVertical: 2 },
  memberName: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  memberRole: { fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  viewButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  idActions: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  errorText: { marginTop: 8, fontSize: 13, fontFamily: font.medium, color: colors.red },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  sheetSub: { marginTop: 4, fontSize: 13, fontFamily: font.regular, lineHeight: 18, color: colors.label3 },
  fieldLabel: { marginTop: 20, marginBottom: 6, fontSize: 13, fontFamily: font.semibold, letterSpacing: 0.6, color: colors.label2 },
  fieldHint: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  input: {
    width: "100%",
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
  },
  twoCol: { flexDirection: "row", gap: 12 },
  deleteButton: { height: 50, borderRadius: radius.md, backgroundColor: colors.red, alignItems: "center", justifyContent: "center" },
  deleteButtonLabel: { fontSize: 17, fontFamily: font.semibold, color: colors.white },
});
