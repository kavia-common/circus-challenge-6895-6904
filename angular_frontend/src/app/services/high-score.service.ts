import { Injectable } from '@angular/core';

export interface HighScoreEntry {
  /** Player initials */
  initials: string;
  /** Numeric score achieved */
  score: number;
  /** ISO timestamp string */
  date: string;
}

/**
 * PUBLIC_INTERFACE
 * Provides local high score storage using browser localStorage.
 */
@Injectable({ providedIn: 'root' })
export class HighScoreService {
  private key = 'circus_high_scores';

  // PUBLIC_INTERFACE
  getScores(): HighScoreEntry[] {
    /** Retrieve high scores from localStorage sorted descending */
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (!g || !g.localStorage) return [];
    const raw = g.localStorage.getItem(this.key);
    try {
      const arr = raw ? (JSON.parse(raw) as HighScoreEntry[]) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  // PUBLIC_INTERFACE
  saveScore(entry: HighScoreEntry) {
    /** Save a new score, keeping top 20 entries */
    const list = this.getScores();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && g.localStorage) {
      g.localStorage.setItem(this.key, JSON.stringify(list.slice(0, 20)));
    }
  }
}
