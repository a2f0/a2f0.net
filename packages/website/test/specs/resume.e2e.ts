import { browser, expect } from "@wdio/globals";
import {
  asciiArtWindow,
  backgroundOf,
  resumeTextFills,
  resumeWindow,
  siteState,
  taskbar,
  useDesktop,
  waitForResumeFit,
} from "../lib/desktop";

// The resume's print frame would open the browser's print dialog. Record the
// PDF it was asked to print instead.
const stubFramePrint = () =>
  browser.execute(() => {
    const contentWindow = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "contentWindow",
    );
    Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
      configurable: true,
      get(this: HTMLIFrameElement) {
        if (this.id !== "resumePrintFrame") {
          return contentWindow?.get?.call(this);
        }
        return {
          print: () => {
            document.documentElement.dataset.printed = this.src;
          },
        };
      },
    });
  });

const printedPdf = () =>
  browser.execute(async () => {
    const src = document.documentElement.dataset.printed;
    if (!src) return null;
    const pdf = await (await fetch(src)).text();
    return {
      header: pdf.slice(0, 5),
      pages: pdf.match(/\/Type \/Page\b/g)?.length ?? 0,
      firstFill: pdf.split("\n").find((line) => / g$/.test(line)),
    };
  });

describe("Website resume window", () => {
  useDesktop();

  it("registers the resume and artwork menus", async () => {
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=Light Theme").click();
    await browser.waitUntil(
      async () => (await resumeTextFills()).includes("#555555"),
      { timeoutMsg: "the resume did not redraw in the light theme" },
    );
    expect(await resumeTextFills()).not.toContain("#DCDCDC");
    // The theme is the page's alone. As on resume.a2f0.net, the window
    // around it stays dark, as do its title bar, the other windows, and the
    // taskbar.
    expect(await backgroundOf("section.window:has(.resume-window)")).toBe(
      "color(srgb 0.139216 0.139216 0.139216)",
    );
    expect(
      await backgroundOf("section.window:has(.resume-window) .window-titlebar"),
    ).toBe("rgb(40, 40, 40)");
    expect(await backgroundOf("section.window:has(.ascii-art-window)")).toBe(
      "rgb(22, 22, 22)",
    );
    expect(await backgroundOf(".desktop-taskbar")).toBe("rgb(40, 40, 40)");
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=150%").click();
    await resumeWindow().$("button=View").click();
    await expect(resumeWindow().$("button*=150%")).toHaveText("✓ 150%");
    // Close View first. While a menu is open, hovering File opens it, and the
    // click then closes it again whenever React renders the hover first.
    await resumeWindow().$("button=View").click();
    await expect(resumeWindow().$("button*=150%")).not.toBeExisting();
    await resumeWindow().$("button=File").click();
    await expect(resumeWindow().$("button=Download PDF")).toBeDisplayed();
    await expect(resumeWindow().$("button=Download SVG")).toBeDisplayed();
    await expect(resumeWindow().$("button=Print")).toBeDisplayed();

    await taskbar("a2f0.net").click();
    await asciiArtWindow().$("button=View").click();
    await asciiArtWindow().$("button*=ASCII View").click();
    await browser.waitUntil(async () => (await siteState()).view === "svg", {
      timeoutMsg: "the window menu did not update the artwork controls",
    });
  });

  it("prints the resume PDF on white in the dark theme", async () => {
    await stubFramePrint();
    await taskbar("Resume").click();
    expect(await resumeTextFills()).toContain("#DCDCDC");
    await resumeWindow().$("button=File").click();
    await resumeWindow().$("button=Print").click();
    await expect(resumeWindow().$("button=Print")).not.toBeExisting();

    await browser.waitUntil(async () => (await printedPdf()) !== null, {
      timeoutMsg: "the print frame did not print",
    });
    expect(await printedPdf()).toEqual({
      header: "%PDF-",
      pages: 1,
      // The panels paint first, in the light theme's white.
      firstFill: "1. g",
    });
  });

  it("opens the resume fitted to its page", async () => {
    const fitState = () =>
      browser.execute(() => {
        const pane = document.querySelector<HTMLElement>(
          "section.window:has(.resume-window) .window-body-content-scroll",
        );
        const svg = pane?.querySelector("svg");
        if (!pane || !svg) throw new Error("Missing resume");
        const { paddingLeft, paddingRight } = getComputedStyle(pane);
        return {
          contentWidth:
            pane.clientWidth -
            Number.parseFloat(paddingLeft) -
            Number.parseFloat(paddingRight),
          scrollsAcross: pane.scrollWidth > pane.clientWidth,
          viewBox: svg.getAttribute("viewBox"),
        };
      });
    // The page is taller than the 900px desktop, so the window fills its
    // height and scrolls down, while the desktop page shows its full width.
    const page = {
      contentWidth: 816,
      scrollsAcross: false,
      viewBox: "0 0 816 1056",
    };
    const expectFitted = async () => {
      await waitForResumeFit();
      await browser.waitUntil(
        async () => (await fitState()).viewBox === page.viewBox,
        { timeoutMsg: "the fitted resume did not show its desktop page" },
      );
      expect(await fitState()).toEqual(page);
    };
    await expectFitted();

    // Narrowed past the page, the resume takes its single column; View > Fit
    // to Content brings the page back.
    await taskbar("Resume").click();
    await browser
      .action("pointer")
      .move({ origin: resumeWindow().$(".window-resize--e") })
      .down()
      .move({ origin: "pointer", x: -100, y: 0, duration: 150 })
      .up()
      .perform();
    await browser.waitUntil(
      () =>
        browser.execute(
          () =>
            document
              .querySelector(".resume-window svg")
              ?.getAttribute("viewBox") !== "0 0 816 1056",
        ),
      { timeoutMsg: "the narrowed resume kept its desktop page" },
    );
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button=Fit to Content").click();
    await expectFitted();
  });
});
