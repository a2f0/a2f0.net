import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AccountPanel } from "./AccountPanel";
import type { DriveHost } from "./host";

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterAll(() => GlobalRegistrator.unregister());

test("an unauthenticated saved connection can be paused from the identity dialog", async () => {
  let requested = true;
  const listeners = new Set<() => void>();
  const connect = mock(async () => undefined);
  const disconnect = mock(async () => {
    requested = false;
    for (const listener of listeners) listener();
  });
  const host = {
    apiBaseUrl: "https://api.example.test",
    client: {
      session: { isAuthenticated: false },
      identity: { signingFingerprint: "test-fingerprint" },
    },
    connection: {
      getSnapshot: () => requested,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    connect,
    disconnect,
  } as unknown as DriveHost;
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () =>
      root.render(
        <AccountPanel
          host={host}
          onClose={() => undefined}
          reportError={() => undefined}
        />,
      ),
    );
    const button = element.querySelector<HTMLButtonElement>(".drive-primary");
    expect(button?.textContent).toBe("Pause connection");
    expect(button?.disabled).toBe(false);
    await act(async () => button?.click());
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(connect).not.toHaveBeenCalled();
    expect(button?.textContent).toBe("Connect to Tearleads");
  } finally {
    await act(async () => root.unmount());
    element.remove();
  }
});
