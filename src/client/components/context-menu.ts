import { state } from "../state";
import { Article } from "../types";

export function closeAllCardMenus(): void {
  document.querySelectorAll(".card-dropdown-menu.open, #cardContextMenu.open").forEach((m) => m.classList.remove("open"));
}

export function openCardContextMenu(e: MouseEvent, article: any): void {
  e.preventDefault();
  e.stopPropagation();
  closeAllCardMenus();

  const menu = document.getElementById("cardContextMenu");
  if (!menu) return;

  menu.style.top = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  menu.classList.add("open");
}

export function openBatchContextMenu(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
  closeAllCardMenus();

  const menu = document.getElementById("cardContextMenu");
  if (!menu) return;

  menu.style.top = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  menu.classList.add("open");
}

export function closeCardContextMenu(): void {
  const menu = document.getElementById("cardContextMenu");
  if (menu) menu.classList.remove("open");
}

export function handleCardContextMenu(event: MouseEvent, id: number): void {
  const article = state.allEntries.find((e) => e.id === id);
  if (article) {
    openCardContextMenu(event, article);
  }
}
