import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, expect, test } from "bun:test";

import { Etcher, type Prepared } from "./etcher";

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

test("stays stopped when stopped as it starts with the artwork loaded", async () => {
  const stage = document.createElement("div");
  const art = document.createElement("img");
  stage.append(art);
  const artwork: Prepared = {
    svg: new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>',
      "image/svg+xml",
    ),
    onLetters: () => false,
  };
  const etcher = new Etcher(stage, art, () => Promise.resolve(artwork));

  // The first play loads the artwork; stopping wins while it loads.
  const loading = etcher.play();
  etcher.stop();
  await loading;
  // The second finds it loaded already, and must still honour the stop.
  const playing = etcher.play();
  etcher.stop();
  await playing;

  expect(etcher.playing).toBe(false);
  expect(stage.dataset.etching).toBeUndefined();
  expect(stage.children).toHaveLength(1);
  expect(art.style.visibility).toBe("");
});
