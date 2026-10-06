import { rm } from "node:fs/promises";
import { copyDnbmAssets } from "@a2f0/dnbm/build";

// The dnbm sequencer's page, scripts, AudioWorklet, engine, and songs, served
// at /dnbm/ for the dnbm mini-app. The package's helper only adds files, so
// clear the last copy first: an upgrade would otherwise leave files the new
// version dropped.
const destination = new URL("../public/dnbm/", import.meta.url);

await rm(destination, { force: true, recursive: true });
await copyDnbmAssets(destination);
