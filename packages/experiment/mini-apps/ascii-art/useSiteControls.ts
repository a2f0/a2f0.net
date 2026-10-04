import { useCallback, useEffect, useState } from "react";

/** The state of the site's toolbar, as its buttons announce it. */
export interface SiteControlsState {
  ascii: boolean;
  music: { disabled: boolean; label: string };
  play: { label: string; playing: boolean };
  terminal: boolean;
}

export type SiteControl =
  | ".music-toggle"
  | ".play-toggle"
  | ".view-toggle"
  | ".window-toggle";

/**
 * Follows the site's own toolbar, which `mountSite` drives, so the window's
 * chrome can mirror it. `press` clicks one of the site's buttons, so every
 * control keeps the site's own behavior. The state is null until the site
 * mounts.
 */
export function useSiteControls(root: ShadowRoot | null) {
  const [state, setState] = useState<SiteControlsState | null>(null);

  useEffect(() => {
    const toolbar = root?.querySelector(".toolbar");
    if (!toolbar) return;
    const attribute = (control: SiteControl, name: string) =>
      toolbar.querySelector(control)?.getAttribute(name) ?? null;
    const read = () =>
      setState({
        ascii: attribute(".view-toggle", "aria-pressed") === "true",
        music: {
          disabled: attribute(".music-toggle", "aria-disabled") === "true",
          label: attribute(".music-toggle", "title") ?? "Music player",
        },
        play: {
          label: attribute(".play-toggle", "aria-label") ?? "Play animation",
          playing: attribute(".play-toggle", "data-playing") !== null,
        },
        terminal: attribute(".window-toggle", "aria-pressed") === "true",
      });
    read();
    const observer = new MutationObserver(read);
    observer.observe(toolbar, {
      attributes: true,
      attributeFilter: [
        "aria-disabled",
        "aria-label",
        "aria-pressed",
        "data-playing",
        "title",
      ],
      subtree: true,
    });
    return () => observer.disconnect();
  }, [root]);

  const press = useCallback(
    (control: SiteControl) =>
      root?.querySelector<HTMLButtonElement>(control)?.click(),
    [root],
  );

  return { press, state };
}
