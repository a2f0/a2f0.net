import { browser, expect } from "@wdio/globals";

describe("Exported site routing", () => {
  it("serves the PDF page directly", async () => {
    const response = await fetch(new URL("/pdf", browser.options.baseUrl));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('id="pdfObjectContainer"');
  });

  it("redirects a trailing slash to the canonical PDF URL", async () => {
    const response = await fetch(new URL("/pdf/", browser.options.baseUrl), {
      redirect: "manual",
    });
    expect(response.status).toBe(307);
    expect(
      new URL(response.headers.get("location") ?? "", response.url).pathname,
    ).toBe("/pdf");
  });

  it("returns the exported 404 page for an unknown route", async () => {
    const response = await fetch(
      new URL("/does-not-exist", browser.options.baseUrl),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("This page could not be found");
  });

  it("does not serve the home page for a missing JavaScript asset", async () => {
    const response = await fetch(
      new URL("/_next/static/missing.js", browser.options.baseUrl),
    );
    expect(response.status).toBe(404);
  });
});
