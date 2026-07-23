import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import VetBookingSheet from "@/components/VetBookingSheet";
import { Icon } from "@/components/Icons";
import { Footnote, PressableScale, SmallButton } from "@/components/ui";
import { VETS, type Vet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius, withAlpha } from "@/lib/theme";

export default function VetsPage() {
  const router = useRouter();
  const { state, unbookVetById, toast } = useStore();
  const [selected, setSelected] = useState<Vet | null>(null);

  return (
    <PushedScreen title="Find a Vet">
      <View style={styles.list}>
        {VETS.map((v) => {
          const booked = state.bookedVetIds.includes(v.id);
          return (
            // The whole card opens the vet's info page; the trailing button
            // books directly. The button sits inside the pressable card, so it
            // must win the touch — PressableScale children with their own
            // onPress do (RN's responder goes to the deepest handler).
            <PressableScale
              key={v.id}
              onPress={() => router.push({ pathname: "/vets/[id]", params: { id: v.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${v.name}'s page`}
            >
              <View style={[styles.card, v.sponsored && styles.cardSponsored]}>
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
            </PressableScale>
          );
        })}
        <Footnote>Sponsored clinics pay to appear here — that&apos;s how PetPal stays free.</Footnote>
      </View>

      <VetBookingSheet vet={selected} onClose={() => setSelected(null)} />
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
});
