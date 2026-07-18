import { StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { Group, IconCircle, Row, SectionHeader, Segmented } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

/** iOS-style pill toggle, mirroring the web's custom switch visual. */
function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.toggle, on ? styles.toggleOn : styles.toggleOff]}>
      <View style={styles.knob} />
    </View>
  );
}

export default function GeneralSettingsPage() {
  const { state, hydrated, setUnits, setNotificationPref, toast } = useStore();
  const currentMember = state.members.find((m) => m.id === state.currentMemberId);

  if (!hydrated) {
    return (
      <PushedScreen title="General">
        <PageLoading />
      </PushedScreen>
    );
  }

  return (
    <PushedScreen title="General">
      <SectionHeader>Units</SectionHeader>
      <Group>
        <View style={styles.unitsRow}>
          <IconCircle icon="arrow-up" tint={colors.accent} bg={colors.accentSoft} />
          <Text style={styles.unitsLabel}>Weight units</Text>
          <View style={{ width: 112 }}>
            <Segmented
              options={[
                { value: "kg", label: "kg" },
                { value: "lb", label: "lb" },
              ]}
              value={state.units}
              onChange={(u) => {
                setUnits(u);
                toast("scale", `Weights now shown in ${u === "kg" ? "kilograms" : "pounds"}`, "");
              }}
            />
          </View>
        </View>
      </Group>

      <SectionHeader>Notifications</SectionHeader>
      <Group>
        {[
          { key: "notifyCareReminders" as const, label: "Care reminders" },
          { key: "notifyFamilyActivity" as const, label: "Family activity" },
          { key: "notifyVetSuggestions" as const, label: "Vet suggestions" },
        ].map((n) => {
          const on = currentMember ? currentMember[n.key] : true;
          return (
            <Row
              key={n.key}
              leading={<IconCircle icon="bell" tint={colors.label2} bg={colors.fill} />}
              title={n.label}
              onPress={() => {
                if (!currentMember) return;
                setNotificationPref(n.key, !on);
                toast("bell", `${n.label} turned ${on ? "off" : "on"}`, "");
              }}
              trailing={<Toggle on={!!on} />}
            />
          );
        })}
      </Group>
      <Text style={styles.footnote}>
        {currentMember ? `Just for ${currentMember.name} — other family members set their own.` : "Set per family member."} Reminders
        you&apos;ve already added still appear in Care.
      </Text>

      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  unitsRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  unitsLabel: { flex: 1, fontSize: 16, fontFamily: font.medium, color: colors.label },
  footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, flexDirection: "row", alignItems: "center" },
  toggleOn: { justifyContent: "flex-end", backgroundColor: colors.green },
  toggleOff: { justifyContent: "flex-start", backgroundColor: colors.fill },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
