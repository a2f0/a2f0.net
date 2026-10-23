import { startClickTracking } from "./clickTracking";
import { mountSite } from "./site";

const main = document.querySelector("main");
if (!main) throw new Error("Missing main");
mountSite(main);
startClickTracking();
