import React from 'react';
import {
  Award,
  BookOpen,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { evaluateFaithMilestones } from '../data/faithMilestones';
import { SaveState } from '../types/game';
import { MOTIVATION_META, getDominantMotivation } from '../data/storyScript';
import { audioEngine } from '../utils/audio';
import { CodexTabKey } from './ActsCodexModal';
import { LowPolyViewport } from './LowPolyViewport';

interface TitleScreenProps {
  existingSave: SaveState | null;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onContinue: () => void;
  onNewGame: () => void;
  onOpenCodex: (tab?: CodexTabKey) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  existingSave,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onContinue,
  onNewGame,
  onOpenCodex,
}) => {
  const hasStartedGame = Boolean(existingSave);
  const dominantMotivation = existingSave
    ? MOTIVATION_META[getDominantMotivation(existingSave.motivations)].label
    : null;
  const unlockedMilestones = evaluateFaithMilestones(
    existingSave?.motivations,
    existingSave?.history
  ).filter((m) => m.unlocked).length;

  React.useEffect(() => {
    audioEngine.setJordanAmbience(true, {
      waterLevel: 0.0,
      crowdLevel: 0.0,
      birdsLevel: 0.36,
      windLevel: 0.26,
      wavesLevel: 0.48,
    });
    return () => {
      audioEngine.setJordanAmbience(false);
    };
  }, []);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#16130f] flex flex-col justify-between">
      {/* Live Animated 3D Low-Poly Dawn Beach with Moored Boat, Realistic Sky & Horizon Mist */}
      <div className="absolute inset-0 z-0">
        <LowPolyViewport mode="title" backdrop="dawn_shore" />
        {/* Measured warm horizontal scrim preserving 3D boat & sunrise on the right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(95deg, rgba(16,13,10,0.86) 0%, rgba(16,13,10,0.52) 42%, rgba(16,13,10,0.08) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(16,13,10,0.3) 0%, rgba(16,13,10,0) 35%, rgba(16,13,10,0.6) 100%)',
          }}
        />
      </div>

      {/* Top utility bar */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-10 pt-3 sm:pt-4 [@media(max-height:520px)]:pt-2 pb-1 pointer-events-none shrink-0">
        <span className="text-xs sm:text-sm tracking-[0.22em] uppercase text-[#e8dec8]/85 font-medium whitespace-nowrap shrink-0 pointer-events-auto">
          Flow Studios
        </span>

        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={() => onOpenCodex('marcos')}
            title="Abrir Marcos de Fé no Codex"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#eab668]/95 hover:text-[#f5efe6] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab668]"
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Marcos de Fé</span>
            {unlockedMilestones > 0 && (
              <span className="text-[11px] tabular-nums text-[#eab668]">
                ({unlockedMilestones})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenCodex('cutscene')}
            className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#e8dec8]/90 hover:text-[#eab668] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab668]"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Cutscenes</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som ambiente' : 'Silenciar som ambiente'}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md border border-[#e8dec8]/25 bg-[#16130f]/80 text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab668]"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-md border border-[#e8dec8]/25 bg-[#16130f]/80 text-xs font-medium text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab668]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
            <span className="hidden md:inline">
              {isFullscreen ? 'Sair' : 'Tela cheia'}
            </span>
          </button>
        </div>
      </header>

      {/* Main horizontal left-anchored lockup & menu (adapts cleanly to short landscape viewports) */}
      <section className="relative z-10 flex-1 min-h-0 overflow-y-auto flex items-center px-5 sm:px-10 lg:px-16 py-2 sm:py-4 pointer-events-none">
        <div className="w-full max-w-md [@media(max-height:520px)]:max-w-lg my-auto pointer-events-auto">
          {/* Bespoke 1st-century Ichthys / Dawn Horizon SVG emblem */}
          <div
            className="mb-2.5 [@media(max-height:520px)]:mb-1.5"
            aria-hidden="true"
          >
            <svg
              width="68"
              height="22"
              viewBox="0 0 72 24"
              fill="none"
              className="text-[#eab668] [@media(max-height:520px)]:w-12 [@media(max-height:520px)]:h-4"
            >
              <path
                d="M2 16 C 14 6, 28 6, 40 16 C 28 22, 14 22, 2 16 Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeOpacity="0.85"
              />
              <path
                d="M40 16 L 52 10 M 40 16 L 52 22"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeOpacity="0.85"
              />
              <line
                x1="58"
                y1="16"
                x2="70"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeOpacity="0.45"
              />
            </svg>
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl [@media(max-height:520px)]:text-2xl sm:[@media(max-height:520px)]:text-3xl font-semibold tracking-[0.08em] text-[#f5efe6] leading-[1.06] mb-2.5 [@media(max-height:520px)]:mb-1.5 text-balance"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            O CHAMADO
          </h1>

          <p className="text-xs sm:text-base [@media(max-height:520px)]:text-xs text-[#e8dec8]/90 leading-relaxed mb-1.5 [@media(max-height:520px)]:mb-1">
            “Eis o Cordeiro de Deus.” Às margens do Jordão, um discípulo sem nome dá o primeiro passo — e descobre que a graça precede todas as respostas.
          </p>

          <p className="text-[11px] sm:text-xs text-[#cfc3b0]/80 tracking-wide mb-5 [@media(max-height:520px)]:mb-3">
            João 1:35–40 · 3D Low Poly · Água, Luz e Terra
          </p>

          {/* Primary Menu Options: Continuar stays ON TOP (or first column on compact landscape) */}
          <div className="flex flex-col gap-2.5 sm:gap-3 max-w-xs [@media(max-height:520px)]:grid [@media(max-height:520px)]:grid-cols-2 [@media(max-height:520px)]:max-w-md [@media(max-height:520px)]:gap-2.5">
            {hasStartedGame ? (
              <>
                <button
                  type="button"
                  onClick={onContinue}
                  className="group w-full text-left px-4 sm:px-5 py-3 [@media(max-height:520px)]:py-2 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] active:scale-[0.99] text-[#14100b] font-semibold transition-all duration-150 shadow-lg shadow-black/40 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5efe6]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base tracking-wide">
                      Continuar
                    </span>
                    <span className="text-[11px] sm:text-xs font-medium opacity-80 [@media(max-height:520px)]:hidden">
                      Retomar jornada
                    </span>
                  </div>
                  {existingSave && (
                    <div className="mt-0.5 text-[11px] sm:text-xs text-[#14100b]/80 font-medium truncate">
                      {existingSave.character.name} · {dominantMotivation}
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onNewGame}
                  className="w-full text-left px-4 sm:px-5 py-3 [@media(max-height:520px)]:py-2 rounded-md border border-[#e8dec8]/35 bg-[#16130f]/85 hover:bg-[#1f1b15] hover:border-[#eab668]/80 active:scale-[0.99] text-[#f5efe6] font-medium transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eab668]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base tracking-wide">
                      Novo Jogo
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#cfc3b0]/80 [@media(max-height:520px)]:hidden">
                      Criar novo discípulo
                    </span>
                  </div>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onNewGame}
                  className="w-full text-left px-4 sm:px-5 py-3 [@media(max-height:520px)]:py-2 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] active:scale-[0.99] text-[#14100b] font-semibold transition-all duration-150 shadow-lg shadow-black/40 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5efe6]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base tracking-wide">
                      Novo Jogo
                    </span>
                    <span className="text-[11px] sm:text-xs font-medium opacity-80">
                      Iniciar
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full text-left px-4 sm:px-5 py-3 [@media(max-height:520px)]:py-2 rounded-md border border-[#e8dec8]/20 bg-[#16130f]/75 text-[#cfc3b0]/45 font-medium cursor-not-allowed"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base tracking-wide">
                      Continuar
                    </span>
                    <span className="text-[11px] sm:text-xs">Sem salvo</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Quiet bottom horizontal hint */}
      <footer className="relative z-10 px-5 sm:px-10 pb-2.5 sm:pb-4 pt-1 flex items-center justify-between gap-3 text-[11px] sm:text-xs text-[#cfc3b0]/75 pointer-events-none shrink-0">
        <span>Modo Horizontal · Toque ou clique para escolher</span>
        <span className="hidden sm:inline">Mobile · PC · Consoles</span>
      </footer>
    </main>
  );
};
