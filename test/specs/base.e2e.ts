import {BasePage} from '../pageobjects/base';

describe('Menu Behavior', () => {
  it('should show/hide based on clicking and hovering', async () => {
    await BasePage.open('');
    await expect(BasePage.fileMenuButton).toBeExisting();
    await expect(BasePage.fileMenuItems).toBeExisting();
    // Click the File menu to show it, then click it again to hide it.
    await expect(BasePage.fileMenuItems).not.toBeDisplayed();
    BasePage.fileMenuButton.click();
    await expect(BasePage.fileMenuItems).toBeDisplayed();
    BasePage.fileMenuButton.click();
    await expect(BasePage.fileMenuItems).not.toBeDisplayed();

    // Click the View menu to show it, then click it again to hide it.
    await expect(BasePage.viewMenuItems).not.toBeDisplayed();
    BasePage.viewMenuButton.click();
    await expect(BasePage.viewMenuItems).toBeDisplayed();
    BasePage.viewMenuButton.click();
    await expect(BasePage.viewMenuItems).not.toBeDisplayed();

    // Click the File menu to show it, then hover the View menu to hide the File menu.
    await expect(BasePage.fileMenuItems).not.toBeDisplayed();
    BasePage.fileMenuButton.click();
    await expect(BasePage.fileMenuItems).toBeDisplayed();
    await BasePage.viewMenuButton.moveTo();
    await BasePage.viewMenuItems.waitForDisplayed();
    await expect(BasePage.fileMenuItems).not.toBeDisplayed();

    //Hover back to the File menu to show it, and make sure the View menu hides.
    await BasePage.fileMenuButton.moveTo();
    await BasePage.fileMenuButton.waitForDisplayed();
    await expect(BasePage.viewMenuItems).not.toBeDisplayed();
  });
});
