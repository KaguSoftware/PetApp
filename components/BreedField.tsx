import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { DrillView } from "@/components/Motion";
import Sheet from "@/components/Sheet";
import { AccentButton, KeyboardDoneAccessory, PressableScale, PRESS_SCALE_SMALL, SheetFooter, SheetTitle, TextField } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { breedWheelOptions, OTHER_BREED } from "@/lib/data";
import { font, radius, useColors, type Colors } from "@/lib/theme";

/** Distinct from the host screen's bar — see KeyboardDoneAccessory's nativeID. */
const BREED_ACCESSORY_ID = "breed-custom-accessory";

/**
 * A single tappable row showing the current breed. `presentation` picks how the
 * wheel is revealed:
 *   - "sheet"  → a bottom sheet slides up with the wheel (plus the custom-name
 *                field when "Other" is selected) and a Save button. Draft state
 *                is local, so dismissing the sheet leaves the field untouched.
 *   - "inline" → the wheel expands underneath the row (the default; required
 *                when this field is itself already rendered inside a Sheet,
 *                since nesting Modals is unreliable on iOS).
 */
export default function BreedField({
  species,
  breed,
  customBreed,
  onChangeBreed,
  onChangeCustomBreed,
  presentation = "inline",
}: {
  species: "cat" | "dog";
  breed: string;
  customBreed: string;
  onChangeBreed: (b: string) => void;
  onChangeCustomBreed: (v: string) => void;
  presentation?: "inline" | "sheet";
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const isOtherBreed = breed === OTHER_BREED;

  // Only meaningful in "sheet" mode: the wheel + text field edit these until
  // Save commits them upward.
  const [draftBreed, setDraftBreed] = useState(breed);
  const [draftCustom, setDraftCustom] = useState(customBreed);
  const draftIsOther = draftBreed === OTHER_BREED;

  // Which page of the sheet is up. Picking "Other" drills to a dedicated
  // custom-name page instead of growing a field under the wheel.
  const [page, setPage] = useState<"wheel" | "custom">("wheel");
  const [drillDir, setDrillDir] = useState<"forward" | "back">("forward");
  // False until the first in-sheet drill, so the WHEEL page doesn't slide in
  // when the sheet merely opens — only real page swaps animate.
  const [hasDrilled, setHasDrilled] = useState(false);

  const drillToCustom = () => {
    setHasDrilled(true);
    setDrillDir("forward");
    setPage("custom");
  };

  const drillBack = () => {
    // The custom page owns a text field; releasing focus before the swap keeps
    // the keyboard from lingering over the wheel we're returning to.
    Keyboard.dismiss();
    setHasDrilled(true);
    setDrillDir("back");
    setPage("wheel");
  };

  // The wheel only ever updates the draft. Drilling to the custom page is
  // deliberately NOT done here: this fires the moment the wheel settles on a
  // row, so scrolling THROUGH "Other" to reach a breed below it would rip the
  // page away mid-scroll. The user confirms with Save instead (see wheelSave).
  const handleDraftBreed = (b: string) => {
    setDraftBreed(b);
  };

  // Landing on "Other" closes the wheel and hands off straight to the
  // custom-name field below, rather than leaving the wheel open on its last row.
  const handleChange = (b: string) => {
    onChangeBreed(b);
    if (b === OTHER_BREED) setOpen(false);
  };

  const openSheet = () => {
    // Release first responder BEFORE the sheet's Modal mounts. Without this the
    // Modal steals focus while the text field keeps it, so iOS restores that
    // field when the Modal unmounts and the keyboard snaps back with no
    // animation. Dismissing here makes it animate out and stay out.
    Keyboard.dismiss();
    setDraftBreed(breed);
    setDraftCustom(customBreed);
    // Reopen on the page that matches the current value, with no entrance
    // animation — a sheet that opens mid-slide reads as a glitch.
    setPage(breed === OTHER_BREED ? "custom" : "wheel");
    setHasDrilled(false);
    setOpen(true);
  };

  // Every close path goes through here: the "Other" text field lives INSIDE the
  // sheet, so unmounting the Modal while it still holds focus reproduces the
  // same no-animation keyboard flash on the way back out.
  const closeSheet = () => {
    Keyboard.dismiss();
    setOpen(false);
  };

  const save = () => {
    onChangeBreed(draftBreed);
    onChangeCustomBreed(draftIsOther ? draftCustom : "");
    closeSheet();
  };

  // Save on the WHEEL page. Confirming "Other" isn't a finished answer yet — it
  // advances to the custom-name page rather than committing the literal string
  // "Other" as the breed. Any real breed saves and closes as usual.
  const wheelSave = () => {
    if (draftIsOther) drillToCustom();
    else save();
  };

  // The row shows the typed custom name once there is one — "Other" on its own
  // tells the user nothing about which breed they actually entered.
  const rowLabel = isOtherBreed && customBreed.trim() ? customBreed.trim() : breed;

  return (
    <View>
      <PressableScale
        scaleTo={PRESS_SCALE_SMALL}
        onPress={presentation === "sheet" ? openSheet : () => setOpen((o) => !o)}
      >
        <View style={styles.row}>
          <Text style={styles.value}>{rowLabel}</Text>
          <View style={{ transform: [{ rotate: open && presentation === "inline" ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {presentation === "inline" ? (
        <>
          {open ? (
            <View style={{ marginTop: 10 }}>
              <SingleWheelPicker values={breedWheelOptions(species)} value={breed} onChange={handleChange} />
            </View>
          ) : null}

          {isOtherBreed ? (
            <TextField
              value={customBreed}
              onChangeText={onChangeCustomBreed}
              placeholder="Type your pet's breed"
              autoCorrect={false}
              returnKeyType="done"
              style={{ marginTop: 10 }}
            />
          ) : null}
        </>
      ) : (
        // scrollable={false}: the wheel's columns are ScrollViews, and nesting
        // them in the sheet's own vertical ScrollView means both answer the same
        // pan — on iOS the outer one wins and the wheel won't turn.
        // One Sheet for both pages so the drill happens INSIDE a single modal —
        // an expo-router push would slide in BEHIND this Modal's native window.
        // drillClip hides the horizontal slide's overflow.
        <Sheet open={open} onClose={closeSheet} scrollable={false}>
          <View style={styles.drillClip}>
            {page === "custom" ? (
              <DrillView key="custom" direction={drillDir} animate={hasDrilled}>
                <View style={styles.pageHeader}>
                  <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={drillBack}>
                    <View style={styles.backButton}>
                      <Icon name="chevron-left" size={18} color={colors.accent} />
                      <Text style={styles.backLabel}>Breed</Text>
                    </View>
                  </PressableScale>
                </View>
                <SheetTitle>Your pet&apos;s breed</SheetTitle>
                <Text style={styles.pageHint}>
                  Not on the list — type it in and we&apos;ll set custom care targets.
                </Text>
                {/* No autoFocus — the keyboard opens only when the user taps the
                    field, so arriving on this page doesn't shove the sheet up. */}
                <TextField
                  value={draftCustom}
                  onChangeText={setDraftCustom}
                  placeholder="e.g. Anatolian Shepherd"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={save}
                  inputAccessoryViewID={BREED_ACCESSORY_ID}
                  style={{ marginTop: 14 }}
                />
                {/* This Sheet is its own native Modal window, so it can't reach
                    the host screen's accessory — it needs a bar of its own. */}
                <KeyboardDoneAccessory nativeID={BREED_ACCESSORY_ID} />
                <SheetFooter>
                  <AccentButton onPress={save}>Save</AccentButton>
                </SheetFooter>
              </DrillView>
            ) : (
              <DrillView key="wheel" direction={drillDir} animate={hasDrilled}>
                <SheetTitle>Breed</SheetTitle>
                {/* SheetTitle has no bottom margin — the removed FieldLabel used
                    to supply this gap, so the wheel needs its own. */}
                <View style={{ marginTop: 18 }}>
                  <SingleWheelPicker
                    values={breedWheelOptions(species)}
                    value={draftBreed}
                    onChange={handleDraftBreed}
                  />
                </View>
                <SheetFooter>
                  {/* "Next" on Other — the button advances to the name page
                      rather than saving, so the label shouldn't promise a save. */}
                  <AccentButton onPress={wheelSave}>{draftIsOther ? "Next" : "Save"}</AccentButton>
                </SheetFooter>
              </DrillView>
            )}
          </View>
        </Sheet>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    value: { fontSize: 16, fontFamily: font.medium, color: colors.label },
    // Contains the horizontal slide so the outgoing page isn't visible beyond
    // the sheet's padding while it animates out.
    drillClip: { overflow: "hidden" },
    // iOS back affordance: chevron + the previous page's title, accent-colored.
    pageHeader: { marginBottom: 6 },
    backButton: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", paddingVertical: 4, paddingRight: 8 },
    backLabel: { fontSize: 16, fontFamily: font.medium, color: colors.accent },
    pageHint: { fontSize: 13, fontFamily: font.regular, color: colors.label3, lineHeight: 18, marginTop: 6, paddingHorizontal: 4 },
  });
