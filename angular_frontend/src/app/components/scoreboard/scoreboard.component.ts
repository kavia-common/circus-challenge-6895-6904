import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { HighScoreService, HighScoreEntry } from '../../services/high-score.service';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './scoreboard.component.html',
  styleUrls: ['./scoreboard.component.scss']
})
export class ScoreboardComponent implements OnInit {
  // PUBLIC_INTERFACE
  @Input() show = false;
  // PUBLIC_INTERFACE
  @Input() scores: HighScoreEntry[] = [];
  // PUBLIC_INTERFACE
  @Output() close = new EventEmitter<void>();

  constructor(private hs: HighScoreService) {}

  ngOnInit() {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.document) {
      g.document.addEventListener(
        'ui:saveScore',
        ((e: any) => {
          const score = e?.detail?.score ?? 0;
          const initials = e?.detail?.initials ?? 'YOU';
          this.hs.saveScore({ score, initials, date: new Date().toISOString() });
          this.scores = this.hs.getScores();
        }) as any
      );
    }
  }
}
