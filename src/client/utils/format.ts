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

export function formatCardDate(dateInput?: string | number | Date | null): { label: string; tooltip: string } {
  if (!dateInput) return { label: "", tooltip: "" };
  const d = typeof dateInput === "object" && dateInput instanceof Date ? dateInput : new Date(dateInput);
  const time = d.getTime();
  if (isNaN(time)) return { label: "", tooltip: "" };

  const tooltip = d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 45) return { label: "Just now", tooltip };
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { label: diffMin + "m ago", tooltip };
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return { label: diffHour + "h ago", tooltip };
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return { label: diffDay + "d ago", tooltip };
  if (diffDay < 30) {
    const diffWeek = Math.floor(diffDay / 7);
    return { label: diffWeek + "w ago", tooltip };
  }

  const currentYear = new Date().getFullYear();
  if (d.getFullYear() === currentYear) {
    return {
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      tooltip
    };
  }
  return {
    label: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    tooltip
  };
}
