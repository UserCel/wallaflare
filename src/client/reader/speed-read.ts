// Wallaflare Speed Read (RSVP) Focus Engine
// Implements an Optimal Recognition Point (ORP) Fixed-Focal Reticle Presentation

export interface SpeedReadToken {
  word: string;
  clean: string;
  orpIndex: number;
  delayMultiplier: number;
  sentenceIndex: number;
  isParagraphEnd?: boolean;
}

interface SpeedReadState {
  tokens: SpeedReadToken[];
  sentences: string[];
  currentIndex: number;
  initialIndex: number;
  initialScrollTop: number;
  isPlaying: boolean;
  isRtl: boolean;
  wpm: number;
  fontSize: number;
  fontFamily: 'serif' | 'sans';
  timerId: any;
  isOpen: boolean;
}

function getStoredWpm(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('wf_speed_read_wpm');
      if (stored) return parseInt(stored, 10);
    }
  } catch (e) {}
  return 350;
}

function getStoredFontSize(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('wf_speed_read_font_size');
      if (stored) return parseInt(stored, 10);
    }
  } catch (e) {}
  return 76;
}

function getStoredFontFamily(): 'serif' | 'sans' {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('wf_speed_read_font_family');
      if (stored === 'sans' || stored === 'serif') return stored;
    }
  } catch (e) {}
  return 'serif';
}

const state: SpeedReadState = {
  tokens: [],
  sentences: [],
  currentIndex: 0,
  initialIndex: 0,
  initialScrollTop: 0,
  isPlaying: false,
  isRtl: false,
  wpm: getStoredWpm(),
  fontSize: getStoredFontSize(),
  fontFamily: getStoredFontFamily(),
  timerId: null,
  isOpen: false
};

export function isRtlText(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
}

