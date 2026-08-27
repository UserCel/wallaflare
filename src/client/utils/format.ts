export function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export function formatReadingTime(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  return `${minutes}m`;
}

export function sanitizeFileName(name: string, ext: string = ""): string {
  const safe = (name || "untitled").replace(/[/\\:*?"<>|]/g, "").trim();
  return ext ? `${safe}.${ext.replace(/^\./, "")}` : safe;
}
