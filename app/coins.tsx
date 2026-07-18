import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import PixelSprite from "@/components/pixel/PixelSprite";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import { PushedScreen } from "@/components/Screen";
import { Group, IconCircle, PressableScale, Row, SectionHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

type Pack = { id: string; coins: number; price: string; bonus?: string; best?: boolean };

const PACKS: Pack[] = [
  { id: "s", coins: 500, price: "$0.99" },
  { id: "m", coins: 1500, price: "$1.99", bonus: "+10%" },
  { id: "l", coins: 4000, price: "$4.99", bonus: "+25%", best: true },
  { id: "xl", coins: 10000, price: "$9.99", bonus: "+40%" },
];

const EARN: { icon: IconName; title: string; sub: string }[] = [
  { icon: "check", title: "Log any care", sub: "+5 coins each time you feed, walk, groom…" },
  { icon: "flame", title: "Keep your streak", sub: "Daily logging keeps the coins flowing" },
  { icon: "people", title: "Care as a family", sub: "Every member's logged action earns coins" },
];

export default function CoinsScreen() {
  const router = useRouter();
  const { state, toast } = useStore();

  const buy = (p: Pack) => {
    // Real coin-package IAP is wired at the EAS cutover (same gateway as
    // PetPal+). Until then this is an honest "coming soon" rather than a fake
    // balance bump that wouldn't survive a reload.
    toast("coin", "Coin packs are coming soon", `${p.coins.toLocaleString()} coins will be available in the next update`);
  };

  return (
    <PushedScreen title="Coins">
      <View style={styles.balanceCard}>
        <PixelSprite sprite={COIN_SPRITE} size={28} />
        <Text style={styles.balanceValue}>{state.coins.toLocaleString()}</Text>
        <Text style={styles.balanceLabel}>coins available</Text>
      </View>

      <SectionHeader>Buy coins</SectionHeader>
      <Group>
        {PACKS.map((p) => (
          <PressableScale key={p.id} haptic onPress={() => buy(p)} accessibilityRole="button">
            <Row
              leading={
                <View style={styles.packIcon}>
                  <PixelSprite sprite={COIN_SPRITE} size={20} />
                </View>
              }
              title={`${p.coins.toLocaleString()} coins`}
              subtitle={p.bonus ? `${p.bonus} bonus${p.best ? " · Best value" : ""}` : undefined}
              trailing={
                <View style={[styles.priceTag, p.best && styles.priceTagBest]}>
                  <Text style={[styles.priceText, p.best && { color: colors.white }]}>{p.price}</Text>
                </View>
              }
            />
          </PressableScale>
        ))}
      </Group>

      <SectionHeader>Earn coins free</SectionHeader>
      <Group>
        {EARN.map((e) => (
          <Row
            key={e.title}
            leading={<IconCircle icon={e.icon} tint={colors.accent} bg={colors.accentSoft} />}
            title={e.title}
            subtitle={e.sub}
          />
        ))}
        <Row
          leading={<IconCircle icon="paw" tint={colors.green} bg={colors.greenSoft} />}
          title="Spend them on your pets"
          subtitle="Hats, glasses, outfits & more in the Pets tab"
          trailing={<Icon name="chevron-right" size={15} color={colors.label3} />}
          onPress={() => router.push("/pets")}
        />
      </Group>

      <Text style={styles.footnote}>Coins are shared across your whole household.</Text>
      <View style={{ height: 16 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 28,
    marginBottom: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...cardShadow,
  },
  balanceValue: { marginTop: 6, fontSize: 40, fontFamily: font.bold, letterSpacing: -1, color: colors.label },
  balanceLabel: { fontSize: 13, fontFamily: font.medium, color: colors.label2 },
  packIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  priceTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.fill },
  priceTagBest: { backgroundColor: colors.accent },
  priceText: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
  footnote: { marginTop: 10, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, textAlign: "center" },
});
