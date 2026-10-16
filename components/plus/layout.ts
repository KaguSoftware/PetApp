import { Platform } from "react-native";

/** Diameter of the floating + button (and the matching close button in the panel). */
export const PLUS_SIZE = 58;
/** Gap from the screen's right edge and above the tab bar. */
export const PLUS_MARGIN = 16;

/**
 * expo-router 57's NativeTabs exposes no tab-bar-height hook (the bar is a real
 * UITabBarController / BottomNavigationView), so this is a platform constant:
 * iOS bar content is 49pt, Material 3's navigation bar is 80dp. The home-indicator /
 * nav-bar inset is added separately by `plusBottom`.
 */
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 80, default: 0 });

/** Distance from the bottom of the screen to the bottom edge of the + button. */
export function plusBottom(insetBottom: number): number {
  return insetBottom + TAB_BAR_HEIGHT + PLUS_MARGIN;
}
