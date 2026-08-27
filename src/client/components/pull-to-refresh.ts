export interface PullToRefreshOptions {
  container: HTMLElement;
  wrap: HTMLElement;
  card: HTMLElement;
  svg: SVGElement;
  arcCircle: SVGCircleElement;
  arrowHead: SVGPolygonElement;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export class MaterialPullToRefresh {
  private container: HTMLElement;
  private wrap: HTMLElement;
  private card: HTMLElement;
  private svg: SVGElement;
  private arcCircle: SVGCircleElement;
  private arrowHead: SVGPolygonElement;
  private onRefresh: () => Promise<void>;
  private threshold: number;

  private readonly CX = 20;
  private readonly CY = 20;
  private readonly R = 8.5;
  private readonly CIRCUMFERENCE = 53.407; // 2 * PI * 8.5
  private readonly ARROW_W = 6.0;
  private readonly ARROW_H = 4.2;
  private readonly MAX_SWEEP_DEG = 280;

  private startY: number = 0;
  private startX: number = 0;
  private isPulling: boolean = false;
  private isRefreshing: boolean = false;
  private hapticTriggered: boolean = false;

  constructor(options: PullToRefreshOptions) {
    this.container = options.container;
    this.wrap = options.wrap;
    this.card = options.card;
    this.svg = options.svg;
    this.arcCircle = options.arcCircle;
    this.arrowHead = options.arrowHead;
    this.onRefresh = options.onRefresh;
    this.threshold = options.threshold || 68;

    this.init();
  }

  private init(): void {
    if (!this.container || !this.wrap) return;

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
    this.container.addEventListener('touchcancel', this.onTouchCancel.bind(this), { passive: true });
  }

  private onTouchStart(e: TouchEvent): void {
    if (this.isRefreshing || (window as any).activeArticleId) return;
    if (this.container.scrollTop <= 2 && e.touches.length === 1) {
      this.startY = e.touches[0].pageY;
      this.startX = e.touches[0].pageX;
      this.isPulling = true;
      this.hapticTriggered = false;
      this.wrap.style.transition = 'none';
      this.card.style.transition = 'none';
      this.arcCircle.style.transition = 'none';
      this.arrowHead.style.transition = 'none';
      this.svg.style.transform = '';
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isPulling || this.isRefreshing || (window as any).activeArticleId || e.touches.length !== 1) return;

    const currentY = e.touches[0].pageY;
    const currentX = e.touches[0].pageX;
    const deltaY = currentY - this.startY;
    const deltaX = currentX - this.startX;

    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaY < 15) return;

    if (deltaY > 5 && this.container.scrollTop <= 2) {
      if (e.cancelable) e.preventDefault();

      const tensionDamp = 0.42;
      const pullDist = Math.min(110, deltaY * tensionDamp);
      const progress = Math.min(1, pullDist / this.threshold);

      this.wrap.style.visibility = 'visible';
      this.wrap.style.opacity = String(Math.min(1, progress * 2.5));
      this.wrap.style.transform = 'translate(-50%, ' + pullDist + 'px)';

      const cardScale = 0.55 + (progress * 0.45);
      this.card.style.transform = 'scale(' + cardScale + ')';

      this.updatePullProgress(progress);

      if (pullDist >= this.threshold && !this.hapticTriggered) {
        this.hapticTriggered = true;
        try {
          if ((window as any).triggerHaptic) {
            (window as any).triggerHaptic('light');
          } else if ((window as any).AndroidNative?.triggerHaptic) {
            (window as any).AndroidNative.triggerHaptic('light');
          } else if (navigator.vibrate) {
            navigator.vibrate(12);
          }
        } catch (err) {}
      } else if (pullDist < this.threshold) {
        this.hapticTriggered = false;
      }
    } else if (deltaY < 0) {
      this.isPulling = false;
    }
  }

  private updatePullProgress(progress: number): void {
    const adjusted = Math.max(0.01, Math.min(1.0, progress));
    const sweepDeg = adjusted * this.MAX_SWEEP_DEG;
    const endDeg = -90 + sweepDeg;
    const endRad = endDeg * (Math.PI / 180);

    const endX = this.CX + this.R * Math.cos(endRad);
    const endY = this.CY + this.R * Math.sin(endRad);

    const tx = -Math.sin(endRad);
    const ty = Math.cos(endRad);
    const nx = Math.cos(endRad);
    const ny = Math.sin(endRad);

    const arrowScale = Math.min(1.0, Math.max(0.0, (progress - 0.08) / 0.32));
    const curW = this.ARROW_W * arrowScale;
    const curH = this.ARROW_H * arrowScale;

    const tipX = endX + curH * tx;
    const tipY = endY + curH * ty;
    const b1x = endX + (curW / 2) * nx;
    const b1y = endY + (curW / 2) * ny;
    const b2x = endX - (curW / 2) * nx;
    const b2y = endY - (curW / 2) * ny;

    const strokeOffset = this.CIRCUMFERENCE * (1 - (sweepDeg / 360));
    this.arcCircle.style.strokeDasharray = String(this.CIRCUMFERENCE);
    this.arcCircle.style.strokeDashoffset = String(strokeOffset);

    this.arrowHead.setAttribute('points', `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`);
    this.arrowHead.style.opacity = arrowScale > 0.05 ? '1' : '0';
  }

  private async onTouchEnd(e: TouchEvent): Promise<void> {
    if (!this.isPulling || this.isRefreshing) return;
    this.isPulling = false;

    const currentY = e.changedTouches[0]?.pageY || 0;
    const deltaY = currentY - this.startY;
    const pullDist = deltaY * 0.42;

    if (pullDist >= this.threshold && this.container.scrollTop <= 2 && !(window as any).activeArticleId) {
      this.startRefreshing();
    } else {
      this.cancelPull();
    }
  }

  private onTouchCancel(): void {
    if (!this.isRefreshing) {
      this.cancelPull();
    }
  }

  private async startRefreshing(): Promise<void> {
    this.isRefreshing = true;
    this.arrowHead.style.opacity = '0';
    this.svg.classList.add('ptr-material-spinner');

    this.wrap.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    this.wrap.style.transform = 'translate(-50%, 54px)';
    this.card.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    this.card.style.transform = 'scale(1)';

    try {
      await this.onRefresh();
    } finally {
      this.finishRefreshing();
    }
  }

  private finishRefreshing(): void {
    setTimeout(() => {
      this.card.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease';
      this.card.style.transform = 'scale(0)';
      this.wrap.style.transition = 'opacity 0.25s ease, transform 0.28s ease';
      this.wrap.style.opacity = '0';
      this.wrap.style.transform = 'translate(-50%, 40px)';

      setTimeout(() => {
        this.wrap.style.visibility = 'hidden';
        this.wrap.style.transform = 'translate(-50%, -20px)';
        this.card.style.transform = 'scale(1)';
        this.svg.classList.remove('ptr-material-spinner');
        this.arcCircle.style.strokeDashoffset = String(this.CIRCUMFERENCE);
        this.isRefreshing = false;
      }, 280);
    }, 350);
  }

  private cancelPull(): void {
    this.wrap.style.transition = 'transform 0.25s ease, opacity 0.2s ease';
    this.wrap.style.transform = 'translate(-50%, -20px)';
    this.wrap.style.opacity = '0';
    setTimeout(() => {
      this.wrap.style.visibility = 'hidden';
      this.arcCircle.style.strokeDashoffset = String(this.CIRCUMFERENCE);
      this.arrowHead.style.opacity = '0';
      this.svg.style.transform = '';
    }, 250);
  }
}
