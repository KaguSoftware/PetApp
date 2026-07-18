import { Redirect } from "expo-router";

/** "/" has no screen of its own — land on the Home tab. */
export default function Index() {
  return <Redirect href="/home" />;
}
