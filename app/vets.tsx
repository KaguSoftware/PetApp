import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { AccentButton, Chip, Group, IconCircle, Row } from "@/components/ui";
import { VETS, type Vet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={i < Math.round(rating) ? undefined : { opacity: 0.4 }}>
          <Icon name="star" size={11} color={i < Math.round(rating) ? colors.orange : colors.label3} />
        </View>
      ))}
    </View>
  );
}

export default function VetsPage() {
  const { state, bookVetById, unbookVetById, toast } = useStore();
  const [selected, setSelected] = useState<Vet | null>(null);

  const cat = state.pets.find((p) => p.breed === "British Shorthair") ?? state.pets[0];

  return (
    <PushedScreen title="Find a Vet">
      <View style={styles.list}>
        {VETS.map((v) => {
          const booked = state.bookedVetIds.includes(v.id);
          return (
            <View key={v.id} style={[styles.card, v.sponsored && styles.cardSponsored]}>
              <InitialAvatar name={v.name.replace("Dr. ", "")} gradient={v.gradient} size={46} />
              <View style={styles.cardText}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.vetName}>
                    {v.name}
                  </Text>
                  {v.sponsored && (
                    <View style={styles.adBadge}>
                      <Text style={styles.adBadgeLabel}>AD</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.clinic}>
                  {v.clinic}
                </Text>
                <View style={styles.metaRow}>
                  <Icon name="star" size={11} color={colors.orange} />
                  <Text style={styles.meta}>
                    {v.rating} · {v.distanceKm} km ·{" "}
                    <Text style={{ color: v.openNow ? colors.green : colors.label3 }}>{v.openNow ? "Open" : "Closed"}</Text>
                  </Text>
                </View>
              </View>
              {booked ? (
                <Pressable
                  onPress={() => {
                    unbookVetById(v.id);
                    toast("refresh", "Request cancelled", `Cancelled your visit with ${v.name}`);
                  }}
                  style={({ pressed }) => [styles.bookedButton, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <Icon name="check" size={14} color={colors.green} />
                  <Text style={styles.bookedLabel}>Requested</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setSelected(v)}
                  style={({ pressed }) => [styles.bookButton, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  <Text style={styles.bookLabel}>Book</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Text style={styles.disclosure}>Sponsored clinics pay to appear here — that&apos;s how PetPal stays free.</Text>
      </View>

      <Sheet open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <View style={styles.sheetHeader}>
              <InitialAvatar name={selected.name.replace("Dr. ", "")} gradient={selected.gradient} size={56} />
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text style={styles.sheetTitle}>{selected.name}</Text>
                <Text style={styles.clinic}>{selected.clinic}</Text>
                <View style={styles.metaRow}>
                  <Stars rating={selected.rating} />
                  <Text style={styles.meta}>
                    {selected.rating} · {selected.distanceKm} km
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.chipsRow}>
              {selected.specialties.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </View>
            <Group style={{ marginTop: 20 }}>
              <Row
                leading={<IconCircle icon="cross" tint={colors.accent} bg={colors.accentSoft} />}
                title={`Checkup — ${cat?.name}`}
                subtitle="General wellness visit"
              />
              <Row
                leading={<IconCircle icon="calendar" tint={colors.accent} bg={colors.accentSoft} />}
                title="Next Tuesday, 10:30"
                subtitle="Suggested time · can be changed"
              />
            </Group>
            <View style={{ marginTop: 24 }}>
              <AccentButton
                onPress={() => {
                  bookVetById(selected.id);
                  toast("calendar", "Appointment requested", `${selected.name} will confirm shortly`);
                  setSelected(null);
                }}
              >
                Request appointment
              </AccentButton>
              <Text style={styles.sheetHint}>Nothing is booked until the clinic confirms your request.</Text>
            </View>
          </>
        )}
      </Sheet>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  cardSponsored: { borderWidth: 1, borderColor: "rgba(107, 85, 223, 0.2)" },
  cardText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vetName: { fontSize: 16, fontFamily: font.bold, color: colors.label, flexShrink: 1 },
  adBadge: { borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 6, paddingVertical: 2 },
  adBadgeLabel: { fontSize: 9, fontFamily: font.bold, letterSpacing: 0.8, color: colors.accent },
  clinic: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  metaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  bookedButton: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 14,
  },
  bookedLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.green },
  bookButton: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  bookLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.white },
  disclosure: { paddingHorizontal: 4, paddingTop: 4, fontSize: 11, fontFamily: font.regular, color: colors.label3, textAlign: "center" },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 4 },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  chipsRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sheetHint: { marginTop: 10, fontSize: 12, fontFamily: font.regular, color: colors.label3, textAlign: "center" },
});
