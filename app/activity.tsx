import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import EmptyState from "@/components/EmptyState";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import { ACTION_ICON } from "@/components/Icons";
import { AccentButton, Chevron, Group, IconCircle, PressableScale, Row, SectionHeader } from "@/components/ui";
import { ACTIONS, Activity } from "@/lib/data";
import { dueLabel, timeAgo, useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

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

/**
 * The bell's landing page — notifications, and ONLY notifications: the
 * outstanding care alerts up top, then the family activity feed. Everything
 * else that used to live here (health-insight upsell, vet booking, nav rows
 * to Reminders / Find a vet) was doing another page's job and moved out —
 * those destinations keep their own doors on the Logs tab and /vets.
 */
export default function ActivityScreen() {
  const { state, hydrated, dismissAllAlerts } = useStore();
  const router = useRouter();
  const [visible, setVisible] = useState(40);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <PushedScreen title="Notifications">
        <PageLoading />
      </PushedScreen>
    );
  }

  const member = (id: string) => state.members.find((m) => m.id === id);
  const petById = (id: string) => state.pets.find((p) => p.id === id);

  // Needs attention — the outstanding care alerts (same set the bell badges).
  // Belt-and-braces dedupe: migration 0023's unique index stops NEW duplicate
  // rows at the DB, but pre-migration rows may still be in the table.
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

  // Family feed — newest first, paged in blocks of 40.
  const filtered = [...state.activities].sort((a, b) => b.ts - a.ts);
  const sorted = filtered.slice(0, visible);
  const groups: { day: string; items: Activity[] }[] = [];
  for (const a of sorted) {
    const day = dayKey(a.ts);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <PushedScreen title="Notifications">
      {/* Needs attention — one group per pet, standard rows */}
      {alertGroups.length > 0 ? (
        <>
          <SectionHeader
            trailing={
              <PressableScale onPress={dismissAllAlerts} accessibilityRole="button" accessibilityLabel="Clear all notifications" hitSlop={8}>
                <Text style={styles.clearAll}>Clear all</Text>
              </PressableScale>
            }
          >
            Needs attention
          </SectionHeader>
          <View style={{ gap: 12 }}>
            {alertGroups.map(({ pet, items }) => (
              <Group key={pet.id}>
                <View style={styles.alertPetHeader}>
                  <PetAvatar pet={pet} size="xs" showCosmetics={false} />
                  <Text style={styles.alertPetName}>{pet.name}</Text>
                </View>
                {items.map((r) => {
                  const expanded = expandedId === r.id;
                  // Where "attention" leads: a vet alert → the vet marketplace,
                  // otherwise the reminders agenda where it can be resolved.
                  const goLabel = r.vetId ? "Book a vet" : "Go to reminders";
                  const go = () => router.push(r.vetId ? "/vets" : "/reminders");
                  return (
                    <View key={r.id}>
                      <Row
                        title={
                          <Text numberOfLines={expanded ? undefined : 1} style={styles.alertTitle}>
                            {r.title}
                          </Text>
                        }
                        subtitle={dueLabel(r.due)}
                        trailing={<Chevron />}
                        onPress={() => setExpandedId(expanded ? null : r.id)}
                      />
                      {expanded ? (
                        <FadeInItem style={styles.alertExpand}>
                          <Text style={styles.alertExpandBody}>
                            {pet.name} needs attention: {r.title.toLowerCase()} — due {dueLabel(r.due).toLowerCase()}.
                          </Text>
                          <AccentButton size="sm" onPress={go}>
                            {goLabel}
                          </AccentButton>
                        </FadeInItem>
                      ) : null}
                    </View>
                  );
                })}
              </Group>
            ))}
          </View>
        </>
      ) : null}

      {/* Family feed */}
      <SectionHeader>Recent activity</SectionHeader>
      {groups.length === 0 ? (
        <EmptyState icon="bell" title="No activity yet" body="Log some care from the Logs tab and it'll show up here for the whole family." />
      ) : (
        groups.map((g, gi) => (
          <FadeInItem key={g.day} index={gi}>
            {g.day !== "Today" ? <SectionHeader>{g.day}</SectionHeader> : null}
            <Group>
              {g.items.map((a) => {
                const m = member(a.memberId);
                const p = petById(a.petId);
                if (!m || !p) return null;
                const isYou = m.id === state.currentMemberId;
                const tile = ACTION_ICON[a.type];
                const expanded = expandedId === a.id;
                return (
                  <View key={a.id}>
                    <Row
                      leading={<IconCircle icon={tile.icon} tint={tile.tint} bg={tile.bg} size={32} iconSize={17} />}
                      title={
                        <Text numberOfLines={expanded ? undefined : 1} style={styles.feedTitle}>
                          <Text style={styles.feedName}>{isYou ? "You" : m.name}</Text>
                          <Text style={styles.feedVerb}> {ACTIONS[a.type].verb} </Text>
                          <Text style={styles.feedName}>{p.name}</Text>
                        </Text>
                      }
                      subtitle={
                        <Text numberOfLines={expanded ? undefined : 1} style={styles.rowSubtitle}>
                          {a.note ?? timeAgo(a.ts)}
                        </Text>
                      }
                      trailing={<Chevron />}
                      onPress={() => setExpandedId(expanded ? null : a.id)}
                    />
                    {expanded ? (
                      <FadeInItem style={styles.alertExpand}>
                        {a.note ? <Text style={styles.alertExpandBody}>{a.note}</Text> : null}
                        <AccentButton size="sm" onPress={() => router.push(`/pet/${p.id}`)}>
                          View {p.name}
                        </AccentButton>
                      </FadeInItem>
                    ) : null}
                  </View>
                );
              })}
            </Group>
          </FadeInItem>
        ))
      )}
      {visible < filtered.length ? (
        <AccentButton variant="tinted" size="sm" style={{ marginTop: 12 }} onPress={() => setVisible((v) => v + 40)}>
          Show more
        </AccentButton>
      ) : null}
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  alertPetHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  alertPetName: { fontSize: 13, fontFamily: font.semibold, color: colors.label2 },
  alertTitle: { fontSize: 16, fontFamily: font.medium, color: colors.red },
  alertExpand: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2, gap: 12 },
  alertExpandBody: { fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },
  clearAll: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  // Feed text — one 15pt body size across title/name/verb (footnote 13 via Row subtitle)
  rowSubtitle: { fontSize: 13, fontFamily: font.regular, color: colors.label2, marginTop: 1 },
  feedTitle: { fontSize: 15, color: colors.label },
  feedName: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  feedVerb: { fontSize: 15, fontFamily: font.regular, color: colors.label2 },
});
