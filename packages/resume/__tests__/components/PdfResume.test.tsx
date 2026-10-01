import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";
import PdfResume from "../../components/PdfResume";
import invariant from "invariant";
import { store } from "../../lib/store";

vi.mock("pdfobject", () => {
  const mockEmbed = vi.fn();
  return {
    default: {
      embed: mockEmbed,
    },
  };
});

vi.mock("@a2f0/shared/pdfResumeFactory", () => {
  return {
    default: class PdfResumeFactory {
      getResume() {
        return {
          output: vi.fn().mockReturnValue("mock-pdf-data-uri"),
        };
      }
    },
  };
});

describe("PdfResume", () => {
  it("renders with correct width styling", () => {
    const { container } = render(
      <Provider store={store}>
        <PdfResume />
      </Provider>,
    );

    const pdfContainer = container.querySelector("#pdfObjectContainer");
    invariant(pdfContainer, "pdfContainer is not found");
    const styles = window.getComputedStyle(pdfContainer);
    expect(styles.getPropertyValue("width")).toBe("100%");
    expect(window.innerWidth).toBe(1024);
  });
});
