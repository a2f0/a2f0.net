// Exposes the fat laser's profiler to the page, so a spec can profile a
// shape it builds itself.
import { unitProfile } from "../src/etch/profile";

Object.assign(window, { unitProfile });
