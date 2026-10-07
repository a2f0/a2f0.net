import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  useWindowActions,
  useWindowStateData,
  type WindowEntry,
  type WindowStateActions,
  WindowStateProvider,
} from "@tearleads/windowing";
import { act, type ComponentType, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MiniAppWindow } from "./MiniAppWindow";
import { EM_SPACE } from "./shared/menuLabels";
import type { MiniAppId, MiniAppProps } from "./types";

const ignore = () => undefined;

type State = Readonly<{
  available: Readonly<Record<string, boolean>>;
  [field: string]: unknown;
}>;

// A stand-in for one mounted dnbm app: the test settles its `ready`, sets its
// state, and reads the commands the window ran.
interface FakeInstance {
  container: HTMLElement;
  options: Record<string, unknown>;
  destroyed: boolean;
  listeners: Set<() => void>;
  runs: string[];
  state: State;
  publish: (patch: Partial<State>) => void;
  resolve: () => void;
  reject: (reason: Error) => void;
}

const unavailable = (commands: string[]) =>
  Object.fromEntries(commands.map((command) => [command, false]));

const SEQUENCER_COMMANDS = [
  "play",
  "stop",
  "togglePlay",
  "new",
  "open",
  "save",
  "saveAs",
  "export",
  "undo",
  "redo",
];
const PLAYER_COMMANDS = [
  "play",
  "pause",
  "togglePlay",
  "stop",
  "previous",
  "next",
  "toggleShuffle",
  "toggleRepeat",
];

const SEQUENCER_IDLE: State = {
  playing: false,
  title: "",
  fileName: "",
  dirty: false,
  available: unavailable(SEQUENCER_COMMANDS),
};
const PLAYER_IDLE: State = {
  playing: false,
  paused: false,
  title: "",
  shuffle: false,
  repeat: false,
  available: unavailable(PLAYER_COMMANDS),
};

// The sequencer's state once it is ready and stopped with nothing to undo.
const SEQUENCER_READY: Partial<State> = {
  title: "Undertow",
  fileName: "undertow.dnbm.json",
  available: {
    ...unavailable(SEQUENCER_COMMANDS),
    play: true,
    togglePlay: true,
    new: true,
    open: true,
    save: true,
    saveAs: true,
    export: true,
  },
};
// The player's state once it is ready with its songs, and stopped.
const PLAYER_READY: Partial<State> = {
  title: "Bathyal",
  available: {
    ...unavailable(PLAYER_COMMANDS),
    play: true,
    togglePlay: true,
    previous: true,
    next: true,
    toggleShuffle: true,
    toggleRepeat: true,
  },
};

let instances: FakeInstance[] = [];

const mountFake =
  (idle: State) =>
  (container: HTMLElement, options: Record<string, unknown>) => {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const instance: FakeInstance = {
      container,
      options,
      destroyed: false,
      listeners: new Set(),
      runs: [],
      state: idle,
      publish(patch) {
        instance.state = Object.freeze({ ...instance.state, ...patch });
        for (const listener of [...instance.listeners]) listener();
      },
      resolve,
      reject,
    };
    instances.push(instance);
    const element = document.createElement("div");
    container.append(element);
    return {
      element,
      ready: promise,
      get state() {
        return instance.state;
      },
      // Unlike the package, a destroyed fake keeps its listeners, so the tests
      // see whether the app unsubscribed.
      subscribe(listener: () => void) {
        const entry = () => listener();
        instance.listeners.add(entry);
        return () => {
          instance.listeners.delete(entry);
        };
      },
      run(command: string) {
        if (instance.destroyed || !instance.state.available[command]) {
          return false;
        }
        instance.runs.push(command);
        return true;
      },
      destroy() {
        instance.destroyed = true;
        instance.state = idle;
        element.remove();
      },
    };
  };

mock.module("@a2f0/dnbm", () => ({
  mountDnbm: mountFake(SEQUENCER_IDLE),
  mountDnbmPlayer: mountFake(PLAYER_IDLE),
}));

const { DnbmApp } = await import("./dnbm/DnbmApp");
const { DnbmPlayerApp } = await import("./dnbm-player/DnbmPlayerApp");

const APPS: [string, MiniAppId, string, ComponentType<MiniAppProps>][] = [
  ["sequencer", "dnbm", "dnbm", DnbmApp],
  ["player", "dnbm-player", "dnbm player", DnbmPlayerApp],
];

// Lets a settled `ready` deliver its callbacks.
const settle = () => act(() => Promise.resolve());

const current = () => {
  const instance = instances.at(-1);
  if (!instance) throw new Error("No app mounted");
  return instance;
};

