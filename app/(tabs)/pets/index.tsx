import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import PageLoading from "@/components/PageLoading";
import PetSelectorRow from "@/components/PetSelectorRow";
import { TabScreen } from "@/components/Screen";
import Stage from "@/components/pets/Stage";
import Wardrobe from "@/components/pets/Wardrobe";
import { PageButton } from "@/components/plan/Chapter";
import { PressableScale } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";
import { wardrobeFor, type WardrobeItem } from "@/lib/wardrobe";

/**
 * Pets — the wardrobe.
 *
 * The tab had one job (dress the animal) and hid all of it behind a button.
 * Above that button sat a shadowed card wrapping an arcade stage, a row of five
 * identical grey chips for age, weight, height, length and an item count, and
 * below it a `Group` holding a single "Add another pet" row with an icon disc
 * on its left. The button opened a sheet containing four section headers and
 * fifteen shadowed cards, each with a preview box and its own pill.
 *
 * Now the page is the wardrobe. The stage is a bleed rather than a box, the
 * animal is the lead image, and every piece it can wear is on the page in four
 * chapters — one per slot — with the rule of each chapter carrying what's on.
 *
 * The four measurement sheets are gone rather than restyled: `/pet/[id]`
 * already edits age, weight, height and length, and a dress-up tab was a
 * strange second door to a health record. The identity line under the name says
 * the two numbers that ARE this page's business — how many pieces the animal
 * owns, and how many it has on — and the name itself opens the profile for
 * everything else.
 */
export default function PetsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated, buyCosmetic, toggleEquip, toast } = useStore();
  const refreshControl = usePullToRefresh();

  const [petId, setPetId] = useState(state.pets[0]?.id ?? "");
  // Bumped on every buy or equip; the stage pops the animal when it changes.
  const [pulse, setPulse] = useState(0);

  const pet = state.pets.find((p) => p.id === petId) ?? state.pets[0];
  const doc = useMemo(() => (pet ? wardrobeFor(pet, state.coins) : null), [pet, state.coins]);

  // Spam-tap guard on the profile link — a burst of taps otherwise stacks
  // several pushes before the first transition starts. Released on focus, so it
  // can never strand the link the way a timer can if the screen unmounts first.
  const navLock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navLock.current = false;
    }, [])
  );
  const openProfile = useCallback(() => {
    if (!pet || navLock.current) return;
    navLock.current = true;
    router.push(`/pet/${pet.id}`);
  }, [pet, router]);

  const trailing = <HeaderActions showCoins />;

  if (!hydrated) {
    return (
      <TabScreen title="Pets" subtitle="Dress them up" trailing={trailing} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );
  }

  if (!pet || !doc) {
    return (
      <TabScreen title="Pets" subtitle="Dress them up" trailing={trailing} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="paw"
            title="No pets yet"
            body="Add a pet and this becomes their dressing room — hats, glasses, collars and capes, bought with the coins your care logs earn."
            cta="Add a pet"
            onCta={() => router.push("/pet/new")}
          />
        </View>
      </TabScreen>
    );
  }

  /**
   * One target for every cell, because a piece is one thing in three states.
   * Owned pieces toggle straight on and off. A purchase spends a currency the
   * family worked for and cannot be undone, so it asks first — the same native
   * confirm the app uses everywhere else something is irreversible.
   */
  const press = (item: WardrobeItem) => {
    const c = item.cosmetic;
    if (item.owned) {
      const wasWorn = item.worn;
      toggleEquip(pet.id, c.id);
      setPulse((n) => n + 1);
      if (wasWorn) toast("paw", `Took off the ${c.name}`, `${pet.name}'s look updated`);
      else toast("paw", `${pet.name} is wearing the ${c.name}`, "Looking sharp");
      return;
    }
    if (!item.affordable) {
      toast("coin", "Not enough coins", `${c.name} costs ${c.price} — log some care to earn more`);
      return;
    }
    Alert.alert(`Buy the ${c.name}?`, `${c.price} coins. ${pet.name} will put it on straight away.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Buy",
        onPress: () => {
          buyCosmetic(pet.id, c.id);
          setPulse((n) => n + 1);
          toast("bag", `${c.name} purchased`, `${pet.name} is wearing it now`);
        },
      },
    ]);
  };

  return (
    <TabScreen title="Pets" subtitle="Dress them up" trailing={trailing} refreshControl={refreshControl}>
      <Text style={styles.standfirst}>{doc.standfirst}</Text>

      {/* The same reel every other pet-scoped page uses. Its "+" is why there
          is no add-a-pet row further down the page. */}
      <PetSelectorRow pets={state.pets} selectedId={pet.id} onSelect={setPetId} />

      <Stage pet={pet} pulse={pulse} />

      {/* The subject's name, set like a chapter head — the same shape Home uses
          for a pet, so an animal is introduced the same way in both places. */}
      <PressableScale
        onPress={openProfile}
        accessibilityRole="header"
        accessibilityLabel={`${pet.name}, ${pet.breed}. Open profile.`}
        hitSlop={{ top: 8, bottom: 4, left: 4, right: 4 }}
      >
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {pet.name}
          </Text>
          <View style={styles.nameRule} />
        </View>
      </PressableScale>
      <Text style={styles.identity}>{doc.identity}</Text>

      <Wardrobe doc={doc} onPress={press} />

      {/* Colophon: where the coins come from, and everything about this animal
          that is not what it is wearing. */}
      <View style={styles.colophon}>
        <PageButton label={`Coins · ${state.coins.toLocaleString()}`} tint={colors.orange} icon="coin" full onPress={() => router.push("/coins")} />
        <PageButton label={`${pet.name}'s profile`} tint={colors.accent} icon="paw" full onPress={openProfile} />
      </View>
    </TabScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    standfirst: { marginTop: 10, maxWidth: 360, fontSize: 15, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },

    nameRow: { marginTop: 22, flexDirection: "row", alignItems: "center", gap: 12 },
    name: { fontSize: 25, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label, flexShrink: 1 },
    nameRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(colors.accent, 0.4) },
    identity: { marginTop: 5, fontSize: 14.5, fontFamily: font.regular, color: colors.label2 },

    colophon: { marginTop: 40, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep, gap: 8 },
  });
