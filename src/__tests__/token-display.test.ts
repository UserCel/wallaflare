import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseHTML } from "linkedom";
import { showCreatedTokenModal, copyTokenDisplayValue, closeTokenDisplayModal } from "../client/modals/token-display";

describe("Token Display Modal Subsystem", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="tokenDisplayModal" class="modal-backdrop">
            <label id="tokenDisplayLabel"></label>
            <input type="text" id="tokenDisplayValue" />
            <button id="copyTokenDisplayBtn">Copy</button>
          </div>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const mockNav = {
      clipboard: {
        writeText: writeTextMock
      }
    };
    try {
      Object.defineProperty(window, "navigator", {
        value: mockNav,
        configurable: true
      });
    } catch (e) {}
    try {
      Object.defineProperty(globalThis, "navigator", {
        value: mockNav,
        configurable: true
      });
    } catch (e) {}
    vi.clearAllMocks();
  });

  it("populates token value and label, and opens tokenDisplayModal", () => {
    showCreatedTokenModal("wf_pat_test123", "KOReader E-Reader");
    const modal = document.getElementById("tokenDisplayModal");
    const valInput = document.getElementById("tokenDisplayValue") as HTMLInputElement;
    const lbl = document.getElementById("tokenDisplayLabel");

    expect(modal?.classList.contains("open")).toBe(true);
    expect(valInput.value).toBe("wf_pat_test123");
    expect(lbl?.textContent).toBe("Token: KOReader E-Reader");
  });

  it("copies token display value to clipboard", async () => {
    const valInput = document.getElementById("tokenDisplayValue") as HTMLInputElement;
    valInput.value = "secret_pat_999";

    const copyBtn = document.getElementById("copyTokenDisplayBtn") as HTMLElement;
    copyTokenDisplayValue(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("secret_pat_999");
  });

  it("closes token display modal", () => {
    const modal = document.getElementById("tokenDisplayModal");
    modal?.classList.add("open");
    closeTokenDisplayModal();
    expect(modal?.classList.contains("open")).toBe(false);
  });
});
