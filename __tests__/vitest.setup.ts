import { cleanup } from "@testing-library/react";
import { createCanvas } from "canvas";
import { afterEach } from "vitest";

const canvas = createCanvas(800, 600);

global.HTMLCanvasElement = class extends HTMLCanvasElement {};

Object.setPrototypeOf(canvas, global.HTMLCanvasElement.prototype);

afterEach(cleanup);
