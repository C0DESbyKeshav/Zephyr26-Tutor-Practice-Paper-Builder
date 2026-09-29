import type { UndoAction } from '../types';

export class UndoStack {
  private buffer: UndoAction[] = [];
  private readonly capacity: number = 5;

  constructor(capacity = 5) {
    this.capacity = capacity;
  }

  /**
   * Push a new grading action to the circular buffer.
   * If capacity is exceeded, drops the oldest action.
   */
  push(action: UndoAction): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift(); // Remove oldest to maintain max 5 actions
    }
    this.buffer.push(action);
  }

  /**
   * Pop the most recent action to undo.
   */
  pop(): UndoAction | null {
    if (this.isEmpty()) return null;
    return this.buffer.pop() || null;
  }

  /**
   * Peek the most recent action without removing it.
   */
  peek(): UndoAction | null {
    if (this.isEmpty()) return null;
    return this.buffer[this.buffer.length - 1];
  }

  /**
   * Returns current count of undoable actions in the buffer.
   */
  size(): number {
    return this.buffer.length;
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * Clear the entire stack (e.g., when switching papers or resetting).
   */
  clear(): void {
    this.buffer = [];
  }

  getAll(): UndoAction[] {
    return [...this.buffer];
  }
}

export const gradingUndoStack = new UndoStack(5);
