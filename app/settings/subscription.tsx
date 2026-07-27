import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import { PushedScreen } from "@/components/Screen";
import { Footnote, Group, IconCircle, Row, SectionHeader, SmallButton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useColors } from "@/lib/theme";
import { usePurchases } from "@/providers/purchases";
import type { EntitlementState } from "@/providers/purchases/types";

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, DATE_FMT);
}

// In-app cancellation isn't possible on either store — the honest UX is to
// hand off to the platform's own subscription-management screen.
function openStoreSubscriptions() {
  const url = Platform.OS === "ios" ? "itms-apps://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
  Linking.openURL(url).catch(() => {});
}

export default function SubscriptionPage() {
  const colors = useColors();
  const { setPremium, toast } = useStore();
  const purchases = usePurchases();
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null);
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    let live = true;
    purchases
      .getEntitlement()
      .then((e) => {
        if (live) setEntitlement(e);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [purchases]);

  if (loading) {
    return (
      <PushedScreen title="Subscription">
        <PageLoading />
      </PushedScreen>
    );
  }

  return (
    <PushedScreen title="Subscription">
      <SectionHeader>Plan</SectionHeader>
      <Group>
        <Row
          leading={<IconCircle icon="sparkles" tint={colors.accent} bg={colors.accentSoft} />}
          title="PetPal+"
          subtitle="Care plans, smart reminders & vet booking"
        />
        <Row
          onPress={() => setPaywallOpen(true)}
          leading={<IconCircle icon="arrow-up" tint={colors.accent} bg={colors.accentSoft} />}
          title="Change plan"
          subtitle="See other plans and pricing"
        />
      </Group>

      <SectionHeader>Billing</SectionHeader>
      <Group>
        <Row
          leading={<IconCircle icon="calendar" tint={colors.label2} bg={colors.fill} />}
          title="Started"
          subtitle={fmtDate(entitlement?.latestPurchaseDate)}
        />
        <Row
          leading={<IconCircle icon="calendar" tint={colors.label2} bg={colors.fill} />}
          title={entitlement?.willRenew === false ? "Ends" : "Renews"}
          subtitle={fmtDate(entitlement?.expirationDate)}
        />
      </Group>

      <SectionHeader>Manage</SectionHeader>
      <Group>
        <Row
          onPress={openStoreSubscriptions}
          leading={<IconCircle icon="alert" tint={colors.red} bg={colors.redSoft} />}
          title="Cancel subscription"
          subtitle={`Manage or cancel anytime in your ${Platform.OS === "ios" ? "App Store" : "Play Store"} account`}
        />
      </Group>

      {__DEV__ || !purchases.live ? (
        <>
          <SectionHeader>Developer</SectionHeader>
          <Group>
            <Row
              leading={<IconCircle icon="gear" tint={colors.label2} bg={colors.fill} />}
              title="Reset local flag (dev)"
              subtitle="Flips households.premium only — not a real cancellation"
              trailing={
                <SmallButton
                  label="Turn off"
                  tone="gray"
                  onPress={() => {
                    setPremium(false);
                    toast("sparkles", "PetPal+ deactivated", "You can re-enable it anytime");
                  }}
                />
              }
            />
          </Group>
        </>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <Footnote>Subscriptions renew automatically until cancelled through your device&apos;s App Store or Play Store account settings.</Footnote>
      </View>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </PushedScreen>
  );
}
