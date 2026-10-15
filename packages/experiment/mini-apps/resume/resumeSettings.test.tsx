import { afterAll, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { ThemeProvider, ThemeSwitch } from "@tearleads/windowing";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { EXPERIMENT_THEMES } from "../../components/themes";
import { useResumeSettings } from "./resumeSettings";
import { DARK, LIGHT } from "./useResumeMenus";

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterAll(() => GlobalRegistrator.unregister());

test("the resume follows the desktop and retains each scheme's page choice and scale", async () => {
  let settings: ReturnType<typeof useResumeSettings> | undefined;
  function Page() {
    settings = useResumeSettings();
    return null;
  }
  const current = () => {
    if (!settings) throw new Error("The page did not mount");
    return settings;
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (pageKey: string) =>
    act(() =>
      root.render(
        <ThemeProvider
          themes={EXPERIMENT_THEMES}
          defaultTheme="graphite"
          storageKey="resume-test.theme"
        >
          <Page key={pageKey} />
          <ThemeSwitch />
        </ThemeProvider>,
      ),
    );
  const switchTheme = () =>
    act(() => container.querySelector("button")?.click());
  try {
    await render("windowed");
    expect(current().colors).toEqual(DARK);
    expect(current().scale).toBe(1);
    await switchTheme();
    expect(current().colors).toEqual(LIGHT);
    await act(() => {
      current().setColors(DARK);
      current().setScale(1.5);
    });
    await switchTheme();
    expect(current().colors).toEqual(DARK);
    expect(current().scale).toBe(1.5);
    await act(() => current().setColors(LIGHT));
    await switchTheme();
    expect(current().colors).toEqual(DARK);
    await switchTheme();
    expect(current().colors).toEqual(LIGHT);
    await render("routed");
    expect(current().colors).toEqual(LIGHT);
    expect(current().scale).toBe(1.5);
  } finally {
    await act(() => root.unmount());
    container.remove();
    localStorage.removeItem("resume-test.theme");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-scheme");
  }
});
