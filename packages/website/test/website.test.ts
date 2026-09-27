import { expect, test } from "bun:test";

test("serves the apex page without redirecting to the resume", async () => {
  const response = await fetch("http://localhost:4002/", {
    redirect: "manual",
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(await response.text()).toContain("<title>a2f0.net</title>");
});

test("serves the ASCII art toggle and its script", async () => {
  const page = await (await fetch("http://localhost:4002/")).text();
  expect(page).toContain('class="view-toggle"');
  expect(page).toContain('src="/ascii.js"');

  const script = await fetch("http://localhost:4002/ascii.js");
  expect(script.status).toBe(200);
  expect(script.headers.get("content-type")).toContain("javascript");
});
