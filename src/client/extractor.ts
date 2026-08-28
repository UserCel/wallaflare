import { extractArticleFromDom, ExtractedArticle } from "../services/extractor";
import { isCapacitorApp, apiPost } from "./sync/api";
import { parseHTML } from "linkedom";

export type ParserMode = "auto" | "device" | "server";

let memoryParserMode: ParserMode | null = null;

export function getParserMode(): ParserMode {
  // Web browsers do not support native CORS bypass; always force server mode
  if (!isCapacitorApp()) {
    return "server";
  }

  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("wf_parser_mode");
      if (saved === "device" || saved === "server" || saved === "auto") {
        return saved;
      }
    }
  } catch {}
  if (memoryParserMode) return memoryParserMode;
  return "auto";
}

export function setParserMode(mode: ParserMode): void {
  memoryParserMode = mode;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("wf_parser_mode", mode);
    }
  } catch {}
  if (typeof window !== "undefined" && isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
    const plugins = (window as any).Capacitor.Plugins;
    const nativePlugin = plugins?.WallaflareNative || plugins?.WallaflareNativePlugin;
    if (nativePlugin && typeof nativePlugin.setParserMode === "function") {
      nativePlugin.setParserMode({ mode }).catch(() => {});
    }
  }
}

export function isValidArticleContent(content?: string, textContent?: string): boolean {
  if (!content || typeof content !== "string") return false;
  const rawText = (textContent || content.replace(/<[^>]*>/g, " ")).trim();
  // If text is minimal (< 40 chars), it is an empty stub or failed extraction
  if (rawText.length < 40) return false;
  // If it's just a raw link fallback like <p><a href="http...">http...</a></p>
  if (/^https?:\/\/[^\s]+$/i.test(rawText.replace(/\s+/g, ""))) return false;
  // If it's a known bot / captcha error page
  if (/^(403 Forbidden|Access Denied|Security Check|Cloudflare Turnstile|Just a moment\.\.\.|Please wait\.\.\.)/i.test(rawText)) return false;
  return true;
}

export function clientExtractArticleFromHtml(html: string, originalUrl?: string): ExtractedArticle {
  let doc: any;
  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const parser = new window.DOMParser();
    doc = parser.parseFromString(html, "text/html");
  } else if (typeof document !== "undefined" && document.implementation) {
    doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = html;
  } else {
    // Fallback for Node/test environments
    doc = parseHTML(html).document;
  }
  return extractArticleFromDom(doc, originalUrl, html);
}

export async function clientFetchHtml(url: string): Promise<{ html: string; finalUrl?: string; status: number }> {
  // 1. In Capacitor Native App: use WallaflareNativePlugin.fetchUrl (bypasses CORS with mobile headers)
  if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
    const plugins = (window as any).Capacitor.Plugins;
    const nativePlugin = plugins?.WallaflareNative || plugins?.WallaflareNativePlugin;
    if (nativePlugin && typeof nativePlugin.fetchUrl === "function") {
      try {
        const res = await nativePlugin.fetchUrl({ url });
        if (res && res.html) {
          return {
            html: res.html,
            finalUrl: res.finalUrl || url,
            status: res.status || 200,
          };
        }
      } catch (nativeErr: any) {
        console.warn("[ClientScraper] Native plugin fetchUrl failed:", nativeErr);
        throw new Error(`Native fetch failed: ${nativeErr?.message || nativeErr}`);
      }
    } else {
      throw new Error("Native fetch bridge not available in installed APK build. Please rebuild and install the latest Android APK, or switch to 'Auto' / 'Server' mode in Settings.");
    }
  }

  // 2. Browser standard fetch (works for same-origin or CORS-enabled endpoints)
  const res = await fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: Failed to fetch ${url}`);
  }

  const html = await res.text();
  return {
    html,
    finalUrl: res.url || url,
    status: res.status,
  };
}

export async function clientExtractArticle(url: string): Promise<ExtractedArticle> {
  const { html, finalUrl } = await clientFetchHtml(url);
  if (!html || html.trim().length === 0) {
    throw new Error("Empty response received from target URL");
  }
  const extracted = clientExtractArticleFromHtml(html, finalUrl || url);
  if (!isValidArticleContent(extracted.content, extracted.textContent)) {
    throw new Error("Could not extract readable article text from HTML (page may be JS-rendered or blocked)");
  }
  return extracted;
}

export interface SaveArticleResult {
  ok: boolean;
  alreadyExists?: boolean;
  emptyContent?: boolean;
  cpuLimitExceeded?: boolean;
  data?: any;
  error?: string;
  parserUsed?: "device" | "server";
}

export async function saveArticleWithFallback(
  url: string,
  tags?: string | string[],
  options?: { title?: string }
): Promise<SaveArticleResult> {
  const saveViaServer = async (): Promise<SaveArticleResult> => {
    const res = await apiPost("/api/entries.json", {
      url,
      tags,
      title: options?.title,
    });
    
    if (!res.ok) {
      let errMessage = `Server request failed (status ${res.status})`;
      const raw = res.rawText || (res.data as any)?.error || "";
      const isCpuLimit = /exceeded CPU time limit|CPU limit|Worker exceeded/i.test(raw);
      if (isCpuLimit) {
        errMessage = "⚡ Cloudflare Worker exceeded CPU time limit on this large webpage. Tip: Extract via the Wallaflare Android App (on-device parser) or save as Custom Text.";
      } else if (raw && typeof raw === "string") {
        errMessage = raw;
      }
      return {
        ok: false,
        cpuLimitExceeded: isCpuLimit,
        data: res.data,
        error: errMessage,
        parserUsed: "server",
      };
    }

    const alreadyExists = Boolean((res.data as any)?.already_exists);
    const content = (res.data as any)?.content || "";
    const isStub = !isValidArticleContent(content);

    return {
      ok: true,
      alreadyExists,
      emptyContent: isStub,
      data: res.data,
      error: isStub ? "Saved link bookmark only (article body could not be extracted by server)" : undefined,
      parserUsed: "server",
    };
  };

  // On standard desktop/mobile web browsers, always route directly to server
  if (!isCapacitorApp()) {
    return await saveViaServer();
  }

  const mode = getParserMode();
  // If server mode is explicitly selected on the Android app
  if (mode === "server") {
    return await saveViaServer();
  }

  // Device mode or Auto mode in Capacitor App: Attempt client-side extraction first
  try {
    const extracted = await clientExtractArticle(url);
    const payload = {
      url,
      title: options?.title || extracted.title,
      content: extracted.content,
      preview_picture: extracted.previewPicture,
      domain_name: extracted.domainName,
      reading_time: extracted.readingTime,
      language: extracted.language,
      author: extracted.byline,
      published_at: extracted.publishedAt,
      tags,
    };

    const res = await apiPost("/api/entries.json", payload);
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    return {
      ok: true,
      alreadyExists: Boolean((res.data as any)?.already_exists),
      data: res.data,
      parserUsed: "device",
    };
  } catch (err: any) {
    if (mode === "auto") {
      console.warn("[ClientScraper] Client extraction failed, attempting server fallback:", err);
      const serverResult = await saveViaServer();
      return serverResult;
    }

    // Device-only mode: fail without server fallback
    console.error("[ClientScraper] Device-only scraping error:", err);
    return {
      ok: false,
      error: err?.message || "Failed to extract article on device",
      parserUsed: "device",
    };
  }
}
