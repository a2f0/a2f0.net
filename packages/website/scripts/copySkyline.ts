import { rm } from "node:fs/promises";
import { copySkylineAssets } from "@a2f0/skyline/build";

// The skyline viewer's pages, scripts, and models, served at /skyline/ for the
// skyline mini-app. The package's helper only adds files, so clear the last
// copy first: an upgrade would otherwise leave files the new version dropped.
const destination = new URL("../public/skyline/", import.meta.url);

await rm(destination, { force: true, recursive: true });
await copySkylineAssets(destination);
