export const $id = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  typeof document !== "undefined" ? (document.getElementById(id) as T | null) : null;

export const $all = <T extends HTMLElement = HTMLElement>(selector: string, parent: ParentNode = document): T[] =>
  typeof document !== "undefined" ? Array.from(parent.querySelectorAll(selector)) : [];

export function setText(idOrEl: string | HTMLElement | null, text: string | number): void {
  const el = typeof idOrEl === "string" ? $id(idOrEl) : idOrEl;
  if (el) el.textContent = String(text);
}

export function setHtml(idOrEl: string | HTMLElement | null, html: string): void {
  const el = typeof idOrEl === "string" ? $id(idOrEl) : idOrEl;
  if (el) el.innerHTML = html;
}

export function toggleClass(idOrEl: string | HTMLElement | null, className: string, force?: boolean): void {
  const el = typeof idOrEl === "string" ? $id(idOrEl) : idOrEl;
  if (el) el.classList.toggle(className, force);
}

export function addClass(idOrEl: string | HTMLElement | null, ...classNames: string[]): void {
  const el = typeof idOrEl === "string" ? $id(idOrEl) : idOrEl;
  if (el) el.classList.add(...classNames);
}

export function removeClass(idOrEl: string | HTMLElement | null, ...classNames: string[]): void {
  const el = typeof idOrEl === "string" ? $id(idOrEl) : idOrEl;
  if (el) el.classList.remove(...classNames);
}

export function setVisible(idOrEl: string | HTMLElement | null, visible: boolean, displayStyle: string = "block"): void {
  const el = typeof idOrEl === "string" ? $id(idOrEl) : idOrEl;
  if (el) el.style.display = visible ? displayStyle : "none";
}

export function getInputValue(id: string): string {
  const input = $id<HTMLInputElement | HTMLTextAreaElement>(id);
  return input ? input.value.trim() : "";
}

export function setInputValue(id: string, value: string): void {
  const input = $id<HTMLInputElement | HTMLTextAreaElement>(id);
  if (input) input.value = value;
}
