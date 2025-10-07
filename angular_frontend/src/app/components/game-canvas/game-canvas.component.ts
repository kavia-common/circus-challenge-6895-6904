import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { GameEngineService } from '../../services/game-engine.service';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.scss']
})
export class GameCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<any>;

  // PUBLIC_INTERFACE
  @Output() scoreChange = new EventEmitter<number>();
  // PUBLIC_INTERFACE
  @Output() livesChange = new EventEmitter<number>();

  private onOverListener?: (e: any) => void;

  constructor(private engine: GameEngineService) {}

  ngAfterViewInit() {
    const canvas: any = this.canvasRef.nativeElement;
    this.engine.attachCanvas(canvas as any);

    this.onOverListener = (e: any) => {
      const ce = e as { detail?: { score?: number } };
      const score = ce?.detail?.score ?? 0;
      const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
      if (g && typeof g.setTimeout !== 'undefined') {
        g.setTimeout(() => {
          let initials = 'YOU';
          if (g && typeof g.prompt !== 'undefined') {
            initials = (g.prompt('Game Over! Enter your initials:', 'YOU') || 'YOU').toUpperCase().slice(0, 3);
          }
          if (g && g.document && typeof g.CustomEvent !== 'undefined') {
            const evt = new g.CustomEvent('ui:saveScore', { detail: { score, initials } });
            g.document.dispatchEvent(evt);
          }
        }, 50);
      }
    };
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.document) {
      g.document.addEventListener('game:over', this.onOverListener as any);
    }

    this.engine.start(
      (score, lives) => {
        this.scoreChange.emit(score);
        this.livesChange.emit(lives);
      },
      (_l) => {}
    );
  }

  ngOnDestroy() {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.document && this.onOverListener) {
      g.document.removeEventListener('game:over', this.onOverListener as any);
    }
    // Guard cancelAnimationFrame in SSR
    if (typeof (globalThis as any).cancelAnimationFrame !== 'undefined') {
      this.engine.stop();
    } else {
      // Ensure internal running flag cleared even if cancelAnimationFrame missing
      this.engine.stop();
    }
  }
}
