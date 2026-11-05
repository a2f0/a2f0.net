import { expect, test } from "bun:test";
import { type SessionEvent, type SessionState, transition } from "./session";

type Host = { id: string };
type State = SessionState<Host>;
type Event = SessionEvent<Host>;

const host: Host = { id: "host" };
const booting: State = { status: "booting", request: 1 };
const opening: State = { status: "opening", request: 2 };
const failed: State = { status: "failed" };
const welcome: State = { status: "welcome" };
const open: State = { status: "open", host };

test.each<[State, Event, State]>([
  // Booting the saved drive.
  [welcome, { type: "boot", request: 3 }, { status: "booting", request: 3 }],
  [failed, { type: "boot", request: 3 }, { status: "booting", request: 3 }],
  [booting, { type: "boot", request: 3 }, { status: "booting", request: 3 }],
  [booting, { type: "booted", request: 1, host }, open],
  [booting, { type: "booted", request: 1, host: null }, welcome],
  [booting, { type: "bootFailed", request: 1 }, failed],
  // Opening a new or imported drive from onboarding.
  [welcome, { type: "start", request: 2 }, opening],
  [opening, { type: "started", request: 2, host }, open],
  [opening, { type: "started", request: 2, host: null }, welcome],
  [opening, { type: "startFailed", request: 2 }, welcome],
])("%o + %o", (state, event, next) => {
  expect(transition(state, event)).toEqual(next);
});

test.each<[State, Event]>([
  // A request that is not the current one never finishes the session.
  [booting, { type: "booted", request: 9, host }],
  [booting, { type: "bootFailed", request: 9 }],
  [opening, { type: "started", request: 9, host }],
  [opening, { type: "startFailed", request: 9 }],
  // A boot result cannot finish a start, nor a start result a boot.
  [opening, { type: "booted", request: 2, host }],
  [opening, { type: "bootFailed", request: 2 }],
  [booting, { type: "started", request: 1, host }],
  [booting, { type: "startFailed", request: 1 }],
  // Only onboarding starts a drive.
  [booting, { type: "start", request: 5 }],
  [opening, { type: "start", request: 5 }],
  [failed, { type: "start", request: 5 }],
  [open, { type: "start", request: 5 }],
  // Results arriving after the session settled are ignored.
  [open, { type: "booted", request: 1, host: null }],
  [open, { type: "bootFailed", request: 1 }],
  [failed, { type: "booted", request: 1, host }],
  [welcome, { type: "startFailed", request: 2 }],
])("ignores %o + %o", (state, event) => {
  expect(transition(state, event)).toBe(state);
});

test("a superseded boot cannot finish the boot that replaced it", () => {
  const events: Event[] = [
    { type: "boot", request: 1 },
    { type: "boot", request: 2 },
    { type: "bootFailed", request: 1 },
    { type: "booted", request: 1, host },
  ];
  expect(events.reduce<State>(transition, welcome)).toEqual({
    status: "booting",
    request: 2,
  });
});

test("a start abandoned by a retry cannot open the drive", () => {
  const events: Event[] = [
    { type: "start", request: 1 },
    { type: "startFailed", request: 1 },
    { type: "start", request: 2 },
    { type: "started", request: 1, host },
  ];
  expect(events.reduce<State>(transition, welcome)).toEqual({
    status: "opening",
    request: 2,
  });
});
