import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { Footnote, PRESS_SCALE_SMALL, PressableScale, Segmented } from "@/components/ui";
import { VET, VETS, formatAge, formatWeight, isAdminRole, nextAnniversary, nextBirthday } from "@/lib/data";
import { useStore } from "@/lib/store";
import { colors, floatShadow, font, radius, withAlpha } from "@/lib/theme";

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, DATE_FMT);
}

function InfoRow({ label, value, mono = false, first = false }: { label: string; value: string; mono?: boolean; first?: boolean }) {
  return (
    <View style={[styles.infoRow, !first && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoValueMono]}>{value}</Text>
    </View>
  );
}

/**
 * The share control's backing surface. iOS wants no background at all — just
 * the bare glyph — so the glass/blur island is Android-only, where a filled
 * pill keeps the control visible against the header.
 */
function ShareGlass({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "ios") return <View style={styles.shareGlass}>{children}</View>;
  return <View style={[styles.shareGlass, styles.shareGlassAndroid]}>{children}</View>;
}

type Variant = "emergency" | "profile";

/** One field of the card — the same config renders the on-screen row AND the
 *  share text, so the two can never drift apart. */
type CardField = { label: string; value: string; mono?: boolean };

export default function PetCardPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, hydrated } = useStore();
  const [variant, setVariant] = useState<Variant>("emergency");

  if (!hydrated) {
    return (
      <PushedScreen title="Pet card">
        <PageLoading />
      </PushedScreen>
    );
  }

  const pet = state.pets.find((p) => p.id === id);
  if (!pet) {
    return (
      <PushedScreen title="Pet card">
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Pet not found</Text>
          <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => router.replace("/home")} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.notFoundLink}>Back home</Text>
          </PressableScale>
        </View>
      </PushedScreen>
    );
  }

  const contact = state.members.find((m) => isAdminRole(m.role)) ?? state.members[0];
  const vet = VETS.find((v) => state.bookedVetIds.includes(v.id)) ?? VET;
  const sexLabel = pet.sex === "male" ? "Male" : pet.sex === "female" ? "Female" : null;
  const speciesLabel = pet.species === "cat" ? "Cat" : "Dog";

  // The two variants serve two different readers, so their fields are two
  // different sets. EMERGENCY = what a sitter/finder/vet needs to act fast:
  // identification, medical flags, who to call. PROFILE = who this pet is:
  // the dates and favorites a friend would care about. Only fields with real
  // data render — no empty rows.
  const emergencyFields: CardField[] = [
    {
      label: "Born",
      value: pet.birthDate != null ? `${fmtDate(pet.birthDate)} (${formatAge(pet.ageYears)})` : formatAge(pet.ageYears),
    },
    { label: "Weight", value: formatWeight(pet.weightKg, state.units) },
    ...(pet.microchip ? [{ label: "Microchip", value: pet.microchip, mono: true }] : []),
    ...(pet.meds.length > 0
      ? [{ label: "Medication", value: pet.meds.map((m) => [m.name, m.dosage].filter(Boolean).join(" ")).join(", ") }]
      : []),
    ...(contact ? [{ label: "Family contact", value: contact.name }] : []),
    { label: "Vet", value: `${vet.name} · ${vet.clinic}` },
    { label: "Vet phone", value: vet.phone, mono: true },
  ];

  const profileFields: CardField[] = [
    pet.birthDate != null
      ? { label: "Next birthday", value: `Turns ${nextBirthday(pet.birthDate).turns} on ${fmtDate(nextBirthday(pet.birthDate).date)}` }
      : { label: "Age", value: formatAge(pet.ageYears) },
    { label: "Gotcha day", value: fmtDate(nextAnniversary(pet.createdAt)) },
    { label: "In the family since", value: fmtDate(pet.createdAt) },
    ...(pet.owned.length > 0 ? [{ label: "Wardrobe", value: `${pet.owned.length} accessories collected` }] : []),
    ...(contact ? [{ label: "Family", value: `${state.members.length} member${state.members.length === 1 ? "" : "s"}` }] : []),
  ];

  const fields = variant === "emergency" ? emergencyFields : profileFields;

  const shareText = [
    variant === "profile" ? `Meet ${pet.name}!` : `${pet.name} — emergency & ID card`,
    `${speciesLabel} · ${pet.breed}${sexLabel ? ` · ${sexLabel}` : ""}`,
    ...(variant === "emergency" && pet.allergies ? [`⚠ Allergies/alerts: ${pet.allergies}`] : []),
    ...fields.map((f) => `${f.label}: ${f.value}`),
    "— shared from PetPal",
  ].join("\n");

  const share = async () => {
    try {
      await Share.share({ title: `${pet.name} — PetPal card`, message: shareText });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  return (
    <PushedScreen
      title="Pet card"
      trailing={
        // Plain Pressable + opacity dim (the header-control pattern from
        // NotificationBell): a scale transform inside the UIBarButtonItem
        // clips against the bar's bounds. 38pt pill + hitSlop → 50pt target.
        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Share card"
          hitSlop={6}
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.6 }]}
        >
          <ShareGlass>
            <Icon name="share" size={20} color={colors.accent} />
          </ShareGlass>
        </Pressable>
      }
    >
      {/* Which card — two different readers, two different field sets. */}
      <View style={{ marginTop: 4 }}>
        <Segmented
          options={[
            { value: "emergency", label: "Emergency" },
            { value: "profile", label: "Profile" },
          ]}
          value={variant}
          onChange={setVariant}
        />
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={[withAlpha(pet.gradient[0], 0.13), withAlpha(pet.gradient[1], 0.07)]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.cardHero}
        >
          <PetAvatar pet={pet} size="xl" />
          <Text style={styles.heroName}>{pet.name}</Text>
          <Text style={styles.heroMeta}>
            {speciesLabel} · {pet.breed}
            {sexLabel ? ` · ${sexLabel}` : ""}
          </Text>
          <View style={[styles.badge, variant === "emergency" ? styles.badgeEmergency : styles.badgeProfile]}>
            <Text style={[styles.badgeLabel, variant === "emergency" ? styles.badgeLabelEmergency : styles.badgeLabelProfile]}>
              {variant === "emergency" ? "Emergency & ID card" : "Profile card"}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.cardBody}>
          {/* Allergies get a loud box, not a quiet row — it's the one field a
              stranger must not miss. Emergency only. */}
          {variant === "emergency" && pet.allergies ? (
            <View style={styles.allergyBox}>
              <Icon name="alert" size={16} color={colors.red} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.allergyLabel}>Allergies &amp; alerts</Text>
                <Text style={styles.allergyValue}>{pet.allergies}</Text>
              </View>
            </View>
          ) : null}
          {fields.map((f, i) => (
            <InfoRow key={f.label} first={i === 0 && !(variant === "emergency" && pet.allergies)} label={f.label} value={f.value} mono={f.mono} />
          ))}
        </View>
      </View>

      <Footnote style={{ marginTop: 14, paddingHorizontal: 8 }}>
        {variant === "emergency"
          ? `This is what you'd hand a sitter or post if ${pet.name} ever went missing — share it with the button up top, and keep the microchip and allergy info current in Settings ▸ Family.`
          : `${pet.name}'s intro card — share it with the button up top.`}
      </Footnote>
      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
  notFoundTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  notFoundLink: { marginTop: 12, fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  // iOS: no fill — just the bare glyph. Android keeps the accent pill.
  shareButton: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  shareGlass: { flex: 1, alignSelf: "stretch", borderRadius: 19, alignItems: "center", justifyContent: "center" },
  shareGlassAndroid: { backgroundColor: colors.accentSoft },
  card: { marginTop: 14, borderRadius: radius.lg, backgroundColor: colors.card, overflow: "hidden", ...floatShadow },
  cardHero: { alignItems: "center", paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  heroName: { marginTop: 12, fontSize: 26, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
  heroMeta: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },
  badge: { marginTop: 8, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeEmergency: { backgroundColor: colors.redSoft },
  badgeProfile: { backgroundColor: colors.accentSoft },
  badgeLabel: { fontSize: 12, fontFamily: font.semibold },
  badgeLabelEmergency: { color: colors.red },
  badgeLabelProfile: { color: colors.accent },
  cardBody: { paddingHorizontal: 20, paddingBottom: 20 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 10 },
  infoRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  infoLabel: {
    fontSize: 12,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.label3,
    paddingTop: 2,
  },
  infoValue: { flex: 1, minWidth: 0, textAlign: "right", fontSize: 14, fontFamily: font.semibold, color: colors.label },
  infoValueMono: { fontSize: 13, letterSpacing: 0.8 },
  allergyBox: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  allergyLabel: { fontSize: 12, fontFamily: font.semibold, textTransform: "uppercase", letterSpacing: 0.6, color: colors.red },
  allergyValue: { marginTop: 1, fontSize: 14, fontFamily: font.semibold, color: colors.label, lineHeight: 19 },
});
