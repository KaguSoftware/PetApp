# Mascot

The user's own pet as a cartoon. Fully vector (`react-native-svg`), animated with Reanimated on the UI thread (no React state in the animation path).

```tsx
<Mascot species="dog" mood="happy" reaction={{ type: 'eat', key: n }} size={260} tint="#E8B07A" />
<MascotStage species="cat" mood="sleepy" bubble={<SpeechBubble>zzz</SpeechBubble>} />
```

## Props (`Mascot`)
- `species`: `"dog"`, `"cat"`, anything else renders the generic critter.
- `mood`: `happy | content | hungry | thirsty | restless | sleepy | grumpy` (default `content`).
- `reaction`: `{ type: 'eat' | 'drink' | 'bounce' | 'love' | 'wiggle', key }`. Bump `key` to replay. The key present at mount does not play.
- `size` (px, square), `tint` (fur colour; shades derive from it), `showThought`, `animated` (false = no idle loops).
- Reduce motion (system setting) or `animated={false}`: no idle loops; reactions become a quick fade/scale.

`MascotStage` adds the pastel room (`background`, `rug`, `height`) and a bubble slot top-right (`bubble` or `children`).
`MascotGallery` is a dev screen showing every species x mood plus reaction buttons.

## Layers (back to front)
tail (pivot sway) > body (breathing) > head view { head+ears+brows, open eyes, closed eyes (blink / ^^ / sleep), mouth, chew mouth, lap tongue } > thought bubble > hearts / Zzz.
Each is its own `Svg` inside an `Animated.View`, so animation = transform/opacity only.

## Adding a species
1. Create `species/<name>.tsx` exporting a `SpeciesArt` (see `species/types.ts`): `Tail`, `Body`, `Head` components drawn in a **200x200 viewBox**, plus `face` (eye/mouth/cheek placement), `tail` pivot/amp/ms.
2. Register it in `species/index.ts`, extend `SpeciesKey` + `speciesKey()` in `types.ts`, and add a default fur in `palette.ts` (`DEFAULT_FUR`).
3. Eyes, brows, mouth, blush and all moods come from `face.tsx` for free. `Head` should include nose, cheeks (`<Cheeks />`) and ears; leave eyes/mouth out.

## Art rules
- Chunky, round. Head about as big as the body. Feet at y~195, head top ~y40, leave air for hop and thought bubble.
- Outline: `OUT` = 5 units, same-hue dark (`palette.outline`), round caps and joins. Never pure black.
- Flat fills, ONE soft white highlight per big shape (`Highlight`), pink blush on every face.
- Eyes are big dark ovals with two white glints. Moods are cute, never sad or sick: grumpy is a pout, hungry is a tiny "o", thirsty is a tongue plus a drop.
- Derive every colour from `Palette` so `tint` works.
