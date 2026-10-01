import {
  useWindowActions,
  useWindowStateData,
  Window,
  WindowStateProvider,
} from "@tearleads/windowing";
import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
} from "react";

import ResumeWindow from "./ResumeWindow";
import WebsiteWindow from "./WebsiteWindow";

interface App {
  appId: string;
  title: string;
  component: ComponentType;
  /** Where the window first opens, in viewport pixels. */
  x: number;
  y: number;
}

// Opened in this order on load, so the last one starts in front.
const APPS: App[] = [
  { appId: "resume", title: "Resume", component: ResumeWindow, x: 48, y: 32 },
  {
    appId: "website",
    title: "a2f0.net",
    component: WebsiteWindow,
    x: 360,
    y: 140,
  },
];

// Drag and resize follow the mouse only, so touch and narrow screens get the
// window maximized instead.
const prefersMaximized = () =>
  window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;

// The window layer starts a resize without preventing the mousedown default,
// so dragging a corner across the resume would select its text.
const preventResizeSelection = (event: ReactMouseEvent) => {
  if (
    event.target instanceof Element &&
    event.target.closest(".window-resize")
  ) {
    event.preventDefault();
  }
};

function DesktopSurface() {
  const { windows } = useWindowStateData();
  return (
    <div
      className="desktop-surface"
      onMouseDownCapture={preventResizeSelection}
    >
      {windows.map((entry) => (
        <Window key={entry.id} windowId={entry.id} />
      ))}
    </div>
  );
}

function useOpenApp() {
  const { windows } = useWindowStateData();
  const { bringToFront, create, maximize, restore } = useWindowActions();

  return ({ appId, component, title, x, y }: App) => {
    const open = windows.find((entry) => entry.appId === appId);
    if (open) {
      restore(open.id);
      bringToFront(open.id);
      return;
    }
    const id = create(title, x, y, component, { appId });
    if (prefersMaximized()) maximize(id);
  };
}

function Taskbar() {
  const { windows } = useWindowStateData();
  const openApp = useOpenApp();

  // Open every app once on load; reopening after a close is the taskbar's job.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    for (const app of APPS) openApp(app);
  });

  return (
    <nav className="desktop-taskbar" aria-label="Windows">
      {APPS.map((app) => {
        const open = windows.find((entry) => entry.appId === app.appId);
        return (
          <button
            key={app.appId}
            type="button"
            className="desktop-taskbar-button"
            aria-pressed={open !== undefined && !open.minimized}
            onClick={() => openApp(app)}
          >
            {app.title}
          </button>
        );
      })}
    </nav>
  );
}

export default function Desktop() {
  return (
    <WindowStateProvider>
      <main className="desktop">
        <h1 className="visually-hidden">a2f0 experiment</h1>
        <DesktopSurface />
        <Taskbar />
      </main>
    </WindowStateProvider>
  );
}
