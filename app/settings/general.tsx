import { StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { Group, IconCircle, Row, SectionHeader, Segmented, Toggle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

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
        <Row
          leading={<IconCircle icon="arrow-up" tint={colors.accent} bg={colors.accentSoft} />}
          title="Weight units"
          trailing={
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
          }
        />
      </Group>

      <SectionHeader>Notifications</SectionHeader>
      <Group>
        {[
          { key: "notifyCareReminders" as const, label: "Care reminders" },
          { key: "notifyFamilyActivity" as const, label: "Family activity" },
          { key: "notifyVetSuggestions" as const, label: "Vet suggestions" },
        ].map((n) => {
          const on = currentMember ? currentMember[n.key] : true;
          const flip = () => {
            if (!currentMember) return;
            setNotificationPref(n.key, !on);
            toast("bell", `${n.label} turned ${on ? "off" : "on"}`, "");
          };
          return (
            <Row
              key={n.key}
              leading={<IconCircle icon="bell" tint={colors.label2} bg={colors.fill} />}
              title={n.label}
              onPress={flip}
              trailing={<Toggle on={!!on} onChange={flip} label={n.label} />}
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
  footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
});
