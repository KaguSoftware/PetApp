import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import { AccentButton, Footnote, IconCircle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import { usePurchases } from "@/providers/purchases";
import { PLUS_MONTHLY_ID } from "@/providers/purchases/products";

const PERKS: { icon: IconName; title: string; body: string }[] = [
  { icon: "heart-text", title: "Vet-built care plans", body: "Breed-specific feeding, grooming and health schedules." },
  { icon: "bell", title: "Smart reminders", body: "We watch the calendar so you don't have to." },
  { icon: "calendar", title: "Vet booking", body: "One-tap appointment requests with trusted local vets." },
  { icon: "arrow-up", title: "Health insights", body: "Weight tracking and early warning signs." },
];

export default function Paywall({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { setPremium, toast } = useStore();
  const purchases = usePurchases();
  const [busy, setBusy] = useState(false);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);

  // Localised price straight from the store — a hardcoded "$4.99/month" is
  // wrong in every other currency and goes stale the moment pricing changes.
  useEffect(() => {
    if (!open) return;
    let live = true;
    purchases
      .getOfferings()
      .then((pkgs) => {
        if (live) setPriceLabel(pkgs.find((p) => p.id === PLUS_MONTHLY_ID)?.priceLabel ?? null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, purchases]);

  async function handleBuy() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await purchases.purchase(PLUS_MONTHLY_ID);
      if (result.cancelled) return;
      if (result.error) {
        toast("alert", "Purchase didn't complete", result.error);
        return;
      }
      if (result.plusActive) {
        setPremium(true);
        onClose();
        toast("sparkles", "Welcome to PetPal+", "Care plans and smart reminders unlocked");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <View style={styles.hero}>
        <LinearGradient colors={[colors.accent, colors.accentDeep]} style={styles.heroTile}>
          <Icon name="sparkles" size={32} color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>PetPal+</Text>
        <Text style={styles.tagline}>A vet in your pocket. We tell you what your pet needs — before you have to think about it.</Text>
      </View>

      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p.title} style={styles.perk}>
            <IconCircle icon={p.icon} tint={colors.accent} bg={colors.accentSoft} size={32} iconSize={17} />
            <View style={styles.perkText}>
              <Text style={styles.perkTitle}>{p.title}</Text>
              <Text style={styles.perkBody}>{p.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <AccentButton onPress={handleBuy} loading={busy}>
          Try free for 1 month
        </AccentButton>
        <Footnote>
          {priceLabel ? `Then ${priceLabel}. Cancel anytime.` : "Cancel anytime."}
          {purchases.live ? "" : `\nDemo — unlocks instantly, no payment.`}
        </Footnote>
      </View>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    hero: { alignItems: "center", paddingTop: 8 },
    heroTile: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    title: { marginTop: 12, fontSize: 24, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
    tagline: { marginTop: 4, maxWidth: 280, fontSize: 14, fontFamily: font.regular, color: colors.label2, textAlign: "center", lineHeight: 20 },
    perks: { marginTop: 24, gap: 16 },
    perk: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    perkText: { flex: 1, minWidth: 0, marginTop: 2 },
    perkTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
    perkBody: { fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 18 },
    footer: { marginTop: 28 },
  });
