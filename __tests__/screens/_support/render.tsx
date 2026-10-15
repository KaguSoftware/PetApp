import { act, render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/ui/theme";
import { params, router } from "./routerMock";
import { resetFns, setScenario, type ScenarioName } from "./fakeData";

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

/** Renders under the real ThemeProvider + SafeAreaProvider and waits for the theme's async storage read. */
export async function renderScreen(ui: ReactElement) {
  const utils = render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

/** Scenario + route params + cleared mocks, for a beforeEach. */
export function prepare(scenario: ScenarioName, routeParams: Record<string, string | string[] | undefined> = {}) {
  resetFns();
  Object.values(router).forEach((f) => (f as jest.Mock).mockClear());
  setScenario(scenario);
  params.current = routeParams;
}
