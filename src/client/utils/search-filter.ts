export function matchesArticleSearch(entry: any, rawQuery: string): boolean {
  const q = (rawQuery || "").trim();
  if (!q) return true;
  if (!entry) return false;

  const tokens = q.split(/\s+/).filter(Boolean);
  const entryTags: string[] = Array.isArray(entry.tags)
    ? entry.tags.flatMap((t: any) =>
        typeof t === "string"
          ? [t.toLowerCase()]
          : [String(t?.slug || "").toLowerCase(), String(t?.label || "").toLowerCase()].filter(Boolean)
      )
    : [];
  const anns: any[] = Array.isArray(entry.annotations) ? entry.annotations : [];
  const annText = anns
    .map((a) => `${a?.quote || ""} ${a?.text || ""}`.toLowerCase())
    .join(" ");

  const searchable = [
    entry.title || "",
    entry.domain_name || "",
    entry.author || "",
    entry.text || "",
    entryTags.join(" "),
    annText,
  ]
    .join(" ")
    .toLowerCase();

  for (const tok of tokens) {
    const lower = tok.toLowerCase();

    if (lower.startsWith("tag:")) {
      const target = lower.slice(4).replace(/^#+/, "");
      if (!target) continue;
      if (!entryTags.some((t) => t === target || t.includes(target))) return false;
      continue;
    }

    if (lower.startsWith("domain:")) {
      const target = lower.slice(7);
      if (!target) continue;
      const dom = String(entry.domain_name || "").toLowerCase();
      if (!dom.includes(target)) return false;
      continue;
    }

    if (lower === "is:untagged") {
      if (entryTags.length > 0) return false;
      continue;
    }

    if (lower === "is:annotated") {
      if (anns.length === 0) return false;
      continue;
    }

    if (lower.startsWith("time:<")) {
      const maxMin = Number(lower.slice(6));
      if (!isNaN(maxMin) && Number(entry.reading_time || 1) >= maxMin) return false;
      continue;
    }

    if (lower.startsWith("time:>")) {
      const minMin = Number(lower.slice(6));
      if (!isNaN(minMin) && Number(entry.reading_time || 1) <= minMin) return false;
      continue;
    }

    if (!searchable.includes(lower)) return false;
  }

  return true;
}
