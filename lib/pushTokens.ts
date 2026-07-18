import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Registers this device's Expo push token into push_tokens (migration 0015).
 * No-ops in Expo Go (remote push needs a dev/production build) and on
 * simulators. Safe to call after sign-in on every launch — it upserts.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (Constants.appOwnership === "expo") return; // Expo Go: local notifications only
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return; // set by `eas init` during the EAS cutover
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    await supabase.from("push_tokens").upsert({
      user_id: userId,
      expo_token: token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[petpal] push token registration skipped:", e);
  }
}
