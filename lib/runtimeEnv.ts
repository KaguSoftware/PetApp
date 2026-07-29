import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * True when the app is running inside the Expo Go client.
 *
 * Use this instead of `Constants.appOwnership === "expo"`. appOwnership is
 * DEPRECATED as of SDK 53 and is no longer a reliable Expo Go signal on SDK 54
 * — it reads back null/undefined in Expo Go, so the old comparison silently
 * evaluates false. Anything gated behind it (native-module guards, redirect-URL
 * selection, push-token registration) then takes the dev-build branch inside
 * Expo Go, which is how a `require()` of a native-only module reaches Metro and
 * crashes the client at startup.
 *
 * `executionEnvironment` is the documented replacement:
 *   StoreClient -> Expo Go
 *   Standalone  -> a built app (EAS / TestFlight / store)
 *   Bare        -> bare workflow
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
