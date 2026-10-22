import { useCurrentWindow } from "@tearleads/windowing";
import { type ComponentType, useCallback } from "react";

import type { MiniAppProps } from "./types";

/**
 * Renders a mini-app with the framework's props, as the component its window
 * shows. `onLoad` tells the window its content has loaded.
 */
export function withMiniAppProps(
  App: ComponentType<MiniAppProps>,
): ComponentType {
  function MiniAppContent() {
    const markContentLoaded = useCurrentWindow()?.markContentLoaded;
    const onLoad = useCallback(
      () => markContentLoaded?.(),
      [markContentLoaded],
    );
    return <App onLoad={onLoad} />;
  }
  return MiniAppContent;
}
