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
which lists every mini-app with its icon, followed by a button per open window,
as in Tearleads' pane footer: a button restores its window, the front window's
button is pressed, and a minimized window's shows its title muted. Closing a
window removes its button; the start menu opens the app again.

The app uses the published `@tearleads/windowing` package, pinned to `0.2.8`.
Install from this repository's root:

```sh
bun ci
bun run --cwd packages/experiment dev
```

The dev server listens on port 4003. `dev` and `build` first copy the
website's `a2f0.svg` into `public/`, the skyline viewer's assets into
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
