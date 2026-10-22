// Keys that only modify another key. Browsers can count one pressed alone as
// keyboard use: in Brave, Shift alone makes a window focused by a click match
// :focus-visible, which rang it.
const MODIFIER_KEYS = new Set([
  "Alt",
  "AltGraph",
  "CapsLock",
  "Control",
  "Fn",
  "FnLock",
  "Hyper",
  "Meta",
  "NumLock",
  "OS",
  "ScrollLock",
  "Shift",
  "Super",
  "Symbol",
  "SymbolLock",
]);

/**
 * Records on the root element whether the last input was a pointer or the
 * keyboard, as `data-input`, so the window focus ring can show only for
 * keyboard use. A modifier alone, or a shortcut with Control, Alt, or Meta,
 * leaves it unchanged; Shift with another key, as in Shift+Tab, counts.
 * Returns a function that stops tracking.
 */
export function trackInputModality(document: Document): () => void {
  const root = document.documentElement;
  const onKeyDown = (event: KeyboardEvent) => {
    if (MODIFIER_KEYS.has(event.key)) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    root.dataset.input = "keyboard";
  };
  const onPointerDown = () => {
    root.dataset.input = "pointer";
  };
  // Capture, so content that stops a key or press still updates it.
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    delete root.dataset.input;
  };
}
