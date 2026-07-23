import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import VetBookingSheet, { Stars } from "@/components/VetBookingSheet";
import { AccentButton, Chevron, Chip, Group, IconCircle, PRESS_SCALE_SMALL, PressableScale, Row, SectionHeader, SmallButton } from "@/components/ui";
import { VETS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

/** Per-clinic info page — reached by tapping a vet card in the marketplace. */
export default function VetDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, unbookVetById, toast } = useStore();
  const [bookOpen, setBookOpen] = useState(false);

  const vet = VETS.find((v) => v.id === id);
  if (!vet) {
    return (
      <PushedScreen title="Vet">
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Clinic not found</Text>
          <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => router.replace("/vets")} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.notFoundLink}>Back to Find a Vet</Text>
          </PressableScale>
        </View>
      </PushedScreen>
    );
  }

  const booked = state.bookedVetIds.includes(vet.id);
  const openMaps = () => {
    const q = encodeURIComponent(`${vet.clinic}, ${vet.address}`);
    Linking.openURL(Platform.OS === "ios" ? `maps:0,0?q=${q}` : `geo:0,0?q=${q}`);
  };
  const call = () => Linking.openURL(`tel:${vet.phone.replace(/[^+\d]/g, "")}`);

  return (
    <PushedScreen title={vet.name}>
      {/* Identity */}
      <View style={styles.heroCard}>
        <InitialAvatar name={vet.name.replace("Dr. ", "")} gradient={vet.gradient} size={64} />
        <Text style={styles.heroName}>{vet.name}</Text>
        <Text style={styles.heroClinic}>{vet.clinic}</Text>
        <View style={styles.heroMetaRow}>
          <Stars rating={vet.rating} />
          <Text style={styles.heroMeta}>
            {vet.rating} · {vet.distanceKm} km ·{" "}
            <Text style={{ color: vet.openNow ? colors.green : colors.label3 }}>{vet.openNow ? "Open now" : "Closed"}</Text>
          </Text>
        </View>
        <View style={styles.chipsRow}>
          {vet.specialties.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </View>
        <View style={{ marginTop: 20, width: "100%" }}>
          {booked ? (
            <SmallButton
              label="Requested — tap to cancel"
              tone="green"
              onPress={() => {
                unbookVetById(vet.id);
                toast("refresh", "Request cancelled", `Cancelled your visit with ${vet.name}`);
              }}
            />
          ) : (
            <AccentButton onPress={() => setBookOpen(true)}>Request an appointment</AccentButton>
          )}
        </View>
      </View>

      {/* About */}
      <SectionHeader>About</SectionHeader>
      <Text style={styles.about}>{vet.about}</Text>

      {/* Contact & hours — every row acts (call, map). */}
      <SectionHeader>Contact &amp; hours</SectionHeader>
      <Group>
        <Row
          onPress={call}
          leading={<IconCircle icon="cross" tint={colors.green} bg={colors.greenSoft} />}
          title="Call the clinic"
          subtitle={vet.phone}
          trailing={<Chevron />}
        />
        <Row
          onPress={openMaps}
          leading={<IconCircle icon="paw" tint={colors.accent} bg={colors.accentSoft} />}
          title="Directions"
          subtitle={vet.address}
          trailing={<Chevron />}
        />
        <Row leading={<IconCircle icon="clock" tint={colors.orange} bg={colors.orangeSoft} />} title="Hours" subtitle={vet.hours} />
      </Group>

      <VetBookingSheet vet={bookOpen ? vet : null} onClose={() => setBookOpen(false)} />
      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
  notFoundTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  notFoundLink: { marginTop: 12, fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  heroCard: {
    marginTop: 6,
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 24,
    ...cardShadow,
  },
  heroName: { marginTop: 12, fontSize: 22, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label, textAlign: "center" },
  heroClinic: { marginTop: 2, fontSize: 14, fontFamily: font.medium, color: colors.label2, textAlign: "center" },
  heroMetaRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  heroMeta: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  chipsRow: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  about: { paddingHorizontal: 4, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 21 },
});
