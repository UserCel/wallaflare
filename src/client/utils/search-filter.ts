function matchSingleToken(entry: any, lower: string, entryTags: string[], anns: any[], searchable: string): boolean {
  if (lower.startsWith("tag:")) {
    const target = lower.slice(4).replace(/^#+/, "");
    if (!target) return true;
    return entryTags.some((t) => t === target || t.includes(target));
  }

  if (lower.startsWith("domain:") || lower.startsWith("site:")) {
    const target = lower.startsWith("domain:") ? lower.slice(7) : lower.slice(5);
    if (!target) return true;
    const dom = String(entry.domain_name || "").toLowerCase();
    return dom.includes(target);
  }

  if (lower === "is:unread") {
    return !entry.is_archived;
  }

  if (lower === "is:archived" || lower === "is:read") {
    return Boolean(entry.is_archived);
  }

  if (lower === "is:starred") {
    return Boolean(entry.is_starred);
  }

  if (lower === "is:untagged") {
    return entryTags.length === 0;
  }

  if (lower === "is:annotated" || lower === "has:highlights") {
    return anns.length > 0;
  }

  if (lower.startsWith("time:<")) {
    const maxMin = Number(lower.slice(6));
    if (!isNaN(maxMin) && Number(entry.reading_time || 1) >= maxMin) return false;
    return true;
  }

  if (lower.startsWith("time:>")) {
    const minMin = Number(lower.slice(6));
    if (!isNaN(minMin) && Number(entry.reading_time || 1) <= minMin) return false;
    return true;
  }

  return searchable.includes(lower);
}

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
    entry.excerpt || "",
    entry.text || "",
    entryTags.join(" "),
    annText,
  ]
    .join(" ")
    .toLowerCase();

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    const isNegated = lower.startsWith("-") && lower.length > 1;
    const term = isNegated ? lower.slice(1) : lower;
    const matched = matchSingleToken(entry, term, entryTags, anns, searchable);
    if (isNegated ? matched : !matched) return false;
  }

  return true;
}
