import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { AccentButton, Footnote, PRESS_SCALE_SMALL, PressableScale } from "@/components/ui";
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

export default function PetCardPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, hydrated } = useStore();
  const [variant, setVariant] = useState<"emergency" | "profile">("emergency");

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

  const shareText = [
    variant === "profile" ? `Meet ${pet.name}!` : `${pet.name} — pet info card`,
    `${speciesLabel} · ${pet.breed}${sexLabel ? ` · ${sexLabel}` : ""}`,
    pet.birthDate != null ? `Born ${fmtDate(pet.birthDate)} (${formatAge(pet.ageYears)})` : `Age ${formatAge(pet.ageYears)}`,
    `Weight ${formatWeight(pet.weightKg, state.units)}`,
    pet.microchip ? `Microchip: ${pet.microchip}` : null,
    pet.allergies ? `Allergies/alerts: ${pet.allergies}` : null,
    pet.meds.length > 0 ? `Medication: ${pet.meds.map((m) => [m.name, m.dosage].filter(Boolean).join(" ")).join(", ")}` : null,
    contact ? `Family contact: ${contact.name}` : null,
    `Vet: ${vet.name}, ${vet.clinic}`,
    "— shared from PetPal",
  ]
    .filter(Boolean)
    .join("\n");

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
        <PressableScale scaleTo={PRESS_SCALE_SMALL} haptic onPress={share} accessibilityRole="button" accessibilityLabel="Share card" hitSlop={8}>
          <View style={styles.shareButton}>
            <Icon name="share" size={16} color={colors.accent} />
          </View>
        </PressableScale>
      }
    >
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
          {variant === "emergency" ? (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeLabel}>Emergency &amp; ID card</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.cardBody}>
          {variant === "emergency" ? (
            <>
              <InfoRow
                first
                label="Born"
                value={pet.birthDate != null ? `${fmtDate(pet.birthDate)} (${formatAge(pet.ageYears)})` : formatAge(pet.ageYears)}
              />
              <InfoRow label="Weight" value={formatWeight(pet.weightKg, state.units)} />
              {pet.microchip ? <InfoRow label="Microchip" value={pet.microchip} mono /> : null}
              {pet.allergies ? (
                <View style={styles.allergyBox}>
                  <Icon name="alert" size={16} color={colors.red} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.allergyLabel}>Allergies &amp; alerts</Text>
                    <Text style={styles.allergyValue}>{pet.allergies}</Text>
                  </View>
                </View>
              ) : null}
              {pet.meds.length > 0 ? (
                <InfoRow label="Medication" value={pet.meds.map((m) => [m.name, m.dosage].filter(Boolean).join(" ")).join(", ")} />
              ) : null}
              {contact ? <InfoRow label="Family contact" value={contact.name} /> : null}
              <InfoRow label="Vet" value={`${vet.name} · ${vet.clinic}`} />
            </>
          ) : (
            <>
              {pet.birthDate != null ? (
                <InfoRow
                  first
                  label="Next birthday"
                  value={`Turns ${nextBirthday(pet.birthDate).turns} on ${fmtDate(nextBirthday(pet.birthDate).date)}`}
                />
              ) : (
                <InfoRow first label="Age" value={formatAge(pet.ageYears)} />
              )}
              <InfoRow label="Gotcha day" value={fmtDate(nextAnniversary(pet.createdAt))} />
              <InfoRow label="In the family since" value={fmtDate(pet.createdAt)} />
              <InfoRow label="Favorite things" value={`${pet.owned.length} accessories collected`} />
            </>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <AccentButton onPress={share}>
          <Icon name="share" size={17} color={colors.white} />
          <Text style={styles.shareLabel}>Share</Text>
        </AccentButton>
        <AccentButton variant="gray" onPress={() => setVariant((v) => (v === "emergency" ? "profile" : "emergency"))}>
          {variant === "emergency" ? "Show profile card" : "Show emergency card"}
        </AccentButton>
        <Footnote style={{ paddingHorizontal: 8 }}>
          The emergency card is what you&apos;d hand a sitter or post if {pet.name} ever went missing — keep the microchip and allergy
          info up to date in Settings ▸ Family.
        </Footnote>
      </View>
      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
  notFoundTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  notFoundLink: { marginTop: 12, fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  shareButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  card: { marginTop: 6, borderRadius: radius.lg, backgroundColor: colors.card, overflow: "hidden", ...floatShadow },
  cardHero: { alignItems: "center", paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  heroName: { marginTop: 12, fontSize: 26, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
  heroMeta: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },
  emergencyBadge: { marginTop: 8, borderRadius: radius.full, backgroundColor: colors.redSoft, paddingHorizontal: 12, paddingVertical: 4 },
  emergencyBadgeLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.red },
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
    marginTop: 8,
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
  actions: { marginTop: 16, gap: 10 },
  shareLabel: { fontSize: 17, fontFamily: font.semibold, color: colors.white },
});
