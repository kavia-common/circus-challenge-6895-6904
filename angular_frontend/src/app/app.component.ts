import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HighScoreService, HighScoreEntry } from './services/high-score.service';
import { GameCanvasComponent } from './components/game-canvas/game-canvas.component';
import { ScoreboardComponent } from './components/scoreboard/scoreboard.component';
import { LevelSelectorComponent } from './components/level-selector/level-selector.component';

// PUBLIC_INTERFACE
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, GameCanvasComponent, ScoreboardComponent, LevelSelectorComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  /** Title displayed in the top bar */
  title = 'Circus Challenge';

  /** High scores to pass to scoreboard */
  scores: HighScoreEntry[] = [];

  /** Visibility of the scoreboard sheet */
  showScores = false;

  constructor(private hs: HighScoreService) {
    this.scores = this.hs.getScores();
    // Refresh local scores when saved elsewhere (guard for SSR)
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).document !== 'undefined') {
      (globalThis as any).document.addEventListener('ui:saveScore', () => {
        this.scores = this.hs.getScores();
      });
    }
  }

  // PUBLIC_INTERFACE
  toggleScores() {
    /** Toggle the high scores panel visibility */
    this.showScores = !this.showScores;
  }

  // PUBLIC_INTERFACE
  onScore(_score: number) {
    /** Hook for score updates from the game loop */
  }

  // PUBLIC_INTERFACE
  onLives(_lives: number) {
    /** Hook for lives updates from the game loop */
  }

  // PUBLIC_INTERFACE
  onLevel(level: number) {
    /** Dispatch a level change event to the game engine (decoupled) */
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.document && typeof g.CustomEvent !== 'undefined') {
      g.document.dispatchEvent(new g.CustomEvent('game:setLevel', { detail: level }));
    }
  }
}
