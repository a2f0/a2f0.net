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
  expect(page).not.toMatch(/<meta name="robots"/);
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
