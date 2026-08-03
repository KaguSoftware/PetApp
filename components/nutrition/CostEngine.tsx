import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import {
  DONE_ACCESSORY_ID,
  KeyboardDoneAccessory,
  PressableScale,
  SelectableChip,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { AnimatedNumber, Eyebrow, Hairline, useInk } from "@/components/nutrition/atoms";
import type { Pet } from "@/lib/data";
import { currencySymbol, CURRENCIES, formatMoney, useFoodPricing, type FoodPrice } from "@/lib/foodPricing";
import {
  computeCost,
  energyBasis,
  FORMAT_ICON,
  FORMAT_LABEL,
  portionGrams,
  TYPICAL_KCAL_PER_100G,
  type CostResult,
  type FormatId,
} from "@/lib/nutrition";
import { cardShadow, font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * The food cost calculator.
 *
 * The question it answers is the one people actually ask in the aisle: is the
 * big expensive bag cheaper than the small cheap one, and what does this animal
 * cost me a month? Three things make that answer honest rather than decorative:
 *
 *  1. **Calories, not grams, are the invariant.** The same dog needs ~310 g of
 *     kibble or ~1,350 g of wet food for the same energy. A calculator that
 *     carries one gram figure across formats is wrong by a factor of four, so
 *     consumption is derived per format from `energyBasis` (see lib/nutrition).
 *  2. **The basis is on screen.** Whatever the daily calorie figure came from —
 *     the vet guide, the family's own target, or the RER formula — is printed
 *     under it, and the full arithmetic is one tap away. Nothing is a black box.
 *  3. **Cheapest is not framed as best.** The comparison names the cheapest
 *     format and immediately says that suitability is decided further up the
 *     page, because for a urinary-prone cat the cheap answer is the wrong one.
 */

/** Pack-size units offered, and what one of them is in grams. */
const PACK_UNITS = [
  { id: "g", label: "g", grams: 1 },
  { id: "kg", label: "kg", grams: 1000 },
  { id: "oz", label: "oz", grams: 28.3495 },
  { id: "lb", label: "lb", grams: 453.592 },
] as const;
type PackUnitId = (typeof PACK_UNITS)[number]["id"];

/** The three formats worth pricing. `mixed` and `raw` are guidance, not a shop
 *  aisle you can put one price on. */
const PRICED_FORMATS: FormatId[] = ["dry", "wet", "fresh"];

/** Sensible starting pack for each format, so the fields are never blank-blank. */
const PACK_DEFAULT: Record<FormatId, { size: string; unit: PackUnitId; count: string }> = {
  dry: { size: "2", unit: "kg", count: "1" },
  wet: { size: "85", unit: "g", count: "12" },
  fresh: { size: "1", unit: "kg", count: "1" },
  mixed: { size: "1", unit: "kg", count: "1" },
  raw: { size: "1", unit: "kg", count: "1" },
};

/** Which horizon the headline figure shows. */
type Horizon = "day" | "week" | "month" | "year";
const HORIZONS: { id: Horizon; label: string; long: string }[] = [
  { id: "day", label: "Day", long: "per day" },
  { id: "week", label: "Week", long: "per week" },
  { id: "month", label: "Month", long: "per month" },
  { id: "year", label: "Year", long: "per year" },
];

function horizonValue(cost: CostResult, h: Horizon): number {
  return h === "day" ? cost.perDay : h === "week" ? cost.perWeek : h === "month" ? cost.perMonth : cost.perYear;
}

/** Parse a typed amount, tolerating both decimal conventions ("24,99" / "24.99"). */
function num(text: string): number {
  const cleaned = text.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function gramsOf(size: string, unit: PackUnitId): number {
  const factor = PACK_UNITS.find((u) => u.id === unit)?.grams ?? 1;
  return num(size) * factor;
}

/** Round a gram figure the way a person would say it out loud. */
function saySize(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`;
  }
  return `${Math.round(grams)} g`;
}

export default function CostEngine({ pet }: { pet: Pet }) {
  const colors = useColors();
  const ink = useInk();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { currency, prices, setPrice, setCurrency } = useFoodPricing(pet.id);

  const [format, setFormat] = useState<FormatId>("dry");
  const [horizon, setHorizon] = useState<Horizon>("day");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Draft fields, seeded from whatever is stored for the selected format. Keyed
  // by format so switching tabs re-seeds rather than carrying one food's numbers
  // onto another's.
  const stored = prices[format];
  const [draft, setDraft] = useState<Record<string, { price: string; size: string; unit: PackUnitId; count: string; kcal: string }>>({});
  // Only grams are stored, so a pack entered in pounds comes back expressed in
  // the format's default unit. Numerically identical, rounded to 3 dp so it
  // doesn't return as "0.9071847999999".
  const seedUnit = PACK_DEFAULT[format].unit;
  const seedUnitGrams = PACK_UNITS.find((u) => u.id === seedUnit)?.grams ?? 1;
  const seed = draft[format] ?? {
    price: stored ? String(stored.price) : "",
    size: stored ? String(Math.round((stored.packGrams / seedUnitGrams) * 1000) / 1000) : PACK_DEFAULT[format].size,
    unit: seedUnit,
    count: stored ? String(stored.packCount) : PACK_DEFAULT[format].count,
    kcal: stored?.kcalPer100g ? String(stored.kcalPer100g) : "",
  };

  const patch = (next: Partial<typeof seed>) => {
    const merged = { ...seed, ...next };
    setDraft((d) => ({ ...d, [format]: merged }));
    const packGrams = gramsOf(merged.size, merged.unit);
    const price = num(merged.price);
    const kcalPer100g = num(merged.kcal);
    const entry: FoodPrice | null =
      price > 0 && packGrams > 0
        ? {
            price,
            packGrams,
            packCount: Math.max(1, Math.round(num(merged.count)) || 1),
            ...(kcalPer100g > 0 ? { kcalPer100g } : {}),
          }
        : null;
    setPrice(format, entry);
  };

  const basis = useMemo(() => energyBasis(pet), [pet]);
  const symbol = currencySymbol(currency);

  /** Consumption and cost for one format, using that format's own energy density. */
  const costFor = (id: FormatId): { cost: CostResult; grams: number } | undefined => {
    const p = prices[id];
    if (!p) return undefined;
    const grams = portionGrams(pet, id, p.kcalPer100g);
    const cost = computeCost({ price: p.price, packGrams: p.packGrams, packCount: p.packCount, gramsPerDay: grams, kcalPer100g: p.kcalPer100g });
    return cost ? { cost, grams } : undefined;
  };

  const active = costFor(format);
  const priced = PRICED_FORMATS.map((id) => ({ id, ...(costFor(id) ?? {}) })).filter(
    (r): r is { id: FormatId; cost: CostResult; grams: number } => r.cost != null,
  );
  const cheapest = priced.length > 1 ? priced.reduce((a, b) => (a.cost.perMonth <= b.cost.perMonth ? a : b)) : undefined;
  const dearestMonthly = priced.length > 0 ? Math.max(...priced.map((r) => r.cost.perMonth)) : 0;
  // True when the portion came off the vet guide's kibble range rather than out
  // of the calorie division — changes what the worked example has to say.
  const fromGuide = format === "dry" && !(prices.dry?.kcalPer100g && prices.dry.kcalPer100g > 0);

  const horizonMeta = HORIZONS.find((h) => h.id === horizon)!;
  // Yearly figures get no pennies — "£1,247" is the number people repeat, and
  // two decimals on four digits is just noise at that scale.
  const decimals = horizon === "year" ? 0 : 2;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <View style={s.headText}>
          <Eyebrow>What it costs</Eyebrow>
          <Text style={s.headTitle}>Feeding {pet.name}</Text>
        </View>
        <PressableScale
          onPress={() => setCurrencyOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Currency, ${currency}. Change`}
        >
          <View style={s.currencyChip}>
            <Text style={s.currencyChipLabel}>
              {symbol} {currency}
            </Text>
            <Icon name="chevron-down" size={13} color={colors.accent} strokeWidth={2.4} />
          </View>
        </PressableScale>
      </View>

      {/* Format tabs. A filled dot marks a format that already has a price on it,
          so the comparison below never looks empty for an unexplained reason. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.formatRail}>
        {PRICED_FORMATS.map((id) => {
          const on = format === id;
          const hasPrice = prices[id] != null;
          return (
            <PressableScale
              key={id}
              haptic
              onPress={() => setFormat(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${FORMAT_LABEL[id]}${hasPrice ? ", priced" : ", no price yet"}`}
            >
              <View style={[s.formatTab, on && s.formatTabOn]}>
                <Icon name={FORMAT_ICON[id]} size={15} color={on ? colors.white : colors.label2} strokeWidth={2.2} />
                <Text style={[s.formatTabLabel, on && s.formatTabLabelOn]}>{FORMAT_LABEL[id]}</Text>
                {hasPrice ? <View style={[s.formatDot, on && { backgroundColor: colors.white }]} /> : null}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* ── Inputs ─────────────────────────────────────────────────────────── */}
      <View style={s.inputCard}>
        <Text style={s.inputLabel}>What you pay</Text>
        <View style={s.priceRow}>
          <View style={s.symbolBox}>
            <Text style={s.symbolText}>{symbol}</Text>
          </View>
          <TextField
            value={seed.price}
            onChangeText={(t) => patch({ price: t })}
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputAccessoryViewID={DONE_ACCESSORY_ID}
            accessibilityLabel={`Price per purchase in ${currency}`}
            style={s.priceField}
          />
        </View>

        <Text style={[s.inputLabel, { marginTop: 18 }]}>How much is in one pack</Text>
        {/* Field above, units below — four unit chips and a number field don't
            fit one line at 375pt without the chips wrapping mid-row. */}
        <TextField
          value={seed.size}
          onChangeText={(t) => patch({ size: t })}
          placeholder="0"
          keyboardType="decimal-pad"
          inputAccessoryViewID={DONE_ACCESSORY_ID}
          accessibilityLabel="Pack size"
          style={s.sizeField}
        />
        <View style={s.unitRow}>
          {PACK_UNITS.map((u) => (
            <SelectableChip key={u.id} label={u.label} selected={seed.unit === u.id} onPress={() => patch({ unit: u.id })} />
          ))}
        </View>

        {/* Multipack stepper — a 12-tin box is one purchase, not twelve. */}
        <View style={s.countRow}>
          <Text style={s.countLabel}>Packs in the purchase</Text>
          <View style={s.stepper}>
            <PressableScale
              onPress={() => patch({ count: String(Math.max(1, Math.round(num(seed.count)) - 1)) })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="One fewer pack"
            >
              <View style={s.stepperBtn}>
                <Icon name="chevron-down" size={16} color={colors.label} strokeWidth={2.6} />
              </View>
            </PressableScale>
            <Text style={s.stepperValue}>{Math.max(1, Math.round(num(seed.count)) || 1)}</Text>
            <PressableScale
              onPress={() => patch({ count: String(Math.max(1, Math.round(num(seed.count)) + 1)) })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="One more pack"
            >
              <View style={s.stepperBtn}>
                <Icon name="chevron-up" size={16} color={colors.label} strokeWidth={2.6} />
              </View>
            </PressableScale>
          </View>
        </View>

        {/* Energy density is the field that turns a price comparison into a real
            one, but most people won't have the bag in hand — so it's optional and
            folded away rather than sitting in the main flow. */}
        <PressableScale
          onPress={() => setAdvancedOpen((v) => !v)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedOpen }}
        >
          <View style={s.advancedToggle}>
            <Icon name={advancedOpen ? "chevron-down" : "chevron-right"} size={14} color={colors.accent} strokeWidth={2.4} />
            <Text style={s.advancedToggleLabel}>
              {seed.kcal ? `Energy density: ${seed.kcal} kcal/100 g` : "Add the bag's energy density"}
            </Text>
          </View>
        </PressableScale>
        {advancedOpen ? (
          <View style={s.advancedBody}>
            <Text style={s.advancedHint}>
              Printed on every bag, usually as kcal/kg or kcal/100 g. With it, {pet.name}&apos;s portion is worked out from this
              exact food instead of a typical one, and you get a cost per 1,000 kcal — the only figure that compares two foods
              fairly.
            </Text>
            <View style={s.kcalRow}>
              <TextField
                value={seed.kcal}
                onChangeText={(t) => patch({ kcal: t })}
                placeholder={String(TYPICAL_KCAL_PER_100G[format])}
                keyboardType="number-pad"
                inputAccessoryViewID={DONE_ACCESSORY_ID}
                accessibilityLabel="Energy density, kilocalories per 100 grams"
                style={s.kcalField}
              />
              <Text style={s.kcalUnit}>kcal / 100 g</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Result ─────────────────────────────────────────────────────────── */}
      {active ? (
        <View style={[s.result, { backgroundColor: ink.bg, borderColor: ink.border }]}>
          <View style={s.horizonRow}>
            {HORIZONS.map((h) => {
              const on = horizon === h.id;
              return (
                <PressableScale
                  key={h.id}
                  onPress={() => setHorizon(h.id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Show cost ${h.long}`}
                >
                  <View style={[s.horizonTab, on && { backgroundColor: ink.track }]}>
                    <Text style={[s.horizonLabel, { color: on ? ink.fg : ink.fgFaint }]}>{h.label}</Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>

          <View style={s.bigRow}>
            <AnimatedNumber
              value={horizonValue(active.cost, horizon)}
              prefix={symbol}
              decimals={decimals}
              style={[s.bigNumber, { color: ink.fg }]}
              accessibilityLabel={`${formatMoney(horizonValue(active.cost, horizon), currency)} ${horizonMeta.long}`}
            />
            <Text style={[s.bigUnit, { color: ink.fgFaint }]}>{horizonMeta.long}</Text>
          </View>

          <Text style={[s.basisLine, { color: ink.fgDim }]}>
            {active.grams} g of {FORMAT_LABEL[format].toLowerCase()} a day · {basis.kcal.toLocaleString()} kcal
          </Text>

          <Hairline color={ink.hairline} />

          {/* One pack against a month — the shopping question, drawn. */}
          <View style={s.packBlock}>
            <View style={s.packHeadRow}>
              <Text style={[s.packHead, { color: ink.fg }]}>
                {Math.round(active.cost.packDays)} days per purchase
              </Text>
              <Text style={[s.packSub, { color: ink.fgFaint }]}>
                {saySize(active.cost.totalGrams)} total
              </Text>
            </View>
            {/* The track is scaled to whichever is longer, a month or the pack,
                so the 30-day mark stays in a truthful position instead of being
                pinned to the end once a bag outlasts a month. */}
            {(() => {
              const span = Math.max(30, active.cost.packDays);
              const covers = active.cost.packDays >= 30;
              return (
                <View style={[s.packTrack, { backgroundColor: ink.track }]}>
                  <View
                    style={[
                      s.packFill,
                      {
                        backgroundColor: covers ? colors.green : colors.orange,
                        width: `${(active.cost.packDays / span) * 100}%`,
                      },
                    ]}
                  />
                  <View style={[s.packMark, { backgroundColor: ink.fg, left: `${(30 / span) * 100}%` }]} />
                </View>
              );
            })()}
            <Text style={[s.packFoot, { color: ink.fgDim }]}>
              {active.cost.packDays >= 30
                ? `Covers a month with ${Math.round(active.cost.packDays - 30)} days to spare`
                : `${Math.round(30 - active.cost.packDays)} days short of a month`}
              {" · runs out around "}
              {new Date(active.cost.runsOutAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </Text>
          </View>

          {active.cost.per1000kcal != null ? (
            <>
              <Hairline color={ink.hairline} />
              <View style={s.valueRow}>
                <View style={s.valueText}>
                  <Text style={[s.valueLabel, { color: ink.fgFaint }]}>TRUE VALUE</Text>
                  <Text style={[s.valueHint, { color: ink.fgDim }]}>Cost of 1,000 kcal — compare this, not the price per kilo</Text>
                </View>
                <Text style={[s.valueNumber, { color: ink.fg }]}>{formatMoney(active.cost.per1000kcal, currency)}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Icon name="coin" size={20} color={colors.accent} strokeWidth={2.2} />
          </View>
          <Text style={s.emptyTitle}>Type in what a pack costs</Text>
          <Text style={s.emptyBody}>
            {pet.name} needs about {basis.kcal.toLocaleString()} kcal a day, which is roughly {portionGrams(pet, format)} g of{" "}
            {FORMAT_LABEL[format].toLowerCase()}. Add a price and this works out the daily, monthly and yearly cost, and how
            long each pack lasts.
          </Text>
          <Text style={s.emptyBasis}>{basis.label}</Text>
        </View>
      )}

      {/* ── The arithmetic, in full ───────────────────────────────────────── */}
      {active ? (
        <>
          <PressableScale
            onPress={() => setMathOpen((v) => !v)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ expanded: mathOpen }}
          >
            <View style={s.mathToggle}>
              <Icon name={mathOpen ? "chevron-down" : "chevron-right"} size={14} color={colors.label2} strokeWidth={2.4} />
              <Text style={s.mathToggleLabel}>How this is worked out</Text>
            </View>
          </PressableScale>
          {mathOpen ? (
            <View style={s.mathCard}>
              <MathLine
                colors={colors}
                step="1"
                text={`${pet.name} needs ${basis.kcal.toLocaleString()} kcal a day`}
                sub={basis.label}
              />
              {/* Dry food with no owner-supplied density comes straight off the
                  vet guide's kibble range rather than through the formula — so
                  the explanation has to say which of the two happened. */}
              {fromGuide ? (
                <MathLine
                  colors={colors}
                  step="2"
                  text={`That works out at ${active.grams} g of kibble a day`}
                  sub={`Straight from the vet feeding guide for a ${pet.breed} of ${pet.name}'s age — the same figure the Plan tab shows`}
                />
              ) : (
                <MathLine
                  colors={colors}
                  step="2"
                  text={`${basis.kcal.toLocaleString()} kcal ÷ ${
                    prices[format]?.kcalPer100g ?? TYPICAL_KCAL_PER_100G[format]
                  } kcal per 100 g = ${active.grams} g a day`}
                  sub={
                    prices[format]?.kcalPer100g
                      ? "Using the energy density you entered from the bag"
                      : `Using a typical density for ${FORMAT_LABEL[format].toLowerCase()} — add yours above for the exact figure`
                  }
                />
              )}
              <MathLine
                colors={colors}
                step="3"
                text={`${formatMoney(prices[format]!.price, currency)} ÷ ${saySize(active.cost.totalGrams)} = ${formatMoney(
                  (prices[format]!.price / active.cost.totalGrams) * 100,
                  currency,
                )} per 100 g`}
                sub={`${prices[format]!.packCount} × ${saySize(prices[format]!.packGrams)}`}
              />
              <MathLine
                colors={colors}
                step="4"
                text={`${active.grams} g × that = ${formatMoney(active.cost.perDay, currency)} a day`}
                sub={`× 30.4 average days = ${formatMoney(active.cost.perMonth, currency)} a month`}
                last
              />
            </View>
          ) : null}
        </>
      ) : null}

      {/* ── Side by side ──────────────────────────────────────────────────── */}
      {priced.length > 1 ? (
        <View style={s.compare}>
          <Eyebrow>Monthly, side by side</Eyebrow>
          <View style={s.compareRows}>
            {priced
              .slice()
              .sort((a, b) => a.cost.perMonth - b.cost.perMonth)
              .map((r) => {
                const isCheapest = cheapest?.id === r.id;
                const width = dearestMonthly > 0 ? Math.max(6, (r.cost.perMonth / dearestMonthly) * 100) : 0;
                return (
                  <View key={r.id} style={s.compareRow}>
                    <View style={s.compareHead}>
                      <Icon name={FORMAT_ICON[r.id]} size={14} color={isCheapest ? colors.green : colors.label2} strokeWidth={2.2} />
                      <Text style={s.compareName}>{FORMAT_LABEL[r.id]}</Text>
                      <Text style={[s.compareValue, isCheapest && { color: colors.green }]}>
                        {formatMoney(r.cost.perMonth, currency, { decimals: 0 })}
                      </Text>
                    </View>
                    <View style={s.compareTrack}>
                      <View
                        style={[
                          s.compareFill,
                          { width: `${width}%`, backgroundColor: isCheapest ? colors.green : withAlpha(colors.accent, 0.55) },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
          <Text style={s.compareNote}>
            Same calories, different formats — wet food is mostly water, so it always weighs more and usually costs more.
            Cheapest is not automatically right: which format suits {pet.name} is decided further up this page.
          </Text>
        </View>
      ) : null}

      <KeyboardDoneAccessory />

      <Sheet open={currencyOpen} onClose={() => setCurrencyOpen(false)}>
        <SheetTitle>Currency</SheetTitle>
        <SheetSubtitle>Used everywhere food costs are shown. Stored on this device only.</SheetSubtitle>
        <View style={s.currencyList}>
          {CURRENCIES.map((c) => {
            const on = c.code === currency;
            return (
              <PressableScale
                key={c.code}
                onPress={() => {
                  setCurrency(c.code);
                  setCurrencyOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <View style={[s.currencyRow, on && { backgroundColor: colors.accentSoft }]}>
                  <Text style={s.currencyRowSymbol}>{c.symbol}</Text>
                  <View style={s.currencyRowText}>
                    <Text style={s.currencyRowName}>{c.name}</Text>
                    <Text style={s.currencyRowCode}>{c.code}</Text>
                  </View>
                  {on ? <Icon name="check" size={17} color={colors.accent} strokeWidth={2.6} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

/** One numbered line of the worked example. */
function MathLine({
  colors,
  step,
  text,
  sub,
  last = false,
}: {
  colors: Colors;
  step: string;
  text: string;
  sub: string;
  last?: boolean;
}) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.mathLine, last && { borderBottomWidth: 0 }]}>
      <View style={s.mathStep}>
        <Text style={s.mathStepText}>{step}</Text>
      </View>
      <View style={s.mathText}>
        <Text style={s.mathMain}>{text}</Text>
        <Text style={s.mathSub}>{sub}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { marginTop: 12 },
    head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingHorizontal: 4 },
    headText: { flex: 1, minWidth: 0, gap: 4 },
    headTitle: { fontSize: 24, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
    currencyChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: radius.full,
      backgroundColor: colors.accentSoft,
    },
    currencyChipLabel: { fontSize: 13, fontFamily: font.bold, color: colors.accent },

    formatRail: { gap: 8, paddingHorizontal: 4, paddingTop: 14, paddingBottom: 4 },
    formatTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withAlpha(colors.label, 0.1),
    },
    formatTabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    formatTabLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
    formatTabLabelOn: { color: colors.white },
    formatDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },

    inputCard: {
      marginTop: 14,
      padding: 16,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      ...cardShadow,
    },
    inputLabel: { fontSize: 11.5, fontFamily: font.bold, letterSpacing: 0.9, textTransform: "uppercase", color: colors.label2, marginBottom: 9 },
    priceRow: { flexDirection: "row", alignItems: "stretch", gap: 10 },
    symbolBox: {
      minWidth: 56,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: colors.fill,
      alignItems: "center",
      justifyContent: "center",
    },
    symbolText: { fontSize: 19, fontFamily: font.bold, color: colors.label2 },
    // Money is the biggest thing you type on this screen; the field's type scale
    // says so.
    priceField: { flex: 1, fontSize: 22, fontFamily: font.bold, letterSpacing: -0.4 },

    sizeField: { fontSize: 18, fontFamily: font.semibold },
    unitRow: { marginTop: 10, flexDirection: "row", gap: 7, flexWrap: "wrap" },

    countRow: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    countLabel: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: font.medium, color: colors.label2 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.full, backgroundColor: colors.fill, padding: 3 },
    stepperBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
    stepperValue: { minWidth: 30, textAlign: "center", fontSize: 16, fontFamily: font.bold, color: colors.label },

    advancedToggle: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 34 },
    advancedToggleLabel: { fontSize: 13.5, fontFamily: font.semibold, color: colors.accent },
    advancedBody: { marginTop: 4, gap: 12 },
    advancedHint: { fontSize: 13, fontFamily: font.regular, lineHeight: 19, color: colors.label2 },
    kcalRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    kcalField: { width: 110, fontSize: 17, fontFamily: font.semibold },
    kcalUnit: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },

    result: { marginTop: 16, borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4, overflow: "hidden" },
    horizonRow: { flexDirection: "row", gap: 4, alignSelf: "flex-start", marginBottom: 6 },
    horizonTab: { minHeight: 30, paddingHorizontal: 11, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
    horizonLabel: { fontSize: 12.5, fontFamily: font.bold, letterSpacing: 0.2 },
    // Wraps rather than clipping: a four-figure yearly total in a three-glyph
    // currency ("MX$28,450") plus its caption can exceed a 375pt panel, and a
    // TextInput won't shrink its own text to fit.
    bigRow: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginTop: 6 },
    // 46/12 against the caption beneath it: the contrast that makes the figure
    // readable at arm's length in a shop.
    bigNumber: { fontSize: 46, lineHeight: 54, fontFamily: font.bold, letterSpacing: -1.6, fontVariant: ["tabular-nums"] },
    bigUnit: { fontSize: 12.5, fontFamily: font.bold, letterSpacing: 0.9, textTransform: "uppercase", paddingBottom: 11 },
    basisLine: { marginTop: 2, marginBottom: 14, fontSize: 13, fontFamily: font.medium },

    packBlock: { paddingTop: 14, paddingBottom: 16, gap: 9 },
    packHeadRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
    packHead: { fontSize: 17, fontFamily: font.bold, letterSpacing: -0.2 },
    packSub: { fontSize: 12.5, fontFamily: font.medium },
    packTrack: { height: 10, borderRadius: 5, overflow: "hidden", position: "relative" },
    packFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 5 },
    // The one-month reference mark; `left` is set inline from the live scale.
    packMark: { position: "absolute", top: -3, bottom: -3, width: 2, borderRadius: 1, marginLeft: -1 },
    packFoot: { fontSize: 12.5, fontFamily: font.regular, lineHeight: 18 },

    valueRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
    valueText: { flex: 1, minWidth: 0, gap: 3 },
    valueLabel: { fontSize: 10.5, fontFamily: font.bold, letterSpacing: 1 },
    valueHint: { fontSize: 12.5, fontFamily: font.regular, lineHeight: 17 },
    valueNumber: { fontSize: 22, fontFamily: font.bold, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },

    empty: {
      marginTop: 16,
      padding: 20,
      borderRadius: radius.xl,
      backgroundColor: colors.accentSoft,
      gap: 8,
    },
    emptyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle: { fontSize: 18, fontFamily: font.bold, letterSpacing: -0.3, color: colors.label },
    emptyBody: { fontSize: 14, fontFamily: font.regular, lineHeight: 21, color: colors.label2 },
    emptyBasis: { marginTop: 2, fontSize: 12, fontFamily: font.medium, color: colors.label3 },

    mathToggle: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 4 },
    mathToggleLabel: { fontSize: 13.5, fontFamily: font.semibold, color: colors.label2 },
    mathCard: { borderRadius: radius.md, backgroundColor: colors.fill, paddingHorizontal: 14 },
    mathLine: {
      flexDirection: "row",
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.sep,
    },
    mathStep: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginTop: 1 },
    mathStepText: { fontSize: 11.5, fontFamily: font.bold, color: colors.label2 },
    mathText: { flex: 1, minWidth: 0, gap: 3 },
    mathMain: { fontSize: 14, fontFamily: font.semibold, color: colors.label, lineHeight: 20 },
    mathSub: { fontSize: 12.5, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },

    compare: { marginTop: 26, paddingHorizontal: 4, gap: 14 },
    compareRows: { gap: 14 },
    compareRow: { gap: 7 },
    compareHead: { flexDirection: "row", alignItems: "center", gap: 7 },
    compareName: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: font.semibold, color: colors.label },
    compareValue: { fontSize: 15, fontFamily: font.bold, color: colors.label, fontVariant: ["tabular-nums"] },
    compareTrack: { height: 8, borderRadius: 4, backgroundColor: colors.fill, overflow: "hidden" },
    compareFill: { height: "100%", borderRadius: 4 },
    compareNote: { fontSize: 12.5, fontFamily: font.regular, lineHeight: 18, color: colors.label3 },

    currencyList: { marginTop: 18, gap: 2 },
    currencyRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 52, paddingHorizontal: 12, borderRadius: radius.md },
    currencyRowSymbol: { width: 40, fontSize: 17, fontFamily: font.bold, color: colors.label },
    currencyRowText: { flex: 1, minWidth: 0 },
    currencyRowName: { fontSize: 15, fontFamily: font.medium, color: colors.label },
    currencyRowCode: { fontSize: 12, fontFamily: font.regular, color: colors.label3, marginTop: 1 },
  });
