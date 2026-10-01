import { createCanvas } from "canvas";

// Text measurement goes through a 2D canvas, which jsdom provides only when the
// canvas package is installed.
const canvas = createCanvas(800, 600);

global.HTMLCanvasElement = class extends HTMLCanvasElement {};

Object.setPrototypeOf(canvas, global.HTMLCanvasElement.prototype);
