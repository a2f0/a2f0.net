import path from "node:path";
import fs from "node:fs";

import waitForFileExists from "../lib/fs";
import PdfPage from "../pageobjects/pdf.page";
import { testDownloadDir } from "../testDownloadDir";

describe("PDF Resume", () => {
  it("should load", async () => {
    await PdfPage.open();
    await expect(PdfPage.pdfResume).toBeExisting();
  });
  it("should download a pdf", async () => {
    await PdfPage.open();
    await expect(PdfPage.fileMenuButton).toBeExisting();
    await expect(PdfPage.fileMenuItems).toBeExisting();
    await expect(PdfPage.fileMenuItems).not.toBeDisplayed();
    await expect(PdfPage.downloadPdfMenuOption).not.toBeDisplayed();
    await expect(PdfPage.fileMenuButton).toBeClickable();
    await PdfPage.fileMenuButton.click();
    await expect(PdfPage.fileMenuItems).toBeDisplayed();
    await expect(PdfPage.downloadPdfMenuOption).toBeDisplayed();
    await expect(PdfPage.downloadPdfMenuOption).toBeClickable();
    const filePath = path.join(testDownloadDir, "dan.sullivan.resume.pdf");
    await expect(fs.existsSync(filePath)).toBe(false);
    await PdfPage.downloadPdfMenuOption.click();
    await browser.call(async () => {
      return await waitForFileExists(filePath, 3000);
    });
    await expect(PdfPage.downloadPdfMenuOption).not.toBeDisplayed();
  });
  it("should have correct width styling for PDF container", async () => {
    await PdfPage.open();
    await PdfPage.pdfResume.waitForDisplayed();

    const containerWidth = await PdfPage.pdfResume.getCSSProperty("width");

    await expect(containerWidth.value).toBe("1275px");

    const viewportWidth = await browser.execute(() => window.innerWidth);

    const containerPixelWidth = await PdfPage.pdfResume.getSize("width");

    const widthDifference = Math.abs(containerPixelWidth - viewportWidth);
    await expect(widthDifference).toBe(91);
  });
});
