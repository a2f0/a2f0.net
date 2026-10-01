import {
  useWindowActions,
  useWindowStateData,
  Window,
  WindowStateProvider,
} from "@tearleads/windowing";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import ResumeWindow from "./ResumeWindow";

const RESUME_APP_ID = "resume";

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

function Taskbar() {
  const { windows } = useWindowStateData();
  const { bringToFront, create, maximize, restore } = useWindowActions();
  const resumeWindow = windows.find((entry) => entry.appId === RESUME_APP_ID);

  const openResume = useCallback(() => {
    if (resumeWindow) {
      restore(resumeWindow.id);
      bringToFront(resumeWindow.id);
      return;
    }
    const id = create("Resume", 48, 32, ResumeWindow, {
      appId: RESUME_APP_ID,
    });
    if (prefersMaximized()) maximize(id);
  }, [bringToFront, create, maximize, restore, resumeWindow]);

  // Open the resume once on load; reopening after a close is the taskbar's job.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    openResume();
  }, [openResume]);

  return (
    <nav className="desktop-taskbar" aria-label="Windows">
      <button
        type="button"
        className="desktop-taskbar-button"
        aria-pressed={resumeWindow !== undefined && !resumeWindow.minimized}
        onClick={openResume}
      >
        Resume
      </button>
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
