/* Render-smoke-test environment, loaded only by the "screens" jest project (see jest.config.js). */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("react-native-reanimated", () => {
  // Reanimated 4's official mock (react-native-reanimated/mock) lacks a few APIs this app uses.
  const mock = require("react-native-reanimated/mock");
  const identity = (v) => v;
  const extras = {
    useReducedMotion: () => false,
    useAnimatedReaction: () => undefined,
    withDecay: identity,
    cancelAnimation: () => undefined,
    runOnJS: (fn) => fn,
  };
  const patched = { ...mock };
  for (const [k, v] of Object.entries(extras)) if (patched[k] === undefined) patched[k] = v;
  return { ...patched, __esModule: true, default: patched.default ?? patched };
});
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));
jest.mock("expo-linking", () => ({
  createURL: jest.fn((p) => `peting://${p}`),
  openURL: jest.fn(),
  useURL: jest.fn(() => null),
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn(() => ({})),
}));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true), getStringAsync: jest.fn(async () => "") }));
jest.mock("expo-constants", () => ({ __esModule: true, default: { appOwnership: null, expoConfig: { extra: {} }, executionEnvironment: "bare" } }));
jest.mock("expo-crypto", () => {
  let n = 0;
  return {
    randomUUID: jest.fn(() => `uuid-${++n}`),
    digestStringAsync: jest.fn(async () => "hash"),
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  };
});
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(async () => false),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(), openAuthSessionAsync: jest.fn(), maybeCompleteAuthSession: jest.fn() }));
jest.mock("expo-font", () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: jest.fn(async () => undefined) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@/lib/supabase", () => {
  const sub = { data: { subscription: { unsubscribe: jest.fn() } } };
  return {
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null } })),
        getUser: jest.fn(async () => ({ data: { user: { email: "me@example.com", identities: [] } } })),
        onAuthStateChange: jest.fn(() => sub),
        updateUser: jest.fn(async () => ({ error: null })),
        signOut: jest.fn(async () => ({ error: null })),
      },
      functions: { invoke: jest.fn(async () => ({ error: null })) },
    },
  };
});
jest.mock("@/lib/auth", () => {
  const ok = jest.fn(async () => ({ error: null }));
  return {
    isAppleSignInAvailable: jest.fn(async () => false),
    signInWithApple: ok,
    signInWithGoogle: ok,
    signInWithEmail: ok,
    signUpWithEmail: jest.fn(async () => ({ error: null, needsVerification: true })),
    verifyEmailOtp: ok,
    requestPasswordReset: ok,
    resendCode: ok,
    completeEmailLink: jest.fn(async () => ({ error: null })),
    getConnectedIdentities: jest.fn(async () => []),
    linkGoogle: ok,
    unlinkIdentity: ok,
  };
});
jest.mock("expo-router", () => require("./__tests__/screens/_support/routerMock").routerMock);
jest.mock("@/data", () => require("./__tests__/screens/_support/fakeData").fakeDataModule);
require("react-native-gesture-handler/jestSetup");

// Native menu / date picker: the menu renders its trigger plus every action as a pressable so tests can pick options.
jest.mock("@expo/ui/community/menu", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const flatten = (actions) => actions.flatMap((a) => (a.subactions ? flatten(a.subactions) : [a]));
  const MenuView = ({ actions, onPressAction, children }) =>
    React.createElement(
      View,
      null,
      children,
      flatten(actions).map((a) =>
        React.createElement(
          Pressable,
          {
            key: a.id ?? a.title,
            accessibilityRole: "menuitem",
            accessibilityLabel: a.title,
            accessibilityState: { checked: a.state === "on" },
            onPress: () => onPressAction?.({ nativeEvent: { event: a.id ?? a.title } }),
          },
          React.createElement(Text, null, a.title),
        ),
      ),
    );
  return { __esModule: true, default: MenuView, MenuView };
});
jest.mock("@expo/ui/community/datetime-picker", () => {
  const React = require("react");
  const { View } = require("react-native");
  const DateTimePicker = ({ testID, mode }) => React.createElement(View, { testID: testID ?? `datetime-${mode ?? "date"}` });
  return { __esModule: true, default: DateTimePicker, DateTimePicker };
});
