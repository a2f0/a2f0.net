import { expect, test } from "bun:test";

test("serves the demo page without redirecting", async () => {
  const response = await fetch("http://localhost:4002/", {
    redirect: "manual",
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("content-type")).toContain("text/html");
  const page = await response.text();
  expect(page).toContain(
    "<title>a2f0 demo – Graffiti Wordmark and ASCII Art</title>",
  );
  expect(page).toContain('<link rel="canonical" href="https://demo.a2f0.net/"');
  expect(page).toContain(
    '<meta property="og:url" content="https://demo.a2f0.net/"',
  );
  expect(page).toMatch(
    /<meta\s+name="description"\s+content="The a2f0 wordmark/,
  );
  expect(page).toContain(
    '<meta property="og:image" content="https://demo.a2f0.net/og-image.png"',
  );
  expect(page).toContain(
    '<meta name="twitter:card" content="summary_large_image"',
  );
  expect(page).not.toMatch(/<meta name="robots"/);

  const image = await fetch("http://localhost:4002/og-image.png");
  expect(image.status).toBe(200);
  expect(image.headers.get("content-type")).toBe("image/png");
});

test("serves robots.txt as text that allows crawling", async () => {
  const response = await fetch("http://localhost:4002/robots.txt");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/plain");
  expect(await response.text()).toBe("User-agent: *\nAllow: /\n");
});

test("serves the canvas toolbar and the bundled script", async () => {
  const page = await (await fetch("http://localhost:4002/")).text();
  expect(page).toContain('class="toolbar"');
  expect(page).toContain('class="tool view-toggle"');
  expect(page).toContain('src="/graffiti.js"');

  const script = await fetch("http://localhost:4002/graffiti.js");
  expect(script.status).toBe(200);
  expect(script.headers.get("content-type")).toContain("javascript");
  expect(await script.text()).not.toContain("process.env");
});

test("links and serves the favicons the build renders into dist", async () => {
  const page = await (await fetch("http://localhost:4002/")).text();
  const icons = ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"];
  const links = Array.from(
    page.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g),
    ([, href]) => href,
  );
  expect(links).toEqual(icons);

  for (const icon of icons) {
    const response = await fetch(`http://localhost:4002${icon}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^image\//);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  }
});
