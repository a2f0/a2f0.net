import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Analytics from "../../components/Analytics";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="google-analytics">{gaId}</div>
  ),
}));

const setWebdriver = (value: boolean) =>
  Object.defineProperty(navigator, "webdriver", {
    configurable: true,
    get: () => value,
  });

describe("Analytics", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "webdriver");
  });

  it("loads Google Analytics for visitors", () => {
    setWebdriver(false);
    render(<Analytics gaId="G-TEST" />);
    expect(screen.getByTestId("google-analytics").textContent).toBe("G-TEST");
  });

  it("skips Google Analytics in automated browsers", () => {
    setWebdriver(true);
    render(<Analytics gaId="G-TEST" />);
    expect(screen.queryByTestId("google-analytics")).toBeNull();
  });
});
