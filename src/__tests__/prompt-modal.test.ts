import { describe, it, expect, beforeEach } from "vitest";
import { parseHTML } from "linkedom";
import {
  showPromptDialog,
  handlePromptModalSubmit,
  handlePromptModalCancel,
} from "../client/modals/prompt";

describe("Prompt Modal Dialog Component", () => {
  beforeEach(() => {
    const { document, window } = parseHTML(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="modal-backdrop" id="promptModal">
            <h3 id="promptModalTitle"></h3>
            <div id="promptModalMsg"></div>
            <input type="text" id="promptModalInput" />
            <button id="promptModalBtn">Save</button>
          </div>
        </body>
      </html>
    `);
    (global as any).document = document;
    (global as any).window = window;
  });

  it("populates title, message, defaultValue, placeholder, and resolves with value on submit", async () => {
    const promise = showPromptDialog(
      "Rename Token",
      "Enter new name:",
      "Original Name",
      "Update",
      "e.g. My Token"
    );

    const titleEl = document.getElementById("promptModalTitle");
    const msgEl = document.getElementById("promptModalMsg");
    const inputEl = document.getElementById("promptModalInput") as HTMLInputElement;
    const btn = document.getElementById("promptModalBtn");

    expect(titleEl?.textContent).toBe("Rename Token");
    expect(msgEl?.textContent).toBe("Enter new name:");
    expect(inputEl.value).toBe("Original Name");
    expect(inputEl.placeholder).toBe("e.g. My Token");
    expect(btn?.textContent).toBe("Update");

    // User types new name
    inputEl.value = "New Token Name";
    handlePromptModalSubmit();

    const result = await promise;
    expect(result).toBe("New Token Name");
  });

  it("resolves with null when cancelled", async () => {
    const promise = showPromptDialog("Test", "Message", "Initial");
    handlePromptModalCancel();

    const result = await promise;
    expect(result).toBeNull();
  });
});
