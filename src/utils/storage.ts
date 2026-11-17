import { SaveState } from '../types/game';

const STORAGE_KEY = 'flow_studios_o_chamado_save_v1';

export function loadSaveState(): SaveState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveState;
    if (!parsed || !parsed.character || !parsed.currentNodeId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveGameState(state: SaveState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSaveState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
