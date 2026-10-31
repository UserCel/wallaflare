import { describe, it, expect, beforeEach } from "vitest";
import { parseHTML } from "linkedom";
import { openModal, closeModal } from "../client/modals/manager";
import {
  showConfirmDialog,
  handleConfirmModalOk,
  handleConfirmModalCancel
} from "../client/modals/confirm";

describe("Modals Manager & Confirm Dialog Unit Tests", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="modal-backdrop" id="testModal">
            <input id="testInput" />
          </div>
          <div class="modal-backdrop" id="addUrlModal">
            <input id="urlInput" />
          </div>
          <div class="modal-backdrop" id="confirmModal">
            <h3 id="confirmModalTitle"></h3>
            <div id="confirmModalMsg"></div>
            <button id="confirmModalBtn" class="btn btn-primary">Confirm</button>
          </div>
        </body>
      </html>
    `);

    (global as any).document = document;
    (global as any).window = window;
  });

  it("opens modal and adds open class", () => {
    const modal = document.getElementById("testModal");
    expect(modal?.classList.contains("open")).toBe(false);

    openModal("testModal");
    expect(modal?.classList.contains("open")).toBe(true);
  });

  it("closes modal, removes open class, and resets inline display", () => {
    const modal = document.getElementById("testModal");
    openModal("testModal");
    modal!.style.display = "block";
    expect(modal?.classList.contains("open")).toBe(true);

    closeModal("testModal");
    expect(modal?.classList.contains("open")).toBe(false);
    expect(modal?.style.display).toBe("");
  });

  it("showConfirmDialog sets title, message, button label, opens confirmModal, and resolves true on OK", async () => {
    const promise = showConfirmDialog("Delete Article", "Are you sure?", "Delete Now", true);

    const title = document.getElementById("confirmModalTitle");
    const msg = document.getElementById("confirmModalMsg");
    const btn = document.getElementById("confirmModalBtn");
    const modal = document.getElementById("confirmModal");

    expect(title?.textContent).toBe("Delete Article");
    expect(msg?.textContent).toBe("Are you sure?");
    expect(btn?.textContent).toBe("Delete Now");
    expect(modal?.classList.contains("open")).toBe(true);

    handleConfirmModalOk();

    const result = await promise;
    expect(result).toBe(true);
    expect(modal?.classList.contains("open")).toBe(false);
  });

  it("showConfirmDialog unescapes literal backslash-n to real newlines in modal message", async () => {
    const promise = showConfirmDialog(
      "Delete Articles",
      "Are you sure you want to delete 2 articles?\\n\\nThis action cannot be undone.",
      "Delete",
      true
    );
    const msg = document.getElementById("confirmModalMsg");
    expect(msg?.textContent).toBe("Are you sure you want to delete 2 articles?\n\nThis action cannot be undone.");
    expect(msg?.textContent).not.toContain("\\n");

    handleConfirmModalCancel();
    await promise;
  });

  it("showConfirmDialog resolves false on Cancel", async () => {
    const promise = showConfirmDialog("Wipe Data", "Reset database?", "Wipe", false);
    const modal = document.getElementById("confirmModal");
    expect(modal?.classList.contains("open")).toBe(true);

    handleConfirmModalCancel();

    const result = await promise;
    expect(result).toBe(false);
    expect(modal?.classList.contains("open")).toBe(false);
  });
});
