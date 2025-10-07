import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { NgIf } from '@angular/common';
import { GameEngineService } from '../../services/game-engine.service';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [NgIf],
  templateUrl: './game-canvas.component.html',
  styleUrls: ['./game-canvas.component.scss']
})
export class GameCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<any>;

  // PUBLIC_INTERFACE
  @Output() scoreChange = new EventEmitter<number>();
  // PUBLIC_INTERFACE
  @Output() livesChange = new EventEmitter<number>();
  
  isGameOver = false;
  finalScore = 0;

  private onOverListener?: (e: any) => void;
  private readonly globalScope: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;

  constructor(private engine: GameEngineService) {}

  // PUBLIC_INTERFACE
  resetGame() {
    /** Reset the game state and restart */
    this.isGameOver = false;
    this.finalScore = 0;
    this.engine.reset();
    this.engine.start(
      (score, lives) => {
        this.scoreChange.emit(score);
        this.livesChange.emit(lives);
      },
      (_l) => {}
    );
  }

  ngAfterViewInit() {
    const canvas: any = this.canvasRef.nativeElement;
    this.engine.attachCanvas(canvas as any);

    // Listen for score and lives updates
    if (this.globalScope?.document) {
      this.globalScope.document.addEventListener('game:scoreChange', (e: any) => {
        const detail = (e as any).detail;
        if (detail && typeof detail.score !== 'undefined') {
          this.scoreChange.emit(detail.score);
        }
      });

      this.globalScope.document.addEventListener('game:livesChange', (e: any) => {
        const detail = (e as any).detail;
        if (detail && typeof detail.lives !== 'undefined') {
          this.livesChange.emit(detail.lives);
        }
      });
    }

    this.onOverListener = (e: any) => {
      const ce = e as { detail?: { score?: number } };
      const score = ce?.detail?.score ?? 0;
      this.isGameOver = true;
      this.finalScore = score;
      
      if (this.globalScope?.setTimeout) {
        this.globalScope.setTimeout(() => {
          let initials = 'YOU';
          if (this.globalScope?.prompt) {
            initials = (this.globalScope.prompt('Enter your initials:', 'YOU') || 'YOU').toUpperCase().slice(0, 3);
          }
          if (this.globalScope?.document && typeof this.globalScope.CustomEvent !== 'undefined') {
            const evt = new this.globalScope.CustomEvent('ui:saveScore', { detail: { score, initials } });
            this.globalScope.document.dispatchEvent(evt);
          }
        }, 50);
      }
    };

    if (this.globalScope?.document) {
      this.globalScope.document.addEventListener('game:over', this.onOverListener as any);
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
    if (this.globalScope?.document && this.onOverListener) {
      this.globalScope.document.removeEventListener('game:over', this.onOverListener as any);
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
