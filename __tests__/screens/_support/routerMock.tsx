import React from "react";
import { Text } from "react-native";

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

const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const Stack = Object.assign(Pass, { Screen: () => null });
const Tabs = Object.assign(Pass, { Screen: () => null });

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
  Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Stack,
  Tabs,
  Slot: Pass,
};
