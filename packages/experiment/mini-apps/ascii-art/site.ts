import siteHtml from "@a2f0/website/public/index.html?raw";

// The site lays out its own <main>; inside a window a plain container takes
// its place, and fills the window body. The window's toolbar carries the
// site's controls, so the site's own toolbar stays unseen.
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

  .toolbar {
    visibility: hidden;
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
export const loadSite = (): Site => {
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
export const buildSite = ({ main }: Site): HTMLElement => {
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
