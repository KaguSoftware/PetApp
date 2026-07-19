import { useRouter } from "expo-router";
import { useState } from "react";
import { Share, StyleSheet, Text, View, type KeyboardTypeOptions } from "react-native";
import PageLoading from "@/components/PageLoading";
import PetAvatar, { InitialAvatar } from "@/components/PetAvatar";
import BreedField from "@/components/BreedField";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
  Chevron,
  ConfirmRow,
  FieldLabel,
  Group,
  IconCircle,
  PressableScale,
  PRESS_SCALE_SMALL,
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
  formatWeight,
  isAdminRole,
  kgToUnit,
  OTHER_BREED,
  unitToKg,
  weightUnitLabel,
  type Member,
  type Pet,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { colors, font, radius } from "@/lib/theme";

// The web builds its invite link as `${window.location.origin}/join?f=<familyId>`;
// on native the deployed web origin is fixed here. The app itself opens
// petpal://join?f=<id> (app.json scheme "petpal" → app/join.tsx).
const WEB_ORIGIN = "https://petpal.app";

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

/* -- Local date helpers + stepper (mirrors pet-detail's DateField pattern) -- */

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, DATE_FMT);
}

function atNoon(d: Date) {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.getTime();
}

function shiftDays(ts: number, n: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return atNoon(d);
}

function shiftMonths(now: number, months: number) {
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return atNoon(d);
}

function shiftYears(now: number, years: number) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + years);
  return atNoon(d);
}

/** Day stepper + quick chips for the pet's birth date — no raw YYYY-MM-DD typing. */
function BirthDateField({ value, onChange }: { value: number | null; onChange: (ts: number | null) => void }) {
  const today = atNoon(new Date());
  const chips: { label: string; ts: number }[] = [
    { label: "1 yr ago", ts: shiftYears(today, -1) },
    { label: "3 yrs ago", ts: shiftYears(today, -3) },
    { label: "5 yrs ago", ts: shiftYears(today, -5) },
    { label: "6 mo ago", ts: shiftMonths(today, -6) },
  ];
  // Future-date guard: the stepper can never step past today.
  const step = (n: number) => onChange(Math.min(today, shiftDays(value ?? today, n)));
  return (
    <View>
      <View style={styles.stepperRow}>
        <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => step(-1)} accessibilityLabel="One day earlier" hitSlop={8}>
          <View style={styles.stepButton}>
            <Icon name="chevron-left" size={16} color={colors.accent} />
          </View>
        </PressableScale>
        <Text style={[styles.stepperValue, value == null && { color: colors.label3 }]}>
          {value != null ? fmtDate(value) : "Not set"}
        </Text>
        <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => step(1)} accessibilityLabel="One day later" hitSlop={8}>
          <View style={styles.stepButton}>
            <Icon name="chevron-right" size={16} color={colors.accent} />
          </View>
        </PressableScale>
      </View>
      <View style={styles.chipRow}>
        {chips.map((c) => (
          <SelectableChip key={c.label} label={c.label} selected={value === c.ts} onPress={() => onChange(c.ts)} />
        ))}
        <SelectableChip label="None" selected={value == null} onPress={() => onChange(null)} />
      </View>
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
  const [editPetSex, setEditPetSex] = useState<"male" | "female" | "unset">("unset");
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
    setEditPetSex(p.sex ?? "unset");
    setEditPetBirth(p.birthDate != null ? atNoon(new Date(p.birthDate)) : null);
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

  const resolvedEditBreed =
    editPetBreed === OTHER_BREED
      ? editPetCustomBreed.trim() || (editingPet?.species === "dog" ? "Mixed breed" : "House cat")
      : editPetBreed;

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
      <SectionHeader trailing={<SmallButton label="Add member" onPress={() => setAddMemberOpen(true)} />}>Members</SectionHeader>
      <Group>
        {state.members.map((m) => {
          const active = m.id === state.currentMemberId;
          return (
            <Row
              key={m.id}
              onPress={() => {
                if (!active) {
                  switchMember(m.id);
                  toast("person", `Viewing as ${m.name}`, "Actions will be logged as them");
                }
              }}
              leading={<InitialAvatar name={m.name} gradient={m.gradient} size={38} />}
              title={m.name}
              subtitle={m.role}
              // "Edit" must win its own taps; the row switches member.
              interactiveTrailing
              trailing={
                <View style={styles.rowActions}>
                  <SmallButton label="Edit" tone="gray" onPress={() => openEditMember(m)} />
                  {active ? <Icon name="check" size={18} color={colors.accent} /> : null}
                </View>
              }
            />
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
                <View style={styles.rowActions}>
                  {/* Native has no clipboard dependency — sharing the raw ID replaces the web's Copy. */}
                  <SmallButton label="Share" tone="gray" onPress={shareFamilyId} />
                  <SmallButton label="Invite" onPress={shareInvite} />
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
          // The row itself opens the pet (the primary, most-expected action) and
          // "Edit" is the explicit secondary. Previously the row opened the edit
          // sheet while a nested "View" button tried to navigate — two live
          // handlers on the same pixels, and on Android the row usually won, so
          // "View" opened the editor instead of the pet.
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

            <FieldLabel>Sex</FieldLabel>
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

            <FieldLabel>Birth date (optional)</FieldLabel>
            <BirthDateField value={editPetBirth} onChange={setEditPetBirth} />
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
                    sex: editPetSex === "unset" ? null : editPetSex,
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

      {/* Add member */}
      <Sheet open={addMemberOpen} onClose={() => setAddMemberOpen(false)}>
        <SheetTitle>Add a member</SheetTitle>

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
            Add to family
          </AccentButton>
        </View>
      </Sheet>

      {/* Edit member */}
      <Sheet open={editingMember !== null} onClose={() => setEditingMember(null)}>
        {editingMember && (
          <>
            <SheetTitle>Edit {editingMember.name}</SheetTitle>

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
        <SheetTitle>Join a household</SheetTitle>
        <SheetSubtitle>
          Paste the Family ID another member shared with you. You&apos;ll be added as a member and switched to it.
        </SheetSubtitle>
        <TextField
          value={joinId}
          onChangeText={setJoinId}
          placeholder="Family ID"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ marginTop: 20 }}
        />
        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!joinId.trim()}
            loading={joining}
            onPress={async () => {
              setJoining(true);
              const ok = await joinHousehold(joinId.trim());
              // On success the store reloads the household, so only reset
              // state if the join failed.
              if (!ok) setJoining(false);
            }}
          >
            Join household
          </AccentButton>
        </View>
      </Sheet>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  rowActions: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stepperValue: { fontSize: 16, fontFamily: font.medium, color: colors.label },
  chipRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
