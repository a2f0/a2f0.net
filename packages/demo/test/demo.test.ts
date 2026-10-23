import { expect, test } from "bun:test";

test("serves the demo page without redirecting", async () => {
  const response = await fetch("http://localhost:4002/", {
    redirect: "manual",
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(await response.text()).toContain("<title>a2f0 demo</title>");
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
