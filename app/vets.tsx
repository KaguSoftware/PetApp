import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { AccentButton, Chip, Footnote, Group, IconCircle, Row, SheetTitle, SmallButton } from "@/components/ui";
import { VETS, type Vet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius, withAlpha } from "@/lib/theme";

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
  // See activity.tsx — a pet-less household must not render "Checkup — undefined".
  const petLabel = cat?.name ?? "your pet";

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
                <SmallButton
                  label="Requested"
                  tone="green"
                  onPress={() => {
                    unbookVetById(v.id);
                    toast("refresh", "Request cancelled", `Cancelled your visit with ${v.name}`);
                  }}
                />
              ) : (
                <SmallButton label="Book" onPress={() => setSelected(v)} />
              )}
            </View>
          );
        })}
        <Footnote>Sponsored clinics pay to appear here — that&apos;s how PetPal stays free.</Footnote>
      </View>

      <Sheet open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <View style={styles.sheetHeader}>
              <InitialAvatar name={selected.name.replace("Dr. ", "")} gradient={selected.gradient} size={56} />
              <View style={{ minWidth: 0, flex: 1 }}>
                <SheetTitle>{selected.name}</SheetTitle>
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
                title={`Checkup — ${petLabel}`}
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
              <Footnote>Nothing is booked until the clinic confirms your request.</Footnote>
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
  cardSponsored: { borderWidth: 1, borderColor: withAlpha(colors.accent, 0.2) },
  cardText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vetName: { fontSize: 16, fontFamily: font.bold, color: colors.label, flexShrink: 1 },
  adBadge: { borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 6, paddingVertical: 2 },
  adBadgeLabel: { fontSize: 9, fontFamily: font.bold, letterSpacing: 0.8, color: colors.accent },
  clinic: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  metaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 4 },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  chipsRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
