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
