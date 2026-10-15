import { Redirect } from "expo-router";
import { MascotGallery } from "@/components/mascot";

/**
 * Dev-only mascot gallery (Home greeting long-press). Not in the route guard, so
 * the __DEV__ check here is what keeps it out of release builds.
 */
export default function DevMascot() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <MascotGallery />;
}
