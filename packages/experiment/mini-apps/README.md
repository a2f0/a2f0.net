# Mini-Apps

Each window on the experiment desktop is a mini-app: a component that runs
inside a window from `@tearleads/windowing` and reaches its window's chrome
(File and View menus, toolbar, status bar) through the package's `useWindow*`
hooks. The layout follows Tearleads'
[`packages/app/src/mini-apps`](https://github.com/a2f0/tearleads/tree/main/packages/app/src/mini-apps).

- `types.ts` lists the mini-app ids. The window layer stores a window's `appId`
  as an opaque string; `isMiniAppId` narrows it back.
- `catalog.ts` holds each app's title, launch order, and first position
  without importing any app, so code that only labels apps stays light.
- `registry.ts` pairs those titles with the components.
- `MiniAppWindow.tsx` renders a mini-app's window. It fills the window's
  `ContentBoundary` slot with `MiniAppBoundary`, so an app that throws fails
  inside its own window, and turns off the history Back button: these apps have
  no routes.
- `useOpenMiniApp.ts` opens an app's window, or brings its open window to the
  front. Each app has at most one window.

## Adding a mini-app

1. Add its id to `MINI_APP_IDS` in `types.ts`.
2. Give it a title, a position, and a place in the launch order in
   `catalog.ts`.
3. Create its directory with `<Name>App.tsx` and register the component in
   `registry.ts`.
4. Import its stylesheet, if it has one, from `pages/_app.tsx`: Next.js takes
   global stylesheets only from there.

## Layout

Each app directory keeps its entry points at the root: `<Name>App.tsx`, its
stylesheet, and the hooks that register its window chrome
(`use<Name>Menus.ts`, `use<Name>Toolbar.tsx`). `shared/` holds helpers used by
several apps.

- `resume/` renders the shared resume as SVG and puts its downloads, theme, and
  scale in the File and View menus.
- `ascii-art/` runs the a2f0.net artwork from `packages/website` inside a
  shadow root. Its controls (the animation, the music player, and the ASCII
  view, with its pressed state) sit in the window's toolbar and its View menu.
  Both mirror the site's own toolbar, which stays in the shadow root unseen and
  keeps the site's behavior. The site's terminal window is left out, as the
  artwork already sits in a window.
