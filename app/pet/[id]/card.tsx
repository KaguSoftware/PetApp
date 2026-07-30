import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import PetShareCard from "@/components/PetShareCard";
import ShareStyleSheet from "@/components/ShareStyleSheet";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { Footnote, PRESS_SCALE_SMALL, PressableScale, Segmented } from "@/components/ui";
import { VET, VETS, formatAge, formatWeight, nextAnniversary, nextBirthday } from "@/lib/data";
import { capturePetCard, petCaption, sharePetCardImage } from "@/lib/petShare";
import { PET_THEME_ID, type InkTone } from "@/lib/shareTheme";
import { useStore } from "@/lib/store";
import { floatShadow, font, radius, withAlpha, useColors, type Colors } from "@/lib/theme";

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, DATE_FMT);
}

function InfoRow({ label, value, mono = false, first = false }: { label: string; value: string; mono?: boolean; first?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.infoRow, !first && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoValueMono]}>{value}</Text>
    </View>
  );
}

/**
 * The share control's backing surface. iOS wants no background at all — just
 * the bare glyph — so the glass/blur island is Android-only, where a filled
 * pill keeps the control visible against the header.
 */
function ShareGlass({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (Platform.OS === "ios") return <View style={styles.shareGlass}>{children}</View>;
  return <View style={[styles.shareGlass, styles.shareGlassAndroid]}>{children}</View>;
}

type Variant = "emergency" | "profile";

/** One field of the card — the same config renders the on-screen row AND the
 *  share text, so the two can never drift apart. */
type CardField = { label: string; value: string; mono?: boolean };

export default function PetCardPage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, hydrated, toast } = useStore();
  const [variant, setVariant] = useState<Variant>("emergency");
  // The off-screen template we rasterise on share. Hooks stay above the early
  // returns below.
  const shareCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [themeId, setThemeId] = useState<string>(PET_THEME_ID);
  const [ink, setInk] = useState<InkTone>("light");

  if (!hydrated) {
    return (
      <PushedScreen title="Pet card">
        <PageLoading />
      </PushedScreen>
    );
  }

  const pet = state.pets.find((p) => p.id === id);
  if (!pet) {
    return (
      <PushedScreen title="Pet card">
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Pet not found</Text>
          <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => router.replace("/home")} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.notFoundLink}>Back home</Text>
          </PressableScale>
        </View>
      </PushedScreen>
    );
  }

  // Emergency contact: prefer whoever actually runs the household (real
  // owner/admin role on the account), not the cosmetic card label — that label
  // no longer carries "Admin" at all.
  const managerCardIds = new Set(
    state.accounts.filter((a) => a.role === "owner" || a.role === "admin").map((a) => a.memberId)
  );
  // Signing up without typing a name stores the literal placeholder "You"
  // (lib/auth.ts). That reads fine in the activity feed, where "You" means the
  // reader — but this card gets handed to a sitter or posted when a pet goes
  // missing, and "Family contact: You" tells a stranger nothing. Prefer any
  // household manager with a real name; fall back to any member with one.
  const named = (m: { name: string } | undefined) => !!m && m.name.trim() !== "" && m.name.trim().toLowerCase() !== "you";
  const managers = state.members.filter((m) => managerCardIds.has(m.id));
  const contact = managers.find(named) ?? state.members.find(named) ?? managers[0] ?? state.members[0];
  // If even the fallback is the placeholder, the row is omitted below rather
  // than printing a name that isn't one.
  const contactName = named(contact) ? contact.name : null;
  const vet = VETS.find((v) => state.bookedVetIds.includes(v.id)) ?? VET;
  const genderLabel = pet.gender === "male" ? "Male" : pet.gender === "female" ? "Female" : null;
  const speciesLabel = pet.species === "cat" ? "Cat" : "Dog";

  // The two variants serve two different readers, so their fields are two
  // different sets. EMERGENCY = what a sitter/finder/vet needs to act fast:
  // identification, medical flags, who to call. PROFILE = who this pet is:
  // the dates and favorites a friend would care about. Only fields with real
  // data render — no empty rows.
  const emergencyFields: CardField[] = [
    {
      label: "Born",
      value: pet.birthDate != null ? `${fmtDate(pet.birthDate)} (${formatAge(pet.ageYears)})` : formatAge(pet.ageYears),
    },
    { label: "Weight", value: formatWeight(pet.weightKg, state.units) },
    ...(pet.microchip ? [{ label: "Microchip", value: pet.microchip, mono: true }] : []),
    ...(pet.meds.length > 0
      ? [{ label: "Medication", value: pet.meds.map((m) => [m.name, m.dosage].filter(Boolean).join(" ")).join(", ") }]
      : []),
    ...(contactName ? [{ label: "Family contact", value: contactName }] : []),
    { label: "Vet", value: `${vet.name} · ${vet.clinic}` },
    { label: "Vet phone", value: vet.phone, mono: true },
  ];

  const profileFields: CardField[] = [
    pet.birthDate != null
      ? { label: "Next birthday", value: `Turns ${nextBirthday(pet.birthDate).turns} on ${fmtDate(nextBirthday(pet.birthDate).date)}` }
      : { label: "Age", value: formatAge(pet.ageYears) },
    { label: "Gotcha day", value: fmtDate(nextAnniversary(pet.createdAt)) },
    { label: "In the family since", value: fmtDate(pet.createdAt) },
    ...(pet.owned.length > 0 ? [{ label: "Wardrobe", value: `${pet.owned.length} accessories collected` }] : []),
    ...(contact ? [{ label: "Family", value: `${state.members.length} member${state.members.length === 1 ? "" : "s"}` }] : []),
  ];

  const fields = variant === "emergency" ? emergencyFields : profileFields;
  // One subtitle, used by the preview, the exported poster and the share text.
  const subtitle = `${speciesLabel} · ${pet.breed}${genderLabel ? ` · ${genderLabel}` : ""}`;

  // What the user pastes with the post. The poster carries the facts; this is
  // the words around it — see petCaption.
  const caption = petCaption(pet, variant, subtitle);

  // Text-only fallback for when there's no image to share at all. Stays a plain
  // data dump on purpose: without the poster, the details ARE the message.
  const shareText = [
    variant === "profile" ? `Meet ${pet.name}!` : `${pet.name} — emergency & ID card`,
    subtitle,
    ...(variant === "emergency" && pet.allergies ? [`⚠ Allergies/alerts: ${pet.allergies}`] : []),
    ...fields.map((f) => `${f.label}: ${f.value}`),
    "— shared from PetPal",
  ].join("\n");

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await capturePetCard(shareCardRef);
      // Close the style sheet BEFORE the OS share sheet: two modals competing
      // for presentation leaves the share sheet stuck behind ours on iOS.
      setStyleOpen(false);
      await new Promise((r) => setTimeout(r, 280));
      await sharePetCardImage(uri, {
        dialogTitle: `${pet.name} — PetPal card`,
        caption,
        // The clipboard write is invisible otherwise, and the caption is only
        // useful if the user knows it's there to paste.
        onCaptionCopied: () => toast("check", "Caption copied", "Paste it with your post"),
      });
    } catch {
      // Capture can fail on an offscreen view (old Androids, low memory). The
      // text card is still worth sharing, so fall back rather than fail.
      try {
        setStyleOpen(false);
        await Share.share({ title: `${pet.name} — PetPal card`, message: shareText });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <PushedScreen
      title="Pet card"
      trailing={
        // Plain Pressable + opacity dim (the header-control pattern from
        // NotificationBell): a scale transform inside the UIBarButtonItem
        // clips against the bar's bounds. 38pt pill + hitSlop → 50pt target.
        <Pressable
          onPress={() => setStyleOpen(true)}
          disabled={sharing}
          accessibilityRole="button"
          accessibilityLabel="Share card"
          accessibilityState={{ busy: sharing }}
          hitSlop={6}
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.6 }]}
        >
          <ShareGlass>
            {sharing ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="share" size={20} color={colors.accent} />}
          </ShareGlass>
        </Pressable>
      }
    >
      {/* Which card — two different readers, two different field sets. */}
      <View style={{ marginTop: 4 }}>
        <Segmented
          options={[
            { value: "emergency", label: "Emergency" },
            { value: "profile", label: "Profile" },
          ]}
          value={variant}
          onChange={setVariant}
        />
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={[withAlpha(pet.gradient[0], 0.13), withAlpha(pet.gradient[1], 0.07)]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.cardHero}
        >
          <PetAvatar pet={pet} size="xl" />
          <Text style={styles.heroName}>{pet.name}</Text>
          <Text style={styles.heroMeta}>
            {speciesLabel} · {pet.breed}
            {genderLabel ? ` · ${genderLabel}` : ""}
          </Text>
          <View style={[styles.badge, variant === "emergency" ? styles.badgeEmergency : styles.badgeProfile]}>
            <Text style={[styles.badgeLabel, variant === "emergency" ? styles.badgeLabelEmergency : styles.badgeLabelProfile]}>
              {variant === "emergency" ? "Emergency & ID card" : "Profile card"}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.cardBody}>
          {/* Allergies get a loud box, not a quiet row — it's the one field a
              stranger must not miss. Emergency only. */}
          {variant === "emergency" && pet.allergies ? (
            <View style={styles.allergyBox}>
              <Icon name="alert" size={16} color={colors.red} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.allergyLabel}>Allergies &amp; alerts</Text>
                <Text style={styles.allergyValue}>{pet.allergies}</Text>
              </View>
            </View>
          ) : null}
          {fields.map((f, i) => (
            <InfoRow key={f.label} first={i === 0 && !(variant === "emergency" && pet.allergies)} label={f.label} value={f.value} mono={f.mono} />
          ))}
        </View>
      </View>

      <Footnote style={{ marginTop: 14, paddingHorizontal: 8 }}>
        {variant === "emergency"
          ? `This is what you'd hand a sitter or post if ${pet.name} ever went missing — share it with the button up top, and keep the microchip and allergy info current in Settings ▸ Pets.`
          : `${pet.name}'s intro card — share it with the button up top.`}
      </Footnote>
      <View style={{ height: 16 }} />

      {/* The share template. It has to be really laid out for captureRef to see
          it — `display: none` / zero opacity capture blank — so it is parked
          off-screen and made untouchable instead. */}
      <View style={styles.shareCardHost} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View ref={shareCardRef} collapsable={false}>
          <PetShareCard
            pet={pet}
            variant={variant}
            subtitle={subtitle}
            fields={fields}
            themeId={themeId}
            ink={ink}
          />
        </View>
      </View>

      <ShareStyleSheet
        open={styleOpen}
        onClose={() => setStyleOpen(false)}
        onShare={share}
        sharing={sharing}
        pet={pet}
        variant={variant}
        subtitle={subtitle}
        fields={fields}
        themeId={themeId}
        onThemeChange={setThemeId}
        ink={ink}
        onInkChange={setInk}
      />
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
  notFoundTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  notFoundLink: { marginTop: 12, fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  // iOS: no fill — just the bare glyph. Android keeps the accent pill.
  shareButton: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  shareGlass: { flex: 1, alignSelf: "stretch", borderRadius: 19, alignItems: "center", justifyContent: "center" },
  shareGlassAndroid: { backgroundColor: colors.accentSoft },
  // Parked far off-screen: laid out (so it can be captured) but never seen.
  // No `opacity: 0` here — captureRef rasterises the view's own alpha, so a
  // transparent host yields a blank PNG on Android.
  shareCardHost: { position: "absolute", left: -9999, top: 0 },
  card: { marginTop: 14, borderRadius: radius.lg, backgroundColor: colors.card, overflow: "hidden", ...floatShadow },
  cardHero: { alignItems: "center", paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  heroName: { marginTop: 12, fontSize: 26, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
  heroMeta: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },
  badge: { marginTop: 8, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeEmergency: { backgroundColor: colors.redSoft },
  badgeProfile: { backgroundColor: colors.accentSoft },
  badgeLabel: { fontSize: 12, fontFamily: font.semibold },
  badgeLabelEmergency: { color: colors.red },
  badgeLabelProfile: { color: colors.accent },
  cardBody: { paddingHorizontal: 20, paddingBottom: 20 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 10 },
  infoRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep },
  infoLabel: {
    fontSize: 12,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.label3,
    paddingTop: 2,
  },
  infoValue: { flex: 1, minWidth: 0, textAlign: "right", fontSize: 14, fontFamily: font.semibold, color: colors.label },
  infoValueMono: { fontSize: 13, letterSpacing: 0.8 },
  allergyBox: {
    marginTop: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  allergyLabel: { fontSize: 12, fontFamily: font.semibold, textTransform: "uppercase", letterSpacing: 0.6, color: colors.red },
  allergyValue: { marginTop: 1, fontSize: 14, fontFamily: font.semibold, color: colors.label, lineHeight: 19 },
});
