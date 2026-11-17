import { GenderOption, SpeakerRole } from '../types/game';
import { audioEngine } from './audio';

export type VoiceSpeakerId =
  | SpeakerRole
  | 'João Batista'
  | 'Jesus'
  | 'Voz dos Céus'
  | 'Filipe'
  | 'Natanael'
  | 'André'
  | 'João 1:39'
  | 'Viúva'
  | 'Narrativa'
  | string;

interface VoiceProfile {
  pitch: number;
  rate: number;
  volume: number;
}

class CharacterVoiceEngine {
  private enabled: boolean = true;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private listeners: Set<(enabled: boolean) => void> = new Set();
  private initBound = false;
  private lastSpokenKey = '';
  private lastSpokenTime = 0;

  constructor() {
    this.initVoiceSelection();
  }

  private initVoiceSelection(): void {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      this.initBound
    ) {
      return;
    }
    this.initBound = true;

    const pickBestPtVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // Prefer natural / Google / Luciana / Maria / Daniel pt-BR voices first
        const ptBr = voices.filter((v) =>
          v.lang.toLowerCase().startsWith('pt-br')
        );
        const ptAny = voices.filter((v) =>
          v.lang.toLowerCase().startsWith('pt')
        );
        const pool = ptBr.length > 0 ? ptBr : ptAny;
        if (pool.length === 0) return;

        const preferred =
          pool.find((v) =>
            /natural|neural|google|luciana|daniel|maria|felipe|francisca/i.test(
              v.name
            )
          ) ?? pool[0];
        this.selectedVoice = preferred;
      } catch {
        // Safe fallback in restricted browsers
      }
    };

    pickBestPtVoice();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', pickBestPtVoice);
    } else {
      window.speechSynthesis.onvoiceschanged = pickBestPtVoice;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
    this.listeners.forEach((cb) => cb(this.enabled));
  }

  public toggleEnabled(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public subscribe(cb: (enabled: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public stop(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore Web Speech cancellation quirks
    }
  }

  private resolveProfile(
    speaker: VoiceSpeakerId,
    playerGender: GenderOption = 'masculino'
  ): VoiceProfile {
    const key = speaker.toLowerCase().trim();

    if (key.includes('voz dos céus') || key === 'heaven') {
      return { pitch: 0.66, rate: 0.81, volume: 0.96 };
    }
    if (key.includes('jesus')) {
      return { pitch: 0.88, rate: 0.88, volume: 0.94 };
    }
    if (key.includes('joão batista') || key === 'john_baptist') {
      return { pitch: 0.77, rate: 0.91, volume: 0.94 };
    }
    if (key.includes('natanael') || key === 'nathanael') {
      return { pitch: 0.84, rate: 0.93, volume: 0.9 };
    }
    if (key.includes('filipe') || key === 'philip') {
      return { pitch: 1.05, rate: 1.02, volume: 0.92 };
    }
    if (key.includes('andré') || key === 'andrew') {
      return { pitch: 0.94, rate: 0.95, volume: 0.9 };
    }
    if (key.includes('viúva') || key.includes('viuva')) {
      return { pitch: 1.18, rate: 0.88, volume: 0.9 };
    }
    if (key === 'player') {
      return playerGender === 'feminino'
        ? { pitch: 1.14, rate: 0.96, volume: 0.9 }
        : { pitch: 0.96, rate: 0.96, volume: 0.9 };
    }
    // Narrator / Scripture ref
    return { pitch: 0.93, rate: 0.93, volume: 0.88 };
  }

  private cleanSpokenText(rawText: string): string {
    return rawText
      .replace(/[“”"«»]/g, '')
      .replace(/\s*\([^)]*\d+:\d+[^)]*\)/g, '')
      .replace(/\.\.\./g, ', ')
      .replace(/—/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public speak(
    speaker: VoiceSpeakerId,
    rawText: string,
    options?: {
      playerGender?: GenderOption;
      interrupt?: boolean;
    }
  ): void {
    if (!this.enabled || audioEngine.isMuted()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const cleaned = this.cleanSpokenText(rawText);
    if (!cleaned) return;

    const dedupeKey = `${speaker}|${cleaned}`;
    const now = Date.now();
    if (
      dedupeKey === this.lastSpokenKey &&
      now - this.lastSpokenTime < 1200
    ) {
      return;
    }
    this.lastSpokenKey = dedupeKey;
    this.lastSpokenTime = now;

    this.initVoiceSelection();

    const interrupt = options?.interrupt ?? true;
    if (interrupt) {
      this.stop();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'pt-BR';
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      const profile = this.resolveProfile(speaker, options?.playerGender);
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;
      utterance.volume = profile.volume;

      // Subtle divine resonance shimmer underneath the Voice from Heaven
      if (speaker.toLowerCase().includes('voz dos céus')) {
        audioEngine.playDivineShimmer();
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful no-op when browser blocks speech synthesis
    }
  }
}

export const voiceEngine = new CharacterVoiceEngine();
