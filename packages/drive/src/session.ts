/**
 * The Drive session: booting the saved drive, onboarding, opening a new or
 * imported drive, and the open workspace. Every request carries a tag, and
 * only the request that is still current may finish.
 */
export type SessionState<Host> =
  | { status: "booting"; request: number }
  | { status: "failed" }
  | { status: "welcome" }
  | { status: "opening"; request: number }
  | { status: "open"; host: Host }
  /**
   * The open drive closed under the workspace, as after a SQLite worker
   * crash. The workspace stays, so unsaved text can be copied, until the
   * drive reopens.
   */
  | { status: "lost"; host: Host };

export type SessionEvent<Host> =
  /** Boots the drive saved in this browser, on mount and on retry. */
  | { type: "boot"; request: number }
  /** The saved drive opened, or `null` when none is saved. */
  | { type: "booted"; request: number; host: Host | null }
  | { type: "bootFailed"; request: number }
  /** Creates or imports a drive from onboarding. */
  | { type: "start"; request: number }
  | { type: "started"; request: number; host: Host | null }
  | { type: "startFailed"; request: number }
  /** The host closed on its own. */
  | { type: "closed"; host: Host };

const pending = <Host>(
  state: SessionState<Host>,
  status: "booting" | "opening",
  request: number,
) => state.status === status && state.request === request;

export function transition<Host>(
  state: SessionState<Host>,
  event: SessionEvent<Host>,
): SessionState<Host> {
  switch (event.type) {
    case "boot":
      return { status: "booting", request: event.request };
    case "booted":
      if (!pending(state, "booting", event.request)) return state;
      return event.host
        ? { status: "open", host: event.host }
        : { status: "welcome" };
    case "bootFailed":
      return pending(state, "booting", event.request)
        ? { status: "failed" }
        : state;
    case "start":
      // Onboarding is the only place a drive can be created or imported.
      return state.status === "welcome"
        ? { status: "opening", request: event.request }
        : state;
    case "started":
      if (!pending(state, "opening", event.request)) return state;
      return event.host
        ? { status: "open", host: event.host }
        : { status: "welcome" };
    case "startFailed":
      return pending(state, "opening", event.request)
        ? { status: "welcome" }
        : state;
    case "closed":
      return state.status === "open" && state.host === event.host
        ? { status: "lost", host: event.host }
        : state;
    default:
      return assertNever(event);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled session event: ${JSON.stringify(value)}`);
}
