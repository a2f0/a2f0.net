# Mini-Apps

Each window on the experiment desktop is a mini-app: a component that runs
inside a window from `@tearleads/windowing` and reaches its window's chrome
(File and View menus, toolbar, status bar) through the package's `useWindow*`
hooks. The layout follows Tearleads'
[`packages/app/src/mini-apps`](https://github.com/a2f0/tearleads/tree/main/packages/app/src/mini-apps).

- `types.ts` lists the mini-app ids. The window layer stores a window's `appId`
  as an opaque string; `isMiniAppId` narrows it back.
- `catalog.ts` holds each app's title, icon, launch order, and window options
  (where the window first opens, its size as a fraction of the desktop, and
  whether it opens fitted to its content)
  without importing any app, so code that only labels apps stays light.
- `registry.ts` pairs those titles and icons with the components in
  `MINI_APP_LAUNCHER`, the windowing package's launcher definition, which the
  routed shell runs and the windows open from.
- `MiniAppContent.tsx` renders each app with the framework's `MiniAppProps`.
  Its `onLoad` callback tells the window that the app's content has loaded. A
  window that opens with `fitToContent` then fits the size the app reports with
  `useWindowContentSize`, once. Later calls do nothing.
- `MiniAppWindow.tsx` renders a mini-app's window. It fills the window's
  `ContentBoundary` slot with `MiniAppBoundary`, so an app that throws fails
  inside its own window, and turns off the history Back button: these apps have
  no routes.
- `useOpenMiniApp.ts` opens an app's window, or brings its open window to the
  front. Each app has at most one window.

## Adding a mini-app

1. Add its id to `MINI_APP_IDS` in `types.ts`.
2. Give it a title, an icon, window options, and a place in the launch order
   in `catalog.ts`.
3. Create its directory with `<Name>App.tsx`, a component that takes
   `MiniAppProps`, and register it in `registry.ts` through
   `withMiniAppProps`. An app that opens fitted reports its size and calls
   `onLoad` once its content shows.
4. Import its stylesheet, if it has one, from `pages/_app.tsx`: Next.js takes
   global stylesheets only from there.

## Layout

Each app directory keeps its entry points at the root: `<Name>App.tsx`, its
stylesheet, and the hooks that register its window chrome
(`use<Name>Menus.ts`, `use<Name>Toolbar.tsx`). `shared/` holds helpers used by
several apps.

- `resume/` renders the shared resume as SVG and puts its downloads, printing
  (the PDF, in the light theme), theme, and scale in the File and View menus.
  In the routed shell, which has no menu bar, its theme, downloads, and
  printing sit in the toolbar instead.
  The theme recolors only the page: as on resume.a2f0.net, the window around
  it stays dark, as do the window's chrome and the rest of the desktop.
  Its window opens fitted to the page once the SVG has rendered.
- `ascii-art/` runs the a2f0.net artwork from `packages/website` inside a
  shadow root. Its controls (the animation, the music player, and the ASCII
  view, with its pressed state) sit in the window's toolbar and its View menu.
  Both mirror the site's own toolbar, which stays in the shadow root unseen and
  keeps the site's behavior. The site's terminal window is left out, as the
  artwork already sits in a window.
- `skyline/` mounts the 3D Chicago skyline from `@a2f0/skyline`, which
  renders the viewer in the page inside a shadow root, from assets the
  `copy-skyline` script copies into `public/skyline/`. Presses inside it reach
  the window, which comes to the front as for any of its content, and open
  menus close; its keys act only while focus is inside it. Its window opens at
  three quarters of the desktop's width and height, to give the 3D scene room,
  with the scene's control bar open. Closing or minimizing the window destroys
  the viewer, which releases its WebGL context.
- `dnbm/` mounts the dnbm drum and bass sequencer from `@a2f0/dnbm`, which
  renders it in the page inside a shadow root, from assets the `copy-dnbm`
  script copies into `public/dnbm/`. It mounts with `actions: false`, so the
  window's chrome takes the place of the sequencer's own buttons: the File menu
  has New, Open…, Save, Save As…, and Export WAV…; the toolbar has Play (Stop
  while playing), Undo, and Redo; and the View menu plays or stops too. Each
  runs the instance's command and is disabled while the sequencer can't take
  it: until it is ready, and while it asks something in a dialog. The window
  runs a command inside the press itself, so the file pickers that Open…, Save
  As…, and a first Save show keep the press's user activation. The window's
  title names the song, marked with ● while it has unsaved changes, as in
  "● Undertow — dnbm"; minimized or closed, the window and its taskbar button
  show "dnbm" again. The sequencer keeps a slim top bar with the song's own
  fields: its title, play mode, tempo, swing, position, scope, and examples.
  Presses inside it, steps and knobs included, reach the window, which comes to
  the front as for any of its content, and open menus close; its keyboard
  shortcuts act only while focus is inside it. Its window opens fitted to the
  sequencer's 1200 by 800 desktop layout, within the desktop, behind the other
  apps, once the instance reports it ready; a smaller window scrolls. Audio
  starts on the first press inside the app or on Play, and the song autosaves
  to this origin's local storage.
- `dnbm-player/` mounts the dnbm player from the same package and copied
  assets the same way; it plays dnbm's example songs as a playlist through the
  same synthesizer. Its controls sit in the window's chrome too: the toolbar
  has Previous, Play (Pause while playing), Next, and Shuffle and Repeat, shown
  pressed while on; the View menu has Stop, and Shuffle and Repeat, checked
  while on. The player keeps its display, seek, and volume, and the window's
  title names the current song. Its window opens fitted to the player and its
  whole playlist, between the skyline and the artwork, once the player is
  ready with its songs. It stores nothing.

`shared/useDnbmState.ts` follows a dnbm instance's state for both windows'
chrome, and `shared/useWindowTitle.ts` names what an app shows in its window's
title.
