import { Component, type PropsWithChildren, type ReactNode } from "react";

import { MINI_APP_TITLES } from "./catalog";
import type { MiniAppId } from "./types";

interface MiniAppBoundaryProps extends PropsWithChildren {
  appId: MiniAppId;
}

/**
 * Keeps a mini-app that throws while rendering inside its own window: the
 * window shows the failure and the rest of the desktop keeps running.
 */
export class MiniAppBoundary extends Component<
  MiniAppBoundaryProps,
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error(error);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="mini-app-error" role="alert">
        {MINI_APP_TITLES[this.props.appId]} stopped working. Close the window
        and open it again from the taskbar.
      </p>
    );
  }
}
