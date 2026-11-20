export interface CornerRadii {
  tl: number;
  tr: number;
}

export interface CurvedProgressGeometry {
  d: string;
  height: number;
}

let lastWidth = -1;
let lastTl = -1;
let lastTr = -1;
let listenersBound = false;

/** Parse JSON corner radii string from native Android bridge. */
export function parseCornerRadii(raw: string | null | undefined): CornerRadii {
  if (!raw || typeof raw !== "string") return { tl: 0, tr: 0 };
  try {
    const parsed = JSON.parse(raw);
    const tl = Number(parsed?.tl);
    const tr = Number(parsed?.tr);
    return {
      tl: Number.isFinite(tl) && tl > 0 ? tl : 0,
      tr: Number.isFinite(tr) && tr > 0 ? tr : 0,
    };
  } catch {
    return { tl: 0, tr: 0 };
  }
}

/** Query hardware display top corner radii (in CSS px) from AndroidNative when available. */
export function getNativeTopCornerRadii(): CornerRadii {
  try {
    const w = typeof window !== "undefined" ? (window as any) : undefined;
    if (w?.AndroidNative && typeof w.AndroidNative.getTopCornerRadii === "function") {
      return parseCornerRadii(w.AndroidNative.getTopCornerRadii());
    }
  } catch {
    // Ignore bridge errors and fall back to straight bar
  }
  return { tl: 0, tr: 0 };
}

export const DEFAULT_CORNER_ARC_DEG = 45;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Build an SVG path that hugs the top-left and top-right rounded display corners
 * concentrically for `arcDeg` degrees (default 45° — half of the corner curve,
 * so it stops at the corner diagonal instead of wrapping down the side edges).
 */
export function buildCurvedProgressPath(
  width: number,
  tlRadius: number,
  trRadius: number,
  inset = 2,
  arcDeg = DEFAULT_CORNER_ARC_DEG
): CurvedProgressGeometry {
  const w = Math.max(0, Number.isFinite(width) ? width : 0);
  const ins = Math.max(0, Number.isFinite(inset) ? inset : 2);
  const tl = Math.min(Math.max(0, Number.isFinite(tlRadius) ? tlRadius : 0), w / 2);
  const tr = Math.min(Math.max(0, Number.isFinite(trRadius) ? trRadius : 0), w / 2);

  const clampedDeg = Math.min(90, Math.max(0, Number.isFinite(arcDeg) ? arcDeg : DEFAULT_CORNER_ARC_DEG));
  const rad = (clampedDeg * Math.PI) / 180;
  const sinA = Math.sin(rad);
  const cosA = Math.cos(rad);

  const aL = Math.max(0, tl - ins);
  const aR = Math.max(0, tr - ins);

  const xStart = aL > 0 ? round2(ins + aL * (1 - sinA)) : 0;
  const yStart = aL > 0 ? round2(ins + aL * (1 - cosA)) : ins;
  const xTopLeft = aL > 0 ? round2(ins + aL) : 0;

  const xTopRight = aR > 0 ? round2(w - ins - aR) : w;
  const xEnd = aR > 0 ? round2(w - ins - aR * (1 - sinA)) : w;
  const yEnd = aR > 0 ? round2(ins + aR * (1 - cosA)) : ins;

  const parts: string[] = [`M ${xStart} ${yStart}`];
  if (aL > 0) {
    parts.push(`A ${aL} ${aL} 0 0 1 ${xTopLeft} ${ins}`);
  }
  parts.push(`L ${xTopRight} ${ins}`);
  if (aR > 0) {
    parts.push(`A ${aR} ${aR} 0 0 1 ${xEnd} ${yEnd}`);
  }

  return {
    d: parts.join(" "),
    height: Math.ceil(Math.max(yStart, yEnd, 6) + 6),
  };
}

/** Recompute the progress bar mode (curved SVG vs straight div) and SVG geometry. */
export function refreshProgressBarGeometry(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;

  const barEl = document.getElementById("readingProgress");
  const svgEl = document.getElementById("readingProgressSvg") as SVGSVGElement | null;
  const pathEl = document.getElementById("readingProgressPath") as SVGPathElement | null;
  if (!svgEl || !pathEl) return false;

  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const radii = getNativeTopCornerRadii();
  const useCurved = width > 0 && (radii.tl > 0 || radii.tr > 0);

  if (!useCurved) {
    svgEl.style.display = "none";
    if (barEl) barEl.style.display = "block";
    lastWidth = width;
    lastTl = 0;
    lastTr = 0;
    return false;
  }

  if (width !== lastWidth || radii.tl !== lastTl || radii.tr !== lastTr) {
    const { d, height } = buildCurvedProgressPath(width, radii.tl, radii.tr);
    svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgEl.style.height = `${height}px`;
    pathEl.setAttribute("d", d);
    lastWidth = width;
    lastTl = radii.tl;
    lastTr = radii.tr;
  }

  if (barEl) barEl.style.display = "none";
  svgEl.style.display = "block";
  return true;
}

/** Set the reading progress percentage (0..100) on whichever indicator is active. */
export function setReadingProgress(percent: number): void {
  if (typeof document === "undefined") return;
  const pct = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));

  const barEl = document.getElementById("readingProgress");
  if (barEl) {
    barEl.style.width = `${pct}%`;
  }

  const isCurved = refreshProgressBarGeometry();
  if (isCurved) {
    const pathEl = document.getElementById("readingProgressPath") as SVGPathElement | null;
    if (pathEl) {
      pathEl.style.strokeDashoffset = String(100 - pct);
      pathEl.style.opacity = pct > 0.05 ? "1" : "0";
    }
  }
}

/** Initialize curved progress bar geometry and resize/orientation listeners. */
export function initReadingProgressBar(): void {
  if (typeof window === "undefined") return;
  refreshProgressBarGeometry();
  if (!listenersBound) {
    listenersBound = true;
    const onResize = () => refreshProgressBarGeometry();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
  }
}
