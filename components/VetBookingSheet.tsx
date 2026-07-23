import { StyleSheet, Text, View } from "react-native";
import { InitialAvatar } from "@/components/PetAvatar";
import Sheet from "@/components/Sheet";
import { Icon } from "@/components/Icons";
import { AccentButton, Chip, Footnote, Group, IconCircle, Row, SheetTitle } from "@/components/ui";
import type { Vet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

export function Stars({ rating }: { rating: number }) {
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

/**
 * The appointment-request sheet, shared by the vet list and the vet detail
 * page so "Book" behaves identically from both doors. Pass `vet: null` to
 * keep it closed.
 */
export default function VetBookingSheet({ vet, onClose }: { vet: Vet | null; onClose: () => void }) {
  const { state, bookVetById, toast } = useStore();

  const cat = state.pets.find((p) => p.breed === "British Shorthair") ?? state.pets[0];
  // A pet-less household must not render "Checkup — undefined".
  const petLabel = cat?.name ?? "your pet";

  return (
    <Sheet open={vet !== null} onClose={onClose}>
      {vet && (
        <>
          <View style={styles.sheetHeader}>
            <InitialAvatar name={vet.name.replace("Dr. ", "")} gradient={vet.gradient} size={56} />
            <View style={{ minWidth: 0, flex: 1 }}>
              <SheetTitle>{vet.name}</SheetTitle>
              <Text style={styles.clinic}>{vet.clinic}</Text>
              <View style={styles.metaRow}>
                <Stars rating={vet.rating} />
                <Text style={styles.meta}>
                  {vet.rating} · {vet.distanceKm} km
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.chipsRow}>
            {vet.specialties.map((s) => (
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
                bookVetById(vet.id);
                toast("calendar", "Appointment requested", `${vet.name} will confirm shortly`);
                onClose();
              }}
            >
              Request appointment
            </AccentButton>
            <Footnote>Nothing is booked until the clinic confirms your request.</Footnote>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 4 },
  clinic: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  metaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  chipsRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
