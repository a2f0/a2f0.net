import type { DnbmControls } from "@a2f0/dnbm";
import { useCallback, useSyncExternalStore } from "react";

const ignore = () => undefined;
const noState = () => null;

/**
 * Follows a mounted dnbm app's state, which its instance reports, so the
 * window's chrome can show it and the app's commands as they become
 * available. Null until the app mounts. The instance reports an idle state,
 * with no command available, until the app is ready and once it is destroyed.
 */
export function useDnbmState<State>(
  instance: Pick<DnbmControls<string, State>, "state" | "subscribe"> | null,
): State | null {
  const subscribe = useCallback(
    (onChange: () => void) => instance?.subscribe(onChange) ?? ignore,
    [instance],
  );
  return useSyncExternalStore(
    subscribe,
    () => instance?.state ?? null,
    noState,
  );
}
