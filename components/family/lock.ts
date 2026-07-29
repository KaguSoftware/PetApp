/**
 * Shared unlock state for the three Family screens (Family · Household · Pets).
 *
 * They used to be one route behind one password gate. Now that they're three
 * separate entries in Settings, the unlock has to OUTLIVE any one of them —
 * otherwise Family → back → Household would ask for the same password twice on
 * the way to the same household. It lives in a module rather than React state
 * because each of those screens unmounts on the way out.
 *
 * `lockFamily()` is called by the Settings hub on mount AND on unmount, so an
 * unlock lasts exactly one visit to Settings: entering clears anything a
 * previous route (e.g. the join flow) left open, leaving locks up behind you.
 */

let unlocked = false;

export const isFamilyUnlocked = () => unlocked;

export const unlockFamily = () => {
  unlocked = true;
};

export const lockFamily = () => {
  unlocked = false;
};
