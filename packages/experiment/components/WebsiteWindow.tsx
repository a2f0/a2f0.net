import siteHtml from "@a2f0/website/public/index.html?raw";
import { mountSite } from "@a2f0/website/src/site";
import {
  useSuppressWindowToolbar,
  useWindowViewMenuItem,
} from "@tearleads/windowing";
import { useEffect, useRef, useState } from "react";

import { checked, EM_SPACE } from "./menuLabels";

// The site lays out its own <main>; inside a window a plain container takes
// its place, and fills the window body.
const HOST_CSS = `
  :host {
    display: block;
    height: 100%;
  }

  .site {
    display: grid;
    min-height: 100%;
    place-items: center;
    overflow: hidden;
    container-type: inline-size;
  }
`;

interface Site {
  sheet: CSSStyleSheet;
  main: Element;
}

let site: Site | undefined;

/**
 * Reads the markup and styles from the website's own index.html, so the
 * window shows exactly what a2f0.net does. Its styles go in a shadow root:
 * they select `.window`, `main`, and `:root`, which would restyle the
 * desktop, and the desktop's resets would restyle the site.
 */
const loadSite = (): Site => {
  if (site) return site;
  const page = new DOMParser().parseFromString(siteHtml, "text/html");
  const css = [...page.querySelectorAll("style")]
    .map((style) => style.textContent)
    .join("\n")
    // A shadow root has no :root; its host stands in for it.
    .replaceAll(":root", ":host");
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css + HOST_CSS);
  // @property rules only take effect on the document, and the lens animates
  // the properties they register.
  for (const rule of sheet.cssRules) {
    if (!(rule instanceof CSSPropertyRule)) continue;
    try {
      CSS.registerProperty({
        name: rule.name,
        syntax: rule.syntax,
        inherits: rule.inherits,
        initialValue: rule.initialValue ?? undefined,
      });
    } catch {
      // Already registered by an earlier window.
    }
  }
  const main = page.querySelector("main");
  if (!main) throw new Error("The website has no <main>");
  site = { sheet, main };
  return site;
};

/** Copies the site's markup into a container, its heading one level down. */
const buildSite = ({ main }: Site): HTMLElement => {
  const container = document.createElement("div");
  container.className = "site";
  container.append(
    ...[...main.childNodes].map((node) => document.importNode(node, true)),
  );
  const heading = container.querySelector("h1");
  if (heading) {
    const subheading = document.createElement("h2");
    subheading.className = heading.className;
    subheading.append(...heading.childNodes);
    heading.replaceWith(subheading);
  }
  return container;
};

interface ToolbarState {
  ascii: boolean;
  playLabel: string;
  terminal: boolean;
}

/** Mirrors the site's toolbar into the window's View menu. */
function useSiteMenus(root: ShadowRoot | null) {
  const [state, setState] = useState<ToolbarState | null>(null);

  useEffect(() => {
    const toolbar = root?.querySelector(".toolbar");
    if (!toolbar) return;
    const attribute = (selector: string, name: string) =>
      toolbar.querySelector(selector)?.getAttribute(name);
    const read = () =>
      setState({
        ascii: attribute(".view-toggle", "aria-pressed") === "true",
        playLabel: attribute(".play-toggle", "aria-label") ?? "Play animation",
        terminal: attribute(".window-toggle", "aria-pressed") === "true",
      });
    read();
    const observer = new MutationObserver(read);
    observer.observe(toolbar, {
      attributes: true,
      attributeFilter: ["aria-label", "aria-pressed"],
      subtree: true,
    });
    return () => observer.disconnect();
  }, [root]);

  const press = (selector: string) =>
    root?.querySelector<HTMLButtonElement>(selector)?.click();

  useWindowViewMenuItem(
    state && {
      id: "ascii-view",
      label: checked(state.ascii, "ASCII View"),
      priority: 30,
      onClick: () => press(".view-toggle"),
    },
  );
  useWindowViewMenuItem(
    state && {
      id: "play",
      label: `${EM_SPACE} ${state.playLabel}`,
      priority: 20,
      onClick: () => press(".play-toggle"),
    },
  );
  useWindowViewMenuItem(
    state && {
      id: "terminal-window",
      label: checked(state.terminal, "Terminal Window"),
      priority: 10,
      onClick: () => press(".window-toggle"),
    },
  );
}

/** The a2f0.net artwork, toolbar, and terminal window, inside a window. */
export default function WebsiteWindow() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  // Windows with an appId get a toolbar row for the routed Back button; the
  // site has no routes, so the row would stay empty.
  useSuppressWindowToolbar(true);
  useSiteMenus(root);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const loaded = loadSite();
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [loaded.sheet];
    const container = buildSite(loaded);
    shadow.replaceChildren(container);
    const unmount = mountSite(container);
    setRoot(shadow);
    return () => {
      unmount();
      shadow.replaceChildren();
      setRoot(null);
    };
  }, []);

  return <div ref={hostRef} className="website-window" />;
}
