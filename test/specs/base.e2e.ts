import { BasePage } from "../pageobjects/base";

describe("Menu Behavior", () => {
  it("should show/hide based on clicking and hovering", async () => {
    const {
      fileMenuButton,
      fileMenuItems,
      viewMenuItems,
      viewMenuButton,
      open,
    } = BasePage;
    await open("");
    await expect(fileMenuButton).toBeExisting();
    await expect(fileMenuItems).toBeExisting();
    // Click the File menu to show it, then click it again to hide it.
    await expect(fileMenuItems).not.toBeDisplayed();
    fileMenuButton.click();
    await expect(fileMenuItems).toBeDisplayed();
    fileMenuButton.click();
    await expect(fileMenuItems).not.toBeDisplayed();

    // Click the View menu to show it, then click it again to hide it.
    await expect(viewMenuItems).not.toBeDisplayed();
    viewMenuButton.click();
    await expect(viewMenuItems).toBeDisplayed();
    viewMenuButton.click();
    await expect(viewMenuItems).not.toBeDisplayed();

    // Click the File menu to show it, then hover the View menu to hide the File menu.
    await expect(fileMenuItems).not.toBeDisplayed();
    fileMenuButton.click();
    await expect(fileMenuItems).toBeDisplayed();
    await viewMenuButton.moveTo();
    await viewMenuItems.waitForDisplayed();
    await expect(fileMenuItems).not.toBeDisplayed();

    //Hover back to the File menu to show it, and make sure the View menu hides.
    await fileMenuButton.moveTo();
    await fileMenuButton.waitForDisplayed();
    await expect(viewMenuItems).not.toBeDisplayed();
  });
});