/**
 * Opens the app in a window on a desktop of its own, in Strict Mode, as the
 * experiment does in development.
 */
const render = async (
  App: ComponentType<MiniAppProps>,
  appId: MiniAppId,
  title: string,
) => {
  const onLoad = mock(ignore);
  let actions: WindowStateActions | undefined;
  let windows: WindowEntry[] = [];
  function Desktop() {
    actions = useWindowActions();
    windows = useWindowStateData().windows;
    return windows.map((entry) => (
      <MiniAppWindow key={entry.id} windowId={entry.id} />
    ));
  }
  function Content() {
    return <App onLoad={onLoad} />;
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() =>
    root.render(
      <StrictMode>
        <WindowStateProvider>
          <Desktop />
        </WindowStateProvider>
      </StrictMode>,
    ),
  );
  if (!actions) throw new Error("The desktop did not render");
  const { close, create, minimize, restore } = actions;
  let id = "";
  await act(() => {
    id = create(title, 0, 0, Content, { appId });
  });

  const section = () => {
    const found = container.querySelector<HTMLElement>("section.window");
    if (!found) throw new Error("The window is not showing");
    return found;
  };
  const button = (name: string, scope: ParentNode = section()) => {
    const match = [...scope.querySelectorAll("button")].find(
      (candidate) =>
        candidate.textContent?.trim() === name ||
        candidate.getAttribute("aria-label") === name,
    );
    if (!match) throw new Error(`No button named ${name}`);
    return match;
  };
  const dropdown = () =>
    section().querySelector<HTMLElement>(".window-menubar-dropdown");
  // A menu's items as the window shows them, with the menu then closed.
  const menu = async (name: "File" | "View") => {
    await act(() => button(name).click());
    const items = [
      ...(dropdown()?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ].map((item) => ({ label: item.textContent, disabled: item.disabled }));
    await act(() => button(name).click());
    return items;
  };
  // Presses a toolbar action or menu item, returning the commands it ran
  // during the press itself, as a file picker needs.
  const press = async (target: () => HTMLElement) => {
    const instance = current();
    let ran: string[] = [];
    await act(() => {
      const before = instance.runs.length;
      target().click();
      ran = instance.runs.slice(before);
    });
    return ran;
  };
  const choose = async (name: "File" | "View", item: string) => {
    await act(() => button(name).click());
    return press(() => {
      const found = dropdown();
      if (!found) throw new Error(`The ${name} menu did not open`);
      return button(item, found);
    });
  };
  const toolbar = () =>
    [
      ...section().querySelectorAll<HTMLButtonElement>(
        ".window-toolbar-actions button",
      ),
    ].map((action) => ({
      label: action.getAttribute("aria-label"),
      disabled: action.disabled,
      pressed: action.getAttribute("aria-pressed"),
    }));
  const publish = (patch: Partial<State>) =>
    act(() => current().publish(patch));

  return {
    choose,
    close: () => act(() => close(id)),
    menu,
    minimize: () => act(() => minimize(id)),
    onLoad,
    press,
    publish,
    restore: () => act(() => restore(id)),
    title: () => windows.find((entry) => entry.id === id)?.title,
    titleBar: () =>
      section().querySelector(".window-titlebar-title")?.textContent,
    toolbar,
    toolbarButton: (label: string) => () =>
      button(label, section().querySelector(".window-toolbar") ?? section()),
    unmount: async () => {
      await act(() => root.unmount());
      container.remove();
    },
  };
};

beforeAll(() => {
  GlobalRegistrator.register();
  // happy-dom has no ResizeObserver; the window layer observes its surface.
  globalThis.ResizeObserver ??= class {
    disconnect = ignore;
    observe = ignore;
    unobserve = ignore;
  };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  instances = [];
});

for (const [name, appId, title, App] of APPS) {
  test(`the ${name} mounts without its own action buttons and reports loaded once ready`, async () => {
    const { onLoad, unmount } = await render(App, appId, title);

    // Strict Mode mounts, destroys, and mounts again into the same host.
    expect(instances).toHaveLength(2);
    const [first, second] = instances;
    if (!first || !second) throw new Error("The app did not mount twice");
    expect(first.destroyed).toBe(true);
    expect(second.destroyed).toBe(false);
    expect(second.container).toBe(first.container);
    // The window's menus and toolbar take the place of the app's buttons.
    expect(second.options).toEqual({ assetsUrl: "/dnbm/", actions: false });
    // Only the live instance is followed.
    expect(first.listeners.size).toBe(0);
    expect(second.listeners.size).toBe(1);
    expect(onLoad).not.toHaveBeenCalled();

    // A destroyed instance never fits the window, even if it was ready.
    first.resolve();
    await settle();
    expect(onLoad).not.toHaveBeenCalled();

    second.resolve();
    await settle();
    expect(onLoad).toHaveBeenCalledTimes(1);

    await unmount();
    expect(second.destroyed).toBe(true);
    expect(second.listeners.size).toBe(0);
  });

  test(`the ${name} reports loaded when it can't start`, async () => {
    const { onLoad, unmount } = await render(App, appId, title);
    current().reject(new Error("Couldn't load the assets."));
    await settle();
    // The window fits to the app, which shows why it couldn't start.
    expect(onLoad).toHaveBeenCalledTimes(1);
    await unmount();
  });

  test(`the ${name} stays quiet once unmounted`, async () => {
    const { onLoad, unmount } = await render(App, appId, title);
    const instance = current();
    await unmount();
    expect(instance.destroyed).toBe(true);
    instance.resolve();
    await settle();
    expect(onLoad).not.toHaveBeenCalled();
  });
}

test("the sequencer's File menu runs its file commands while it takes them", async () => {
  const { choose, menu, publish, unmount } = await render(
    DnbmApp,
    "dnbm",
    "dnbm",
  );
  const fileMenu = (disabled: boolean) => [
    { label: "New", disabled },
    { label: "Open…", disabled },
    { label: "Save", disabled },
    { label: "Save As…", disabled },
    { label: "Export WAV…", disabled },
    { label: "Close", disabled: false },
  ];
  // Until the sequencer is ready, it takes no command.
  expect(await menu("File")).toEqual(fileMenu(true));

  await publish(SEQUENCER_READY);
  expect(await menu("File")).toEqual(fileMenu(false));
  // Each item runs its command inside the press, so a file picker keeps the
  // press's activation.
  expect(await choose("File", "New")).toEqual(["new"]);
  expect(await choose("File", "Open…")).toEqual(["open"]);
  expect(await choose("File", "Save")).toEqual(["save"]);
  expect(await choose("File", "Save As…")).toEqual(["saveAs"]);
  expect(await choose("File", "Export WAV…")).toEqual(["export"]);

  // While the sequencer asks something in a dialog, it takes none.
  await publish({ available: unavailable(SEQUENCER_COMMANDS) });
  expect(await menu("File")).toEqual(fileMenu(true));
  await publish(SEQUENCER_READY);
  expect(await menu("File")).toEqual(fileMenu(false));
  await unmount();
});

test("the sequencer's toolbar and View menu play, stop, undo, and redo", async () => {
  const { choose, menu, press, publish, toolbar, toolbarButton, unmount } =
    await render(DnbmApp, "dnbm", "dnbm");
  const action = (label: string, disabled: boolean) => ({
    label,
    disabled,
    pressed: null,
  });
  expect(toolbar()).toEqual([
    action("Play", true),
    action("Undo", true),
    action("Redo", true),
  ]);

  await publish(SEQUENCER_READY);
  expect(toolbar()).toEqual([
    action("Play", false),
    action("Undo", true),
    action("Redo", true),
  ]);
  expect(await press(toolbarButton("Play"))).toEqual(["togglePlay"]);

  // Playing, the same action stops, in the toolbar and the View menu.
  await publish({
    playing: true,
    available: { ...SEQUENCER_READY.available, play: false, stop: true },
  });
  expect(toolbar()[0]).toEqual(action("Stop", false));
  expect((await menu("View"))[0]).toEqual({ label: "Stop", disabled: false });
  expect(await choose("View", "Stop")).toEqual(["togglePlay"]);
  expect(await press(toolbarButton("Stop"))).toEqual(["togglePlay"]);

  // An edit can be undone, and an undone edit redone.
  await publish({
    playing: false,
    available: { ...SEQUENCER_READY.available, undo: true, redo: true },
  });
  expect(toolbar()).toEqual([
    action("Play", false),
    action("Undo", false),
    action("Redo", false),
  ]);
  expect((await menu("View"))[0]).toEqual({ label: "Play", disabled: false });
  expect(await press(toolbarButton("Undo"))).toEqual(["undo"]);
  expect(await press(toolbarButton("Redo"))).toEqual(["redo"]);
  await unmount();
});

test("the sequencer's window names its song, marked while it has unsaved changes", async () => {
  const { close, minimize, publish, restore, title, titleBar, unmount } =
    await render(DnbmApp, "dnbm", "dnbm");
  // Until it is ready, the window shows the app's name.
  expect(titleBar()).toBe("dnbm");

  await publish(SEQUENCER_READY);
  expect(titleBar()).toBe("Undertow — dnbm");
  await publish({ dirty: true });
  expect(titleBar()).toBe("● Undertow — dnbm");
  await publish({ dirty: false, title: "Night Bus" });
  expect(titleBar()).toBe("Night Bus — dnbm");

  // Minimized, the app unmounts, and its taskbar button shows the app's name.
  const first = current();
  await minimize();
  expect(first.destroyed).toBe(true);
  expect(first.listeners.size).toBe(0);
  expect(title()).toBe("dnbm");

  // Restored, a new sequencer mounts, and the window follows it alone.
  await restore();
  const second = current();
  expect(second).not.toBe(first);
  expect(titleBar()).toBe("dnbm");
  await publish({ ...SEQUENCER_READY, dirty: true });
  expect(titleBar()).toBe("● Undertow — dnbm");
  expect(first.listeners.size).toBe(0);
  expect(second.listeners.size).toBe(1);

  await close();
  expect(second.destroyed).toBe(true);
  expect(second.listeners.size).toBe(0);
  await unmount();
});

test("the player's toolbar and View menu follow its state and run its commands", async () => {
  const { choose, menu, press, publish, toolbar, toolbarButton, unmount } =
    await render(DnbmPlayerApp, "dnbm-player", "dnbm player");
  const action = (
    label: string,
    disabled: boolean,
    pressed: string | null = null,
  ) => ({ label, disabled, pressed });
  const viewMenu = (
    stop: boolean,
    shuffle: string,
    repeat: string,
    disabled: boolean,
  ) => [
    { label: `${EM_SPACE} Stop`, disabled: stop },
    { label: shuffle, disabled },
    { label: repeat, disabled },
  ];
  expect(toolbar()).toEqual([
    action("Previous", true),
    action("Play", true),
    action("Next", true),
    action("Shuffle", true, "false"),
    action("Repeat", true, "false"),
  ]);
  expect((await menu("View")).slice(0, 3)).toEqual(
    viewMenu(true, `${EM_SPACE} Shuffle`, `${EM_SPACE} Repeat`, true),
  );

  await publish(PLAYER_READY);
  expect(toolbar()).toEqual([
    action("Previous", false),
    action("Play", false),
    action("Next", false),
    action("Shuffle", false, "false"),
    action("Repeat", false, "false"),
  ]);
  // Stopped at the start, the player has nothing to stop.
  expect((await menu("View")).slice(0, 3)).toEqual(
    viewMenu(true, `${EM_SPACE} Shuffle`, `${EM_SPACE} Repeat`, false),
  );
  expect(await press(toolbarButton("Previous"))).toEqual(["previous"]);
  expect(await press(toolbarButton("Play"))).toEqual(["togglePlay"]);
  expect(await press(toolbarButton("Next"))).toEqual(["next"]);
  expect(await press(toolbarButton("Shuffle"))).toEqual(["toggleShuffle"]);
  expect(await press(toolbarButton("Repeat"))).toEqual(["toggleRepeat"]);

  // Playing, with shuffle and repeat on.
  await publish({
    playing: true,
    shuffle: true,
    repeat: true,
    available: {
      ...PLAYER_READY.available,
      play: false,
      pause: true,
      stop: true,
    },
  });
  expect(toolbar()).toEqual([
    action("Previous", false),
    action("Pause", false),
    action("Next", false),
    action("Shuffle", false, "true"),
    action("Repeat", false, "true"),
  ]);
  expect((await menu("View")).slice(0, 3)).toEqual(
    viewMenu(false, "✓ Shuffle", "✓ Repeat", false),
  );
  expect(await press(toolbarButton("Pause"))).toEqual(["togglePlay"]);
  expect(await choose("View", "Stop")).toEqual(["stop"]);
  expect(await choose("View", "✓ Shuffle")).toEqual(["toggleShuffle"]);
  expect(await choose("View", "✓ Repeat")).toEqual(["toggleRepeat"]);
  await unmount();
});

test("the player's window names its current song", async () => {
  const { minimize, publish, restore, title, titleBar, unmount } = await render(
    DnbmPlayerApp,
    "dnbm-player",
    "dnbm player",
  );
  expect(titleBar()).toBe("dnbm player");
  await publish(PLAYER_READY);
  expect(titleBar()).toBe("Bathyal — dnbm player");
  await publish({ title: "Blackwater" });
  expect(titleBar()).toBe("Blackwater — dnbm player");

  const first = current();
  await minimize();
  expect(first.listeners.size).toBe(0);
  expect(title()).toBe("dnbm player");

  await restore();
  expect(current()).not.toBe(first);
  expect(titleBar()).toBe("dnbm player");
  await publish(PLAYER_READY);
  expect(titleBar()).toBe("Bathyal — dnbm player");
  await unmount();
});
