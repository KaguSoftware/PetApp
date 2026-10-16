import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
};

export const params: { current: Record<string, string | string[] | undefined> } = { current: {} };

type Kids = { children?: React.ReactNode };
const Pass = ({ children }: Kids) => <>{children}</>;

const textOf = (node: React.ReactNode): string =>
  React.Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
    .join("");

/** Native header title: rendered as text so tests can read the large title. */
const ScreenMock = ({ options, children }: { options?: { title?: string }; children?: React.ReactNode }) => (
  <>
    {options?.title ? <Text accessibilityRole="header">{options.title}</Text> : null}
    {children}
  </>
);

/**
 * Stack.Toolbar stand-ins: menus render inline (inline sections show their title) and every
 * MenuAction is a pressable "menuitem" with a checked state, so tests can drive native menus.
 */
const ToolbarMenu = ({ title, inline, accessibilityLabel, children }: Kids & { title?: string; inline?: boolean; accessibilityLabel?: string }) => (
  <View accessibilityLabel={inline ? undefined : (accessibilityLabel ?? title)} testID={inline ? undefined : "toolbar-menu"}>
    {inline && title ? <Text>{title}</Text> : null}
    {children}
  </View>
);
const ToolbarMenuAction = ({ children, onPress, isOn }: Kids & { onPress?: () => void; isOn?: boolean }) => (
  <Pressable accessibilityRole="menuitem" accessibilityLabel={textOf(children)} accessibilityState={{ checked: !!isOn }} onPress={onPress}>
    <Text>{children}</Text>
  </Pressable>
);
const ToolbarButton = ({ onPress, accessibilityLabel }: { onPress?: () => void; accessibilityLabel?: string }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} />
);
const Toolbar = Object.assign(({ children }: Kids) => <>{children}</>, { Menu: ToolbarMenu, MenuAction: ToolbarMenuAction, Button: ToolbarButton, Icon: () => null, Label: () => null });

const SearchBar = ({ placeholder, onChangeText }: { placeholder?: string; onChangeText?: (e: { nativeEvent: { text: string } }) => void }) => (
  <TextInput placeholder={placeholder} accessibilityLabel={placeholder} onChangeText={(text) => onChangeText?.({ nativeEvent: { text } })} />
);

const Stack = Object.assign(({ children }: Kids) => <>{children}</>, { Screen: ScreenMock, Protected: Pass, Toolbar, SearchBar, Title: () => null });
const Tabs = Object.assign(({ children }: Kids) => <>{children}</>, { Screen: () => null });

export const routerMock = {
  router,
  useRouter: () => router,
  useLocalSearchParams: () => params.current,
  useGlobalSearchParams: () => params.current,
  usePathname: () => "/",
  useSegments: () => [],
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => jest.fn()), canGoBack: () => true }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(cb, []);
  },
  Redirect: ({ href }: { href: string }) => <Text testID="redirect">{`redirect:${String(href)}`}</Text>,
  Link: ({ children }: Kids) => <>{children}</>,
  Stack,
  Tabs,
  Slot: Pass,
};
