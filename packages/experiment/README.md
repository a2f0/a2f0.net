# Experiment

An experiment started in [a2f0/a2f0.net#1144](https://github.com/a2f0/a2f0.net/issues/1144):
the resume, the a2f0.net artwork, the 3D Chicago skyline, and the dnbm drum
and bass sequencer and player in draggable, resizable windows from
[`@tearleads/windowing`](https://github.com/a2f0/tearleads/tree/main/packages/windowing),
deployed to `experiment.a2f0.net`.

Each window is a mini-app, defined in [`mini-apps/`](mini-apps/README.md)
in the same shape as Tearleads' mini-apps. The artwork window reads
`packages/website/public/index.html` for its markup and styles and runs the
site's own `mountSite` inside a shadow root, so the site's stylesheet and the
window stylesheets cannot restyle each other. Its controls sit in the window's
toolbar and View menu. The skyline window renders the viewer from
[`@a2f0/skyline`](https://www.npmjs.com/package/@a2f0/skyline), and the dnbm
windows the sequencer and the player from
[`@a2f0/dnbm`](https://www.npmjs.com/package/@a2f0/dnbm), in the page itself,
each inside a shadow root that keeps its styles and the desktop's apart, so a
press inside any of them reaches its window like any other and closes open
menus. The dnbm windows drive their apps through the package's commands and
state: the sequencer's file commands sit in its window's File menu, and its
play, undo, and redo in the toolbar; the player's controls sit in its toolbar
and View menu. Each window's title names the song.

The taskbar along the bottom starts with the windowing package's `StartMenu`,
whose button shows the website's graffiti restacked into a square, "a2" over
"f0", and whose menu lists every mini-app with its icon, followed by a button
per open window,
as in Tearleads' pane footer: a button restores its window, the front window's
button is pressed, and a minimized window's shows its title muted. Closing a
window removes its button; the start menu opens the app again.

On phones, tablets, and windows narrower than 1024px, the desktop gives way to
the windowing package's routed shell, the layout Tearleads uses there: one
mini-app at a time under an app bar, with a launcher of app tiles behind the
stacked graffiti in the bottom taskbar (a rail on tablets). Each app has a
route, `/app/<app id>`, which the browser's Back and Forward walk and which the
Worker serves the page for; the root route shows the artwork. The routed shell
has no menu bar, so the resume puts its theme, downloads, and printing in the
app bar's toolbar there, beside the toolbars the other apps already have. The
switch in the taskbar's corner moves between the two layouts wherever windows
suit the screen, and the choice persists. The layout follows the screen the
page loads on and keeps it as the window resizes, since a switch remounts
every app; the resume keeps its theme and scale across one. Next.js leaves the routed shell's
history entries to it.

The app uses the published `@tearleads/windowing` package, pinned to `0.2.12`.
Install from this repository's root:

```sh
bun ci
bun run --cwd packages/experiment dev
```

The dev server listens on port 4003 and rewrites the routed shell's `/app/*` routes to the page, as the Worker does. `dev` and `build` first copy the
website's `a2f0.svg` into `public/`, where the artwork window loads it, the
skyline viewer's assets into
`public/skyline/`, and the dnbm sequencer's and player's into `public/dnbm/`. `build` writes a static export to `out/`,
`start` serves it through Wrangler on the same port, and `deploy` publishes the
`experiment` Worker. `unit` runs the desktop and mini-app tests under happy-dom. Terraform
attaches the `experiment.a2f0.net` domain. CI builds and tests the app, then
deploys it on validated pushes to `production`.

Next.js builds with webpack (`--webpack`) to import the website's HTML as text
through the `?raw` resource rule. The windowing package supplies its own CSS
defaults and uses the app's React through peer dependencies.

The skyline viewer loads its code (`skyline-viewer.js`), stylesheets, scene
markup, stars, and models from `/skyline/`, and the dnbm apps load their code
(`mount.js` and `player/mount.js`), stylesheets, AudioWorklet, engine, and songs
from `/dnbm/`: each from the URL it mounts with. Each package's loader imports
that code at runtime with an `import()` webpack leaves to the browser, so the
app's bundle holds only the loaders. The dnbm commands the windows run live in
that code too, so the copied assets must match the installed package: an older
copy runs no command and leaves the windows' chrome disabled. The app has no
`three` dependency: the skyline's scene loads the copy of three.js in its
assets when it first needs it.
