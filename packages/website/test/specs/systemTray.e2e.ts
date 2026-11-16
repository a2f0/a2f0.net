import { $, browser, expect } from "@wdio/globals";
import { useDesktop, waitForResume } from "../lib/desktop";

const LAYOUT = "Switch to iPad / mobile layout";
const ROUTED_LAYOUT = "Switch to windowed layout";
const THEME = "Switch to Paper theme";

const WINDOWED_TRAY = ".desktop-taskbar-end";
const ROUTED_TRAY = ".routed-pane-taskbar-end";

// The tray apps showing, by their controls' names, start to end.
const trayControls = (tray: string) =>
  browser.execute(
    (selector) =>
      Array.from(
        document.querySelectorAll(`${selector} .system-tray-app button`),
        (button) => button.getAttribute("aria-label"),
      ),
    tray,
  );

const waitForTray = (tray: string, expected: string[]) =>
  browser.waitUntil(
    async () =>
      JSON.stringify(await trayControls(tray)) === JSON.stringify(expected),
    { timeoutMsg: `the tray did not show ${JSON.stringify(expected)}` },
  );

// Right-clicks a tray app and chooses an item from its context menu.
const chooseFromTrayMenu = async (
  tray: string,
  control: string,
  item: string,
) => {
  await $(`${tray} button[aria-label='${control}']`).click({ button: "right" });
  await $(".menu").$(`button=${item}`).click();
};

const storedDisabledApps = () =>
  browser.execute(() => localStorage.getItem("website.systemTray"));

describe("Website system tray", () => {
  useDesktop();

  it("disables an app from its menu, keeps it off across a reload, and turns it back on in Display Properties", async () => {
    await waitForTray(WINDOWED_TRAY, [LAYOUT, THEME]);

    await chooseFromTrayMenu(WINDOWED_TRAY, THEME, "Disable Theme Switch");
    await waitForTray(WINDOWED_TRAY, [LAYOUT]);

    await browser.refresh();
    await waitForResume();
    await waitForTray(WINDOWED_TRAY, [LAYOUT]);

    await chooseFromTrayMenu(WINDOWED_TRAY, LAYOUT, "Display Properties");
    const display = $("section.window:has(.display-properties-window)");
    await expect(display).toBeDisplayed();
    await display.$("label=Theme Switch").click();
    await waitForTray(WINDOWED_TRAY, [LAYOUT, THEME]);
    expect(await storedDisabledApps()).toBe("[]");
  });

  it("turns every app back on with Reset Defaults on the desktop", async () => {
    await chooseFromTrayMenu(WINDOWED_TRAY, LAYOUT, "Display Properties");
    const display = $("section.window:has(.display-properties-window)");
    await expect(display).toBeDisplayed();
    await display.$("label=Layout Switch").click();
    await display.$("label=Theme Switch").click();
    await waitForTray(WINDOWED_TRAY, []);
    expect(JSON.parse((await storedDisabledApps()) ?? "[]")).toEqual([
      "layout",
      "theme",
    ]);

    const reset = display.$("button=Reset Defaults");
    await reset.scrollIntoView();
    await reset.click();
    await waitForTray(WINDOWED_TRAY, [LAYOUT, THEME]);
  });

  it("disables and restores apps in the routed shell's tray", async () => {
    await $(`${WINDOWED_TRAY} button[aria-label='${LAYOUT}']`).click();
    await waitForTray(ROUTED_TRAY, [ROUTED_LAYOUT, THEME]);

    await chooseFromTrayMenu(ROUTED_TRAY, THEME, "Disable Theme Switch");
    await waitForTray(ROUTED_TRAY, [ROUTED_LAYOUT]);

    // The routed launcher lists Display Properties, so the switches stay
    // reachable without the desktop's menus.
    await $("button[aria-label='Expand navigation rail']").click();
    await $(".routed-pane-nav-link[href='/app/display-properties']").click();
    const display = $(".routed-pane-main .display-properties-window");
    await expect(display).toBeDisplayed();
    await display.$("label=Theme Switch").click();
    await waitForTray(ROUTED_TRAY, [ROUTED_LAYOUT, THEME]);

    await display.$("label=Layout Switch").click();
    await display.$("label=Theme Switch").click();
    await waitForTray(ROUTED_TRAY, []);
    const reset = display.$("button=Reset Defaults");
    await reset.scrollIntoView();
    await reset.click();
    await waitForTray(ROUTED_TRAY, [ROUTED_LAYOUT, THEME]);
  });
});
