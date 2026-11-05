import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import DropdownMenu from "../../../components/menu/DropdownMenu";
import MenuParent from "../../../components/menu/MenuParent";
import { store } from "../../../lib/store";

const renderMenuBar = () => {
  render(
    <Provider store={store}>
      <MenuParent>
        <DropdownMenu label="File">
          <button type="button">Print</button>
        </DropdownMenu>
        <DropdownMenu label="View">
          <button type="button">Zoom</button>
        </DropdownMenu>
      </MenuParent>
      <p>Page</p>
    </Provider>,
  );
  return {
    file: screen.getByRole("button", { name: "File" }),
    view: screen.getByRole("button", { name: "View" }),
  };
};

const expanded = (button: HTMLElement) => button.getAttribute("aria-expanded");

describe("resume menu bar", () => {
  it("opens and closes a menu from its button", () => {
    const { file, view } = renderMenuBar();
    fireEvent.click(file);
    expect([expanded(file), expanded(view)]).toEqual(["true", "false"]);
    fireEvent.click(file);
    expect([expanded(file), expanded(view)]).toEqual(["false", "false"]);
  });

  it("moves to the menu under the pointer only while one is open", () => {
    const { file, view } = renderMenuBar();
    fireEvent.mouseEnter(view);
    expect(expanded(view)).toBe("false");
    fireEvent.click(file);
    fireEvent.mouseEnter(view);
    expect([expanded(file), expanded(view)]).toEqual(["false", "true"]);
  });

  it("opens another menu pressed while one is open", () => {
    // The click reaches the open File menu's outside-click listener after
    // View's button handles it; it used to close View again.
    const { file, view } = renderMenuBar();
    fireEvent.click(file);
    fireEvent.click(view);
    expect([expanded(file), expanded(view)]).toEqual(["false", "true"]);
  });

  it("closes on a click outside, on Escape, and leaves clicks inside alone", () => {
    const { file } = renderMenuBar();
    fireEvent.click(file);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(expanded(file)).toBe("true");
    fireEvent.click(screen.getByText("Page"));
    expect(expanded(file)).toBe("false");
    fireEvent.click(file);
    fireEvent.keyDown(file, { key: "Escape" });
    expect(expanded(file)).toBe("false");
  });
});
