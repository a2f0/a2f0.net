/**
 * Type declaration for wdio-video-reporter
 *
 * This module augmentation is needed because wdio-video-reporter's package.json
 * exports field points to the compiled .mjs file but doesn't properly export the
 * type definitions. This bridges the gap by pointing TypeScript to the correct
 * type definitions at dist/src/index.d.ts when using bundler moduleResolution.
 */
declare module "wdio-video-reporter" {
  export * from "wdio-video-reporter/dist/src/index";
  export { default } from "wdio-video-reporter/dist/src/index";
}
