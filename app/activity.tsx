import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import PetAvatar, { InitialAvatar } from "@/components/PetAvatar";
import Sheet from "@/components/Sheet";
import { PushedScreen } from "@/components/Screen";
import { ACTION_ICON, Icon } from "@/components/Icons";
import { AccentButton, Chevron, Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { ACTIONS, Activity, VET, VETS } from "@/lib/data";
import { dueLabel, timeAgo, useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

function dayKey(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function ActivityScreen() {
  const { state, hydrated, bookVetById, toast } = useStore();
  const router = useRouter();
  const [bookOpen, setBookOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [filterPetId, setFilterPetId] = useState<string | null>(null);
  const [visible, setVisible] = useState(40);

  if (!hydrated) {
    return (
      <PushedScreen title="Activity">
        <PageLoading />
      </PushedScreen>
    );
  }

  const member = (id: string) => state.members.find((m) => m.id === id);
  const petById = (id: string) => state.pets.find((p) => p.id === id);
  const cat = state.pets.find((p) => p.breed === "British Shorthair") ?? state.pets[0];

  // Needs attention — the outstanding care alerts (same set the bell badges),
  // deduped (the data can hold identical entries) and grouped per pet so a bad
  // day reads as one calm block per pet instead of a wall of red cards.
  const seenAlert = new Set<string>();
  const alerts = state.reminders
    .filter((r) => r.alert && !r.done)
    .sort((a, b) => a.due - b.due)
    .filter((r) => {
      const key = `${r.petId}|${r.title}`;
      if (seenAlert.has(key)) return false;
      seenAlert.add(key);
      return true;
    });
  const alertGroups = state.pets
    .map((p) => ({ pet: p, items: alerts.filter((r) => r.petId === p.id) }))
    .filter((g) => g.items.length > 0);

  // Family feed — optionally filtered to one pet, paged in blocks of 40
  const filtered = state.activities
    .filter((a) => !filterPetId || a.petId === filterPetId)
    .sort((a, b) => b.ts - a.ts);
  const sorted = filtered.slice(0, visible);
  const groups: { day: string; items: Activity[] }[] = [];
  for (const a of sorted) {
    const day = dayKey(a.ts);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <PushedScreen title="Activity">
      {/* Needs attention — one group per pet, standard rows */}
      {alertGroups.length > 0 ? (
        <>
          <SectionHeader>Needs attention</SectionHeader>
          <View style={{ gap: 12 }}>
            {alertGroups.map(({ pet, items }) => (
              <Group key={pet.id}>
                <View style={styles.alertPetHeader}>
                  <PetAvatar pet={pet} size="xs" showCosmetics={false} />
                  <Text style={styles.alertPetName}>{pet.name}</Text>
                </View>
                {items.map((r) => {
                  const alertVet = r.vetId ? VETS.find((v) => v.id === r.vetId) ?? VET : null;
                  return (
                    <Row
                      key={r.id}
                      title={
                        <Text numberOfLines={1} style={styles.alertTitle}>
                          {r.title}
                        </Text>
                      }
                      subtitle={dueLabel(r.due)}
                      trailing={
                        alertVet ? (
                          <Pressable
                            onPress={() => router.push("/vets")}
                            accessibilityLabel={`Book vet for ${pet.name}`}
                            hitSlop={6}
                            style={({ pressed }) => [styles.bookVetButton, pressed && { transform: [{ scale: 0.95 }] }]}
                          >
                            <Icon name="cross" size={14} color={colors.white} />
                            <Text style={styles.bookVetLabel}>Book vet</Text>
                          </Pressable>
                        ) : undefined
                      }
                    />
                  );
                })}
              </Group>
            ))}
          </View>
        </>
      ) : null}

      {/* Health insight / upsell */}
      {state.premium ? (
        <>
          <SectionHeader>Health · PetPal+</SectionHeader>
          <View style={styles.insightCard}>
            <View style={styles.insightHead}>
              <IconCircle icon="stethoscope" tint={colors.accent} bg={colors.accentSoft} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.insightTitle}>{cat?.name}&apos;s 6-month checkup is due next week</Text>
                <Text style={styles.insightBody}>
                  We recommend {VET.name} at {VET.clinic} — {VET.rating} ★, {VET.distanceKm} km away.
                </Text>
              </View>
            </View>
            {state.bookedVet ? (
              <View style={styles.bookedPill}>
                <Icon name="check" size={15} color={colors.green} />
                <Text style={styles.bookedPillLabel}>Appointment requested — the clinic will confirm shortly</Text>
              </View>
            ) : (
              <AccentButton variant="tinted" size="sm" style={{ marginTop: 12 }} onPress={() => setBookOpen(true)}>
                <Icon name="calendar" size={17} color={colors.accent} />
                <Text style={styles.tintedButtonLabel}>Book appointment</Text>
              </AccentButton>
            )}
          </View>
        </>
      ) : (
        <>
          <SectionHeader>Health</SectionHeader>
          <Pressable
            onPress={() => setPaywallOpen(true)}
            style={({ pressed }) => [styles.upsellCard, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <IconCircle icon="lock" tint={colors.label2} bg={colors.fill} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.upsellTitle}>Health insights live here</Text>
              <Text style={styles.upsellBody}>PetPal+ watches the calendar and flags upcoming vet visits and treatments.</Text>
            </View>
            <Chevron />
          </Pressable>
        </>
      )}

      {/* Reminders + vet marketplace live here now (moved off the Care tab) */}
      <Group style={{ marginTop: 32 }}>
        <Row
          leading={<IconCircle icon="bell" tint={colors.accent} bg={colors.accentSoft} />}
          title="Reminders"
          subtitle="Tasks & alerts the whole family sees"
          trailing={<Chevron />}
          onPress={() => router.push("/reminders")}
        />
        <Row
          leading={<IconCircle icon="cross" tint={colors.green} bg={colors.greenSoft} />}
          title="Find a vet"
          subtitle="Browse clinics near you"
          trailing={<Chevron />}
          onPress={() => router.push("/vets")}
        />
      </Group>

      {/* Family feed */}
      <SectionHeader>Recent activity</SectionHeader>
      {state.pets.length > 1 ? (
        <View style={styles.filterRow}>
          {[null, ...state.pets.map((p) => p.id)].map((id) => {
            const p = id ? petById(id) : null;
            const active = filterPetId === id;
            return (
              <Pressable
                key={id ?? "all"}
                onPress={() => {
                  setFilterPetId(id);
                  setVisible(40);
                }}
                hitSlop={6}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>{p ? p.name : "All"}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {groups.length === 0 ? (
        <EmptyState icon="bell" title="No activity yet" body="Log some care from the Logs tab and it'll show up here for the whole family." />
      ) : (
        groups.map((g) => (
          <View key={g.day}>
            {g.day !== "Today" ? <SectionHeader>{g.day}</SectionHeader> : null}
            <Group>
              {g.items.map((a) => {
                const m = member(a.memberId);
                const p = petById(a.petId);
                if (!m || !p) return null;
                const isYou = m.id === state.currentMemberId;
                const tile = ACTION_ICON[a.type];
                return (
                  <Row
                    key={a.id}
                    leading={<IconCircle icon={tile.icon} tint={tile.tint} bg={tile.bg} size={32} iconSize={17} />}
                    title={
                      <Text numberOfLines={1} style={styles.feedTitle}>
                        <Text style={styles.feedName}>{isYou ? "You" : m.name}</Text>
                        <Text style={styles.feedVerb}> {ACTIONS[a.type].verb} </Text>
                        <Text style={styles.feedName}>{p.name}</Text>
                      </Text>
                    }
                    subtitle={a.note ?? timeAgo(a.ts)}
                  />
                );
              })}
            </Group>
          </View>
        ))
      )}
      {visible < filtered.length ? (
        <AccentButton variant="tinted" size="sm" style={{ marginTop: 12 }} onPress={() => setVisible((v) => v + 40)}>
          Show more
        </AccentButton>
      ) : null}

      {/* Booking sheet */}
      <Sheet open={bookOpen} onClose={() => setBookOpen(false)}>
        <View style={styles.vetHead}>
          <InitialAvatar name={VET.name.replace("Dr. ", "")} gradient={["oklch(0.6 0.13 200)", "oklch(0.48 0.13 240)"]} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.vetName}>{VET.name}</Text>
            <Text style={styles.vetClinic}>{VET.clinic}</Text>
            <View style={styles.vetMetaRow}>
              <Icon name="star" size={13} color={colors.orange} />
              <Text style={styles.vetClinic}>
                {VET.rating} · {VET.distanceKm} km away
              </Text>
            </View>
          </View>
        </View>
        <Group style={{ marginTop: 20 }}>
          <Row
            leading={<IconCircle icon="stethoscope" tint={colors.accent} bg={colors.accentSoft} />}
            title={`6-month checkup — ${cat?.name}`}
            subtitle="Dental check included"
          />
          <Row
            leading={<IconCircle icon="calendar" tint={colors.accent} bg={colors.accentSoft} />}
            title="Tuesday, 10:30"
            subtitle="Suggested time · can be changed"
          />
        </Group>
        <View style={{ marginTop: 24 }}>
          <AccentButton
            onPress={() => {
              bookVetById(VET.id);
              setBookOpen(false);
              toast("calendar", "Appointment requested", `${VET.name} will confirm shortly`);
            }}
          >
            Request appointment
          </AccentButton>
          <Text style={styles.sheetFootnote}>Demo — no real booking is made.</Text>
        </View>
      </Sheet>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  alertPetHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  alertPetName: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  alertTitle: { fontSize: 16, fontFamily: font.medium, color: colors.red },
  bookVetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.red,
    paddingHorizontal: 12,
  },
  bookVetLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.white },
  insightCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    ...cardShadow,
  },
  insightHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  insightTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label, lineHeight: 20 },
  insightBody: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 18 },
  bookedPill: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bookedPillLabel: { flex: 1, fontSize: 13, fontFamily: font.semibold, color: colors.green, lineHeight: 17 },
  tintedButtonLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.accent },
  upsellCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  upsellTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  upsellBody: { marginTop: 1, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 17 },
  filterRow: { marginBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    ...cardShadow,
  },
  filterChipActive: { backgroundColor: colors.accent },
  filterChipLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
  filterChipLabelActive: { color: colors.white },
  feedTitle: { fontSize: 15, color: colors.label },
  feedName: { fontFamily: font.semibold, color: colors.label },
  feedVerb: { fontFamily: font.regular, color: colors.label2 },
  vetHead: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 4 },
  vetName: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  vetClinic: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  vetMetaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  sheetFootnote: { marginTop: 10, textAlign: "center", fontSize: 12, fontFamily: font.regular, color: colors.label3 },
});