function getActiveArticleId(): number | string | null {
  if (typeof window !== 'undefined') {
    if ((window as any).activeArticleId) return (window as any).activeArticleId;
    if (typeof (window as any).getActiveArticleId === 'function') {
      const id = (window as any).getActiveArticleId();
      if (id) return id;
    }
  }
  const readingCard = document.querySelector('.article-card.is-reading') as HTMLElement;
  if (readingCard && readingCard.dataset.id) {
    const parsed = parseInt(readingCard.dataset.id, 10);
    if (!isNaN(parsed)) return parsed;
  }
  const readerPane = document.getElementById('paneReader');
  if (readerPane && readerPane.dataset.articleId) {
    const parsed = parseInt(readerPane.dataset.articleId, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

/**
 * Saves speed read position and synchronizes with article scroll location strictly on device.
 */
export function saveArticleSpeedReadPosition(): void {
  const articleId = getActiveArticleId();
  if (state.tokens.length === 0) return;

  try {
    if (articleId) {
      localStorage.setItem(`wf_speed_read_pos_${articleId}`, String(state.currentIndex));
    }

    // Only update scroll position if the user has moved in speed read or is actively playing
    if (state.currentIndex !== state.initialIndex || state.isPlaying) {
      const fraction = state.currentIndex / Math.max(1, state.tokens.length - 1);
      if (articleId) {
        localStorage.setItem(`wf_scroll_${articleId}`, fraction.toFixed(4));
        if (typeof (window as any).updateCardReadingProgress === 'function') {
          (window as any).updateCardReadingProgress(articleId, fraction);
        }
      }

      const scrollEl = document.getElementById('readerScrollContainer');
      if (scrollEl) {
        const total = scrollEl.scrollHeight - scrollEl.clientHeight;
        if (total > 0) {
          scrollEl.scrollTop = Math.round(fraction * total);
        }
      }
    }
  } catch (e) {}
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calculates the Optimal Recognition Point (ORP) index for a word.
 * Due to asymmetry in visual processing, fixing fixation at 30%-40% of the word
 * produces fastest word recognition:
 * - 0–1 letters: index 0
 * - 2–5 letters: index 1
 * - 6–9 letters: index 2
 * - 10–13 letters: index 3
 * - >13 letters: index 4
 */
export function calculateOrpIndex(word: string): number {
  if (!word) return 0;
  const match = word.match(/^[^\p{L}\p{N}]*/u);
  const leadingOffset = match ? match[0].length : 0;
  const clean = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const len = clean.length;

  let focalInClean = 0;
  if (len <= 1) focalInClean = 0;
  else if (len <= 5) focalInClean = 1;
  else if (len <= 9) focalInClean = 2;
  else if (len <= 13) focalInClean = 3;
  else focalInClean = 4;

  const targetIdx = leadingOffset + focalInClean;
  return Math.min(targetIdx, word.length - 1);
}

/**
 * Cadence multiplier.
 * Uniform 1.0 cadence maintains a pure, steady reading rhythm without sudden pauses on periods.
 */
export function calculateDelayMultiplier(word: string, isParagraphEnd: boolean): number {
  return 1.0;
}

/**
 * Splits sentence text into RSVP words.
 * Hyphenated compound words like "orange-yellow" or "state-of-the-art" are split into
 * individual visual chunks (e.g. "orange-" and "yellow") with the trailing hyphen preserved.
 * Em-dashes and en-dashes ("word—another") are also split.
 * This prevents overwhelming the foveal fixation window (>8 characters at high WPM).
 */
export function splitIntoRsvpWords(sentenceText: string): string[] {
  if (!sentenceText) return [];
  const rawParts = sentenceText.split(/\s+/).filter(Boolean);
  const words: string[] = [];

  for (const part of rawParts) {
    // Split on em-dash (—), en-dash (–), or double hyphens (--)
    const dashChunks = part.split(/(?<=[—–]|--)/);

    for (const chunk of dashChunks) {
      // Split hyphenated words like "orange-yellow"
      // Match hyphen only when flanked by letters/digits
      const hyphenSubwords = chunk.split(/(?<=\p{L}\p{N}|\p{L})-(?=\p{L}|\p{N})/gu);
      if (hyphenSubwords.length > 1) {
        for (let j = 0; j < hyphenSubwords.length; j++) {
          const sub = hyphenSubwords[j];
          if (!sub) continue;
          words.push(j < hyphenSubwords.length - 1 ? `${sub}-` : sub);
        }
      } else {
        words.push(chunk);
      }
    }
  }

  return words;
}

/**
 * Parses article text into RSVP tokens with sentence context.
 */
export function extractSpeedReadTokens(rootElement: HTMLElement): { tokens: SpeedReadToken[]; sentences: string[] } {
  const tokens: SpeedReadToken[] = [];
  const sentences: string[] = [];

  if (!rootElement) return { tokens, sentences };

  const clone = rootElement.cloneNode(true) as HTMLElement;

  const excludeSelectors = 'pre, code, figure, figcaption, table, svg, iframe, noscript, script, style, .reader-footnotes, .reader-highlight, .reader-annotation';
  clone.querySelectorAll(excludeSelectors).forEach(el => el.remove());

  const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, li';
  let blocks = Array.from(clone.querySelectorAll<HTMLElement>(blockSelectors));

  if (blocks.length === 0) {
    const p = document.createElement('p');
    p.textContent = clone.innerText || clone.textContent || '';
    blocks = [p];
  }

  for (const block of blocks) {
    const rawText = (block.innerText || block.textContent || '').trim();
    if (!rawText) continue;

    // Split sentences on whitespace following terminal punctuation and optional closing quotes/brackets (including Unicode curly quotes)
    const rawSentences = rawText.split(/(?<=[.!?…]["'”’»›)\]}]*)\s+/u).map(s => s.trim()).filter(Boolean);
    const blockSentences = rawSentences.length > 0 ? rawSentences : [rawText];

    for (const rawSentence of blockSentences) {
      const sentenceText = rawSentence.trim();
      if (!sentenceText) continue;

      const sentenceIdx = sentences.length;
      sentences.push(sentenceText);

      const rawWords = splitIntoRsvpWords(sentenceText);

      for (let i = 0; i < rawWords.length; i++) {
        const rawWord = rawWords[i];
        const isSentenceEnd = i === rawWords.length - 1;
        const isParagraphEnd = isSentenceEnd && (block === blocks[blocks.length - 1] || blockSentences.indexOf(rawSentence) === blockSentences.length - 1);

        const clean = rawWord.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        const orpIndex = calculateOrpIndex(rawWord);
        const delayMultiplier = calculateDelayMultiplier(rawWord, isParagraphEnd);

        tokens.push({
          word: rawWord,
          clean,
          orpIndex,
          delayMultiplier,
          sentenceIndex: sentenceIdx,
          isParagraphEnd
        });
      }
    }
  }

  return { tokens, sentences };
}

/**
 * Formats ORP segments for physical reticle rendering.
 * BiDi Aware: In LTR words (English/Latin/numbers), the prefix sits on the physical left and suffix on the physical right.
 * In RTL words (Hebrew/Arabic), reading starts from the right, so the prefix sits on the physical right and suffix on the physical left.
 * RLM (\u200F) wrapping ensures trailing and leading neutral punctuation (e.g. "מוקשים,", "(עברית)", "שלום!") never jumps
 * to the wrong side or inside the word when rendered in discrete HTML span containers.
 */
export function formatOrpSegments(word: string, orpIdx: number): { left: string; focus: string; right: string; isRtl: boolean } {
  const isWordRtl = isRtlText(word);
  const prefix = word.slice(0, orpIdx);
  const focus = word.charAt(orpIdx) || '';
  const suffix = word.slice(orpIdx + 1);

  if (isWordRtl) {
    const RLM = '\u200F';
    return {
      left: suffix ? `${RLM}${suffix}${RLM}` : '',
      focus: focus ? `${RLM}${focus}${RLM}` : '',
      right: prefix ? `${RLM}${prefix}${RLM}` : '',
      isRtl: true
    };
  } else {
    return {
      left: prefix,
      focus,
      right: suffix,
      isRtl: false
    };
  }
}

/**
 * Renders the active token with locked ORP focal letter and surrounding context track.
 */
function renderActiveToken(): void {
  const wordLeftEl = document.getElementById('speedReadWordLeft');
  const wordFocusEl = document.getElementById('speedReadWordFocus');
  const wordRightEl = document.getElementById('speedReadWordRight');
  const wordsLeftEl = document.getElementById('speedReadWordsLeft');
  const wordsRightEl = document.getElementById('speedReadWordsRight');
  const contextEl = document.getElementById('speedReadContextSentence');
  const countEl = document.getElementById('speedReadWordCount');
  const timeLeftEl = document.getElementById('speedReadTimeRemaining');
  const scrubber = document.getElementById('speedReadScrubber') as HTMLInputElement;
  const topProgress = document.getElementById('speedReadTopProgress');
  const progressText = document.getElementById('speedReadProgressText');

  if (state.tokens.length === 0) {
    if (wordLeftEl) wordLeftEl.textContent = '';
    if (wordFocusEl) wordFocusEl.textContent = '–';
    if (wordRightEl) wordRightEl.textContent = '';
    if (wordsLeftEl) wordsLeftEl.innerHTML = '';
    if (wordsRightEl) wordsRightEl.innerHTML = '';
    if (contextEl) contextEl.textContent = 'No readable text found.';
    return;
  }

  const token = state.tokens[state.currentIndex];
  if (!token) return;

  // 1. Locked ORP Fixed Reticle: Left float, Center chromatic letter, Right float
  // BiDi Aware: Token-level script detection prevents backwards English in Hebrew or backwards Hebrew in English
  const segments = formatOrpSegments(token.word, token.orpIndex);
  if (wordLeftEl) {
    wordLeftEl.textContent = segments.left;
    wordLeftEl.setAttribute('dir', segments.isRtl ? 'rtl' : 'ltr');
  }
  if (wordFocusEl) {
    wordFocusEl.textContent = segments.focus;
    wordFocusEl.setAttribute('dir', segments.isRtl ? 'rtl' : 'ltr');
  }
  if (wordRightEl) {
    wordRightEl.textContent = segments.right;
    wordRightEl.setAttribute('dir', segments.isRtl ? 'rtl' : 'ltr');
  }

  // 2. Surrounding Words (Visible on Pause)
  if (wordsLeftEl && wordsRightEl) {
    const windowSize = 14;
    const currentSentence = state.sentences[token.sentenceIndex] || '';
    const isSentenceRtl = isRtlText(currentSentence) || state.isRtl;

    // Generate preceding words (chronological order: leftStart to currentIndex - 1)
    let prevHtml = '';
    const leftStart = Math.max(0, state.currentIndex - windowSize);
    for (let i = leftStart; i < state.currentIndex; i++) {
      const t = state.tokens[i];
      prevHtml += `<span class="strip-word" dir="auto" data-index="${i}">${escapeHtml(t.word)}</span>`;
    }

    // Generate succeeding words (chronological order: currentIndex + 1 to rightEnd)
    let nextHtml = '';
    const rightEnd = Math.min(state.tokens.length - 1, state.currentIndex + windowSize);
    for (let i = state.currentIndex + 1; i <= rightEnd; i++) {
      const t = state.tokens[i];
      nextHtml += `<span class="strip-word" dir="auto" data-index="${i}">${escapeHtml(t.word)}</span>`;
    }

    if (isSentenceRtl) {
      // In RTL (Hebrew/Arabic):
      // Preceding words belong on the physical RIGHT of the active word
      // Succeeding words belong on the physical LEFT of the active word
      wordsRightEl.setAttribute('dir', 'rtl');
      wordsRightEl.innerHTML = prevHtml;

      wordsLeftEl.setAttribute('dir', 'rtl');
      wordsLeftEl.innerHTML = nextHtml;
    } else {
      // In LTR (English/Latin):
      // Preceding words belong on the physical LEFT of the active word
      // Succeeding words belong on the physical RIGHT of the active word
      wordsLeftEl.setAttribute('dir', 'ltr');
      wordsLeftEl.innerHTML = prevHtml;

      wordsRightEl.setAttribute('dir', 'ltr');
      wordsRightEl.innerHTML = nextHtml;
    }
  }

  // 3. Sentence / Paragraph Context Line below with lightly highlighted active word
  if (contextEl && state.sentences[token.sentenceIndex]) {
    let sentenceStartIdx = state.currentIndex;
    while (sentenceStartIdx > 0 && state.tokens[sentenceStartIdx - 1]?.sentenceIndex === token.sentenceIndex) {
      sentenceStartIdx--;
    }
    let sentenceEndIdx = state.currentIndex;
    while (sentenceEndIdx < state.tokens.length - 1 && state.tokens[sentenceEndIdx + 1]?.sentenceIndex === token.sentenceIndex) {
      sentenceEndIdx++;
    }

    const currentSentence = state.sentences[token.sentenceIndex] || '';
    const isSentenceRtl = isRtlText(currentSentence) || state.isRtl;
    if (isSentenceRtl) {
      contextEl.classList.add('is-rtl');
      contextEl.setAttribute('dir', 'rtl');
    } else {
      contextEl.classList.remove('is-rtl');
      contextEl.setAttribute('dir', 'ltr');
    }

    let sentenceHtml = '';
    for (let i = sentenceStartIdx; i <= sentenceEndIdx; i++) {
      const t = state.tokens[i];
      const escaped = escapeHtml(t.word);
      if (i === state.currentIndex) {
        sentenceHtml += `<mark class="speed-read-context-active-word">${escaped}</mark> `;
      } else {
        sentenceHtml += `${escaped} `;
      }
    }
    contextEl.innerHTML = sentenceHtml.trim();
  }

  // 4. Progress stats & Timeline
  const total = state.tokens.length;
  const current = state.currentIndex + 1;
  const fraction = (state.currentIndex / Math.max(1, total - 1)) * 100;
  const roundedPct = Math.round((current / total) * 100);

  if (countEl) countEl.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} words`;
  if (progressText) progressText.textContent = `${roundedPct}%`;
  if (topProgress) topProgress.style.width = `${fraction}%`;

  if (timeLeftEl) {
    const remainingWords = total - current;
    const minsLeft = Math.max(0, Math.ceil(remainingWords / state.wpm));
    timeLeftEl.textContent = minsLeft <= 1 ? (remainingWords === 0 ? 'Completed' : '< 1 min left') : `${minsLeft} min left`;
  }

  if (scrubber) {
    scrubber.value = String(fraction);
  }
}

/**
 * Ticks one step in playback.
 */
function tick(): void {
  if (!state.isPlaying || !state.isOpen) return;

  if (state.currentIndex >= state.tokens.length - 1) {
    pauseSpeedRead();
    saveArticleSpeedReadPosition();
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof (window as any).showToast === 'function') {
      // @ts-ignore
      (window as any).showToast('Speed reading completed!', 2500);
    }
    return;
  }

  state.currentIndex++;
  renderActiveToken();

  // Periodically persist progress to device storage during active playback
  if (state.currentIndex % 20 === 0) {
    saveArticleSpeedReadPosition();
  }

  const baselineInterval = (60 * 1000) / state.wpm;
  state.timerId = setTimeout(tick, baselineInterval);
}

export function playSpeedRead(): void {
  if (state.isPlaying || state.tokens.length === 0) return;

  if (state.currentIndex >= state.tokens.length - 1) {
    state.currentIndex = 0;
  }

  state.isPlaying = true;
  updatePlayButtonUI(true);

  const baselineInterval = (60 * 1000) / state.wpm;
  state.timerId = setTimeout(tick, baselineInterval);
}

export function pauseSpeedRead(): void {
  state.isPlaying = false;
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
  updatePlayButtonUI(false);
  renderActiveToken();
  saveArticleSpeedReadPosition();
}

export function toggleSpeedReadPlay(): void {
  if (state.isPlaying) {
    pauseSpeedRead();
  } else {
    playSpeedRead();
  }
}

function updatePlayButtonUI(isPlaying: boolean): void {
  const modal = document.getElementById('speedReadModal');
  const playIcon = document.getElementById('speedReadPlayIcon');
  const pauseIcon = document.getElementById('speedReadPauseIcon');
  const playBtn = document.getElementById('speedReadPlayBtn');

  if (modal) {
    if (isPlaying) {
      modal.classList.add('playing');
      modal.classList.remove('paused');
    } else {
      modal.classList.remove('playing');
      modal.classList.add('paused');
    }
  }

  if (playIcon && pauseIcon) {
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  if (playBtn) {
    if (isPlaying) {
      playBtn.classList.add('playing');
      playBtn.setAttribute('title', 'Pause (Space)');
    } else {
      playBtn.classList.remove('playing');
      playBtn.setAttribute('title', 'Play (Space)');
    }
  }
}

export function stepSpeedRead(delta: number): void {
  if (state.tokens.length === 0) return;
  const wasPlaying = state.isPlaying;
  if (wasPlaying) pauseSpeedRead();

  state.currentIndex = Math.max(0, Math.min(state.tokens.length - 1, state.currentIndex + delta));
  renderActiveToken();
  saveArticleSpeedReadPosition();

  if (wasPlaying) playSpeedRead();
}

export function restartSpeedRead(): void {
  if (state.tokens.length === 0) return;
  const wasPlaying = state.isPlaying;
  if (wasPlaying) pauseSpeedRead();

  state.currentIndex = 0;
  renderActiveToken();
  saveArticleSpeedReadPosition();

  if (wasPlaying) playSpeedRead();
}

export function adjustSpeedReadWpm(delta: number): void {
  setSpeedReadWpm(state.wpm + delta);
}

export function setSpeedReadWpm(wpm: number): void {
  state.wpm = Math.max(150, Math.min(800, wpm));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wf_speed_read_wpm', String(state.wpm));
    }
  } catch (e) {}

  const display = document.getElementById('speedReadWpmDisplay');
  if (display) display.textContent = `${state.wpm} WPM`;

  const slider = document.getElementById('speedReadWpmSlider') as HTMLInputElement;
  if (slider && parseInt(slider.value, 10) !== state.wpm) {
    slider.value = String(state.wpm);
  }

  if (state.tokens.length > 0) {
    const countEl = document.getElementById('speedReadWordCount');
    const timeLeftEl = document.getElementById('speedReadTimeRemaining');
    const total = state.tokens.length;
    const current = state.currentIndex + 1;
    const remainingWords = total - current;
    const minsLeft = Math.max(0, Math.ceil(remainingWords / state.wpm));
    if (timeLeftEl) {
      timeLeftEl.textContent = minsLeft <= 1 ? (remainingWords === 0 ? 'Completed' : '< 1 min left') : `${minsLeft} min left`;
    }
  }
}

export function setSpeedReadFontSize(px: number): void {
  state.fontSize = Math.max(32, Math.min(112, px));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wf_speed_read_font_size', String(state.fontSize));
    }
  } catch (e) {}

  const display = document.getElementById('speedReadFontSizeDisplay');
  if (display) display.textContent = `${state.fontSize}px`;

  const strip = document.getElementById('speedReadStrip');
  if (strip) {
    strip.style.setProperty('--speed-read-font-size', `${state.fontSize}px`);
    strip.style.fontSize = `${state.fontSize}px`;
  }
}

export function adjustSpeedReadFontSize(delta: number): void {
  setSpeedReadFontSize(state.fontSize + delta);
}

export function toggleSpeedReadFontFamily(): void {
  state.fontFamily = state.fontFamily === 'serif' ? 'sans' : 'serif';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wf_speed_read_font_family', state.fontFamily);
    }
  } catch (e) {}

  applyFontFamilyUI();
}

function applyFontFamilyUI(): void {
  const label = document.getElementById('speedReadFontFamilyLabel');
  if (label) label.textContent = state.fontFamily === 'serif' ? 'Serif' : 'Sans';

  const strip = document.getElementById('speedReadStrip');
  if (strip) {
    if (state.fontFamily === 'sans') {
      strip.classList.add('sans-font');
    } else {
      strip.classList.remove('sans-font');
    }
  }
}

export function handleSpeedReadScrub(fractionPercent: string | number): void {
  if (state.tokens.length === 0) return;
  const pct = typeof fractionPercent === 'string' ? parseFloat(fractionPercent) : fractionPercent;
  const wasPlaying = state.isPlaying;
  if (wasPlaying) pauseSpeedRead();

  const targetIndex = Math.round((pct / 100) * (state.tokens.length - 1));
  state.currentIndex = Math.max(0, Math.min(state.tokens.length - 1, targetIndex));
  renderActiveToken();
  saveArticleSpeedReadPosition();

  if (wasPlaying) playSpeedRead();
}

export function isSpeedReadOpen(): boolean {
  return state.isOpen;
}

/**
 * Initializes interactive mouse drag-to-scroll, touch swipe, mouse wheel scrub, and reliable play/pause clicks.
 */
let interactionsInitialized = false;

function initSpeedReadInteractions(): void {
  if (interactionsInitialized) return;
  const screen = document.getElementById('speedReadScreen');
  if (!screen) return;
  interactionsInitialized = true;

  let isPointerDown = false;
  let activePointerId: number | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;
  let pointerStartIndex = 0;
  let hasDragged = false;
  let tapTargetWordIndex: number | null = null;
  let suppressNextClick = false;

  // Pointer Down: Captures both mouse and touch gestures cleanly
  screen.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement)?.closest?.('.speed-read-top-bar, .speed-read-lower-deck')) return;

    isPointerDown = true;
    activePointerId = e.pointerId;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    pointerStartTime = Date.now();
    pointerStartIndex = state.currentIndex;
    hasDragged = false;

    // Track if user tapped a surrounding word in the strip
    const wordEl = (e.target as HTMLElement)?.closest?.('.strip-word') as HTMLElement;
    if (wordEl && wordEl.dataset.index) {
      const idx = parseInt(wordEl.dataset.index, 10);
      tapTargetWordIndex = !isNaN(idx) ? idx : null;
    } else {
      tapTargetWordIndex = null;
    }

    try {
      screen.setPointerCapture(e.pointerId);
    } catch (err) {}
  });

  screen.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isPointerDown || (activePointerId !== null && e.pointerId !== activePointerId)) return;
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;

    if (!hasDragged && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      hasDragged = true;
      if (state.isPlaying) {
        pauseSpeedRead();
      }
      document.body.classList.add('speed-read-dragging');
    }

    if (hasDragged) {
      // Support both horizontal swipe (with RTL directionality) AND vertical drag:
      // In RTL, dragging right advances (+), dragging left rewinds (-)
      // In LTR, dragging left advances (+), dragging right rewinds (-)
      // In vertical, dragging up advances (+), dragging down rewinds (-)
      const effectiveDx = state.isRtl ? dx : -dx;
      const effectiveDy = -dy;

      // Use the dominant movement axis
      const dominantDelta = Math.abs(dx) >= Math.abs(dy) ? effectiveDx : effectiveDy;
      // 24px of movement cycles 1 word
      const wordDelta = Math.round(dominantDelta / 24);
      const targetIdx = Math.max(0, Math.min(state.tokens.length - 1, pointerStartIndex + wordDelta));
      if (targetIdx !== state.currentIndex) {
        state.currentIndex = targetIdx;
        renderActiveToken();
      }
    }
  });

  const handlePointerEnd = (e: PointerEvent) => {
    if (!isPointerDown || (activePointerId !== null && e.pointerId !== activePointerId)) return;
    isPointerDown = false;
    activePointerId = null;
    document.body.classList.remove('speed-read-dragging');

    try {
      if (screen.hasPointerCapture(e.pointerId)) {
        screen.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    const moveDist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
    const duration = Date.now() - pointerStartTime;

    if (hasDragged) {
      hasDragged = false;
      saveArticleSpeedReadPosition();
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 300);
      return;
    }

    // Clean, intentional tap (< 350ms, < 8px movement)
    if (moveDist <= 8 && duration < 350) {
      if (tapTargetWordIndex !== null) {
        state.currentIndex = Math.max(0, Math.min(state.tokens.length - 1, tapTargetWordIndex));
        renderActiveToken();
        saveArticleSpeedReadPosition();
        tapTargetWordIndex = null;
        suppressNextClick = true;
        setTimeout(() => { suppressNextClick = false; }, 300);
        return;
      }

      toggleSpeedReadPlay();
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 300);
    }
  };

  screen.addEventListener('pointerup', handlePointerEnd);
  screen.addEventListener('pointercancel', (e: PointerEvent) => {
    if (e.pointerId === activePointerId) {
      isPointerDown = false;
      activePointerId = null;
      document.body.classList.remove('speed-read-dragging');
    }
  });

  // Intercept synthetic click events that Android/Chrome fires after pointerup
  screen.addEventListener('click', (e: MouseEvent) => {
    if (suppressNextClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, true);

  // Mouse Wheel Scrub while paused
  screen.addEventListener('wheel', (e: WheelEvent) => {
    if (state.isPlaying || !state.isOpen) return;
    e.preventDefault();
    const rawDelta = e.deltaX !== 0 ? (state.isRtl ? -e.deltaX : e.deltaX) : e.deltaY;
    const delta = Math.sign(rawDelta);
    if (delta !== 0) {
      stepSpeedRead(delta > 0 ? 1 : -1);
    }
  }, { passive: false });
}

/**
 * Opens Speed Read modal in Fullscreen Focus mode for the active article.
 */
export function openSpeedRead(): void {
  const readerContent = document.getElementById('readerBody') ||
                        document.getElementById('readerArticleContent') ||
                        document.getElementById('readerContent');
  const readerView = document.getElementById('readerView');
  // @ts-ignore
  const hasActiveArticle = typeof window !== 'undefined' && Boolean((window as any).activeArticleId);
  const isReaderVisible = readerView && readerView.style.display !== 'none';

  if (!readerContent || (!hasActiveArticle && !isReaderVisible) || !readerContent.textContent?.trim()) {
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof (window as any).showToast === 'function') {
      // @ts-ignore
      (window as any).showToast('Please open an article first to speed read', 2200);
    }
    return;
  }

  const { tokens, sentences } = extractSpeedReadTokens(readerContent);
  if (tokens.length === 0) {
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof (window as any).showToast === 'function') {
      // @ts-ignore
      (window as any).showToast('No readable text found in this article', 2200);
    }
    return;
  }

  state.tokens = tokens;
  state.sentences = sentences;
  state.isOpen = true;

  // Capture current reader scroll position BEFORE opening modal
  const scrollEl = document.getElementById('readerScrollContainer');
  const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;
  const totalScrollable = scrollEl ? (scrollEl.scrollHeight - scrollEl.clientHeight) : 0;
  const currentScrollRatio = totalScrollable > 0 ? Math.max(0, Math.min(1, currentScrollTop / totalScrollable)) : 0;

  state.initialScrollTop = currentScrollTop;

  // Restore remembered speed read position or seed from current scroll location (on-device only)
  const articleId = getActiveArticleId();
  let savedSpeedPos: number | null = null;
  if (articleId) {
    try {
      const saved = localStorage.getItem(`wf_speed_read_pos_${articleId}`);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < tokens.length) {
          savedSpeedPos = parsed;
        }
      }
    } catch (e) {}
  }

  let startIdx = 0;
  if (currentScrollRatio > 0.005) {
    const scrollTokenIdx = Math.max(0, Math.min(tokens.length - 1, Math.round(currentScrollRatio * (tokens.length - 1))));
    if (savedSpeedPos !== null) {
      const savedRatio = savedSpeedPos / Math.max(1, tokens.length - 1);
      // If previous speed-read position is within 8% of current scroll location, use exact saved word
      if (Math.abs(savedRatio - currentScrollRatio) < 0.08) {
        startIdx = savedSpeedPos;
      } else {
        startIdx = scrollTokenIdx;
      }
    } else {
      startIdx = scrollTokenIdx;
    }
  } else if (savedSpeedPos !== null) {
    startIdx = savedSpeedPos;
  }

  state.currentIndex = startIdx;
  state.initialIndex = startIdx;

  // Populate metadata
  const titleEl = document.getElementById('speedReadArticleTitle');
  const metaEl = document.getElementById('speedReadMeta');
  const readerTitle = document.getElementById('readerTitle')?.textContent?.trim() || 'Article';
  const readerMeta = document.getElementById('readerMeta')?.textContent?.trim() || '';

  if (titleEl) titleEl.textContent = readerTitle;
  if (metaEl) metaEl.textContent = readerMeta ? `${readerMeta} • ${tokens.length.toLocaleString()} words` : `${tokens.length.toLocaleString()} words`;

  // Apply font size and typography
  setSpeedReadFontSize(state.fontSize);
  applyFontFamilyUI();
  setSpeedReadWpm(state.wpm);

  // Detect RTL from reader container or article content
  const readerBodyEl = document.getElementById('readerBody');
  const isRtl = Boolean(
    (readerBodyEl && (readerBodyEl.getAttribute('dir') === 'rtl' || readerBodyEl.classList.contains('is-rtl'))) ||
    isRtlText(readerContent.textContent || '') ||
    isRtlText(document.getElementById('readerTitle')?.textContent || '')
  );
  state.isRtl = isRtl;

  // Show modal overlay in paused state
  const modal = document.getElementById('speedReadModal');
  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('open', 'paused');
    modal.classList.remove('playing');
    if (isRtl) {
      modal.classList.add('is-rtl');
    } else {
      modal.classList.remove('is-rtl');
    }
    modal.removeAttribute('dir');
    document.body.classList.add('speed-read-active');
  }

  const strip = document.getElementById('speedReadStrip');
  if (strip) {
    strip.classList.remove('is-rtl');
    strip.removeAttribute('dir');
  }

  const contextEl = document.getElementById('speedReadContextSentence');
  if (contextEl) {
    if (isRtl) {
      contextEl.classList.add('is-rtl');
      contextEl.setAttribute('dir', 'rtl');
    } else {
      contextEl.classList.remove('is-rtl');
      contextEl.removeAttribute('dir');
    }
  }

  initSpeedReadInteractions();
  updatePlayButtonUI(false);
  renderActiveToken();
}

/**
 * Closes Speed Read modal and restores regular reader view.
 */
export function closeSpeedRead(): void {
  const articleId = getActiveArticleId();
  const hasMoved = state.currentIndex !== state.initialIndex;

  pauseSpeedRead();
  state.isOpen = false;

  const modal = document.getElementById('speedReadModal');
  if (modal) {
    modal.classList.remove('open', 'playing', 'paused');
    modal.style.display = 'none';
  }
  document.body.classList.remove('speed-read-active', 'speed-read-dragging');

  // Accurately restore or advance scroll position in the reader
  const scrollEl = document.getElementById('readerScrollContainer');
  if (scrollEl) {
    const total = scrollEl.scrollHeight - scrollEl.clientHeight;
    let targetScrollTop = state.initialScrollTop;

    if (hasMoved && total > 0 && state.tokens.length > 1) {
      // User actively read or scrubbed in speed read: advance scroll to the word reached
      const fraction = state.currentIndex / (state.tokens.length - 1);
      targetScrollTop = Math.round(fraction * total);
      if (articleId) {
        try {
          localStorage.setItem(`wf_speed_read_pos_${articleId}`, String(state.currentIndex));
          localStorage.setItem(`wf_scroll_${articleId}`, fraction.toFixed(4));
          if (typeof (window as any).updateCardReadingProgress === 'function') {
            (window as any).updateCardReadingProgress(articleId, fraction);
          }
        } catch (e) {}
      }
    } else {
      // User closed speed read without advancing: restore exact previous scroll position!
      targetScrollTop = state.initialScrollTop;
      if (articleId && total > 0 && state.initialScrollTop > 0) {
        try {
          const fraction = state.initialScrollTop / total;
          localStorage.setItem(`wf_scroll_${articleId}`, fraction.toFixed(4));
        } catch (e) {}
      }
    }

    const restoreScroll = () => {
      scrollEl.scrollTop = targetScrollTop;
      if (typeof (window as any).updateReadingProgress === 'function') {
        (window as any).updateReadingProgress();
      }
    };

    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 30);
    setTimeout(restoreScroll, 100);
  }
}

/**
 * Global keyboard handler dedicated to Speed Read mode.
 */
export function handleSpeedReadKeydown(e: KeyboardEvent): boolean {
  if (!state.isOpen) return false;

  // Space: Play / Pause
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    toggleSpeedReadPlay();
    return true;
  }

  // Left Arrow: In RTL advances +10 words, in LTR rewinds -10 words
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    e.stopPropagation();
    stepSpeedRead(state.isRtl ? 10 : -10);
    return true;
  }

  // Right Arrow: In RTL rewinds -10 words, in LTR advances +10 words
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    stepSpeedRead(state.isRtl ? -10 : 10);
    return true;
  }

  // Up Arrow: Faster WPM (+25)
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    adjustSpeedReadWpm(25);
    return true;
  }

  // Down Arrow: Slower WPM (-25)
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    adjustSpeedReadWpm(-25);
    return true;
  }

  // Escape or 'r' / 'R': Exit Speed Read
  if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    e.stopPropagation();
    closeSpeedRead();
    return true;
  }

  // Home: Restart
  if (e.key === 'Home') {
    e.preventDefault();
    e.stopPropagation();
    restartSpeedRead();
    return true;
  }

  // End: Jump to end
  if (e.key === 'End') {
    e.preventDefault();
    e.stopPropagation();
    if (state.tokens.length > 0) {
      state.currentIndex = state.tokens.length - 1;
      renderActiveToken();
      saveArticleSpeedReadPosition();
    }
    return true;
  }

  return false;
}
