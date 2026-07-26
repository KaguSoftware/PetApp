import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import PixelSprite from "@/components/pixel/PixelSprite";
import { COIN_SPRITE } from "@/components/pixel/hudSprites";
import { PushedScreen } from "@/components/Screen";
import { usePullToRefresh } from "@/lib/useRefresh";
import { Group, IconCircle, PressableScale, Row, SectionHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { COIN_PACKS, type CoinPackMeta } from "@/providers/purchases/products";
import { usePurchases } from "@/providers/purchases";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

/** A coin pack ready to render: catalogue metadata + the store's own price. */
type Pack = CoinPackMeta & { priceLabel: string };

const EARN: { icon: IconName; title: string; sub: string }[] = [
  { icon: "check", title: "Log any care", sub: "+5 coins each time you feed, walk, groom…" },
  { icon: "flame", title: "Keep your streak", sub: "Daily logging keeps the coins flowing" },
  { icon: "people", title: "Care as a family", sub: "Every member's logged action earns coins" },
];

export default function CoinsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, toast } = useStore();
  const purchases = usePurchases();
  const refreshControl = usePullToRefresh();
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  // The balance the webhook has to beat. Set on a successful purchase and
  // cleared once the credit lands (realtime delivers the households UPDATE
  // within a second or so).
  const [awaiting, setAwaiting] = useState<number | null>(null);

  const loadPacks = useCallback(async () => {
    // Prices come from the store, never from the app — they're localised and
    // change with tax and region. Catalogue order comes from COIN_PACKS.
    const offerings = await purchases.getOfferings().catch(() => []);
    const byId = new Map(offerings.map((o) => [o.id, o]));
    setPacks(
      COIN_PACKS.map((meta) => ({ ...meta, priceLabel: byId.get(meta.id)?.priceLabel ?? "—" })).filter(
        // Before the RevenueCat dashboard is configured there are no offerings;
        // keep showing the catalogue so the screen isn't empty, just unpriced.
        (p) => !purchases.live || byId.has(p.id)
      )
    );
  }, [purchases]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  // Coins are credited SERVER-side by the RevenueCat webhook (a client that
  // granted its own coins could mint currency), so the screen waits for the
  // balance to move rather than bumping it locally.
  useEffect(() => {
    if (awaiting !== null && state.coins > awaiting) {
      setAwaiting(null);
      toast("coin", "Coins added", `You now have ${state.coins.toLocaleString()} coins`);
    }
  }, [state.coins, awaiting, toast]);

  const buy = async (p: Pack) => {
    if (buying) return;
    if (!purchases.live) {
      toast("coin", "Coin packs are coming soon", `${p.coins.toLocaleString()} coins will be available in the next update`);
      return;
    }
    setBuying(p.id);
    const result = await purchases.purchase(p.id);
    setBuying(null);
    if (result.cancelled) return;
    if (result.error) {
      toast("alert", "Purchase didn't complete", result.error);
      return;
    }
    setAwaiting(state.coins);
  };

  return (
    <PushedScreen title="Coins" refreshControl={refreshControl}>
      <View style={styles.balanceCard}>
        <PixelSprite sprite={COIN_SPRITE} size={28} />
        <Text style={styles.balanceValue}>{state.coins.toLocaleString()}</Text>
        <Text style={styles.balanceLabel}>coins available</Text>
      </View>

      <SectionHeader>Buy coins</SectionHeader>
      <Group>
        {(packs ?? COIN_PACKS.map((m) => ({ ...m, priceLabel: "—" }))).map((p) => (
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
                buying === p.id ? (
                  <ActivityIndicator color={colors.label3} />
                ) : (
                  <View style={[styles.priceTag, p.best && styles.priceTagBest]}>
                    <Text style={[styles.priceText, p.best && { color: colors.white }]}>{p.priceLabel}</Text>
                  </View>
                )
              }
            />
          </PressableScale>
        ))}
      </Group>
      {awaiting !== null ? (
        <Text style={styles.footnote}>Confirming your purchase — your coins will appear here in a moment.</Text>
      ) : null}

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

const makeStyles = (colors: Colors) => StyleSheet.create({
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
