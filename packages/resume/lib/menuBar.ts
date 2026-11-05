/**
 * The resume's menu bar: closed, or open on one menu. While a menu is open,
 * pointing at another menu opens that one instead.
 */
export type MenuBarState =
  | { status: "closed" }
  | { status: "open"; menu: string };

export type MenuBarEvent =
  /** A menu's button was pressed: it opens, or closes when already open. */
  | { type: "toggle"; menu: string }
  /** The pointer entered a menu's button. */
  | { type: "hover"; menu: string }
  /**
   * The open menu was dismissed (Escape, focus or a click leaving it). It
   * names the menu dismissed, so a late dismissal of a menu that is no longer
   * open cannot close the one that replaced it.
   */
  | { type: "dismiss"; menu: string };

export const closedMenuBar: MenuBarState = { status: "closed" };

const isOpen = (state: MenuBarState, menu: string) =>
  state.status === "open" && state.menu === menu;

export function transition(
  state: MenuBarState,
  event: MenuBarEvent,
): MenuBarState {
  switch (event.type) {
    case "toggle":
      return isOpen(state, event.menu)
        ? closedMenuBar
        : { status: "open", menu: event.menu };
    case "hover":
      return state.status === "open" && state.menu !== event.menu
        ? { status: "open", menu: event.menu }
        : state;
    case "dismiss":
      return isOpen(state, event.menu) ? closedMenuBar : state;
    default:
      return assertNever(event);
  }
}

/** The menu that is open, if any. */
export const openMenu = (state: MenuBarState) =>
  state.status === "open" ? state.menu : null;

function assertNever(value: never): never {
  throw new Error(`Unhandled menu bar event: ${JSON.stringify(value)}`);
}
