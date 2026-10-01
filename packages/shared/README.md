# Shared resume code

Framework-neutral resume code used by the resume app and the experiment: the
resume data (`resume.json`), layout configuration, the SVG and PDF factories,
text measurement, and the browser download helpers. Modules are exported by
path, for example `@a2f0/shared/svgResumeFactory`.

Run `bun run --cwd packages/shared unit` for the unit tests.
