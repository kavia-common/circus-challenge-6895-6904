import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PUBLIC_INTERFACE
@Component({
  selector: 'app-level-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './level-selector.component.html',
  styleUrls: ['./level-selector.component.scss']
})
export class LevelSelectorComponent {
  /** Selected level value (1..3) */
  level = 1;

  // PUBLIC_INTERFACE
  @Output() levelSelected = new EventEmitter<number>();

  // PUBLIC_INTERFACE
  apply() {
    /** Emit the selected level to the parent */
    this.levelSelected.emit(this.level);
  }
}
