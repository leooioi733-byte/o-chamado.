import React, { useEffect, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CUTSCENE_FINAL_CHOICES,
  OPENING_CUTSCENE_BEATS,
} from '../data/openingCutscene';
import { CutsceneCameraMode } from '../three/cutsceneJordan';
import { CharacterConfig, DialogueChoice } from '../types/game';
import { audioEngine, JordanAmbienceConfig } from '../utils/audio';
import { voiceEngine } from '../utils/voice';
import { LowPolyViewport } from './LowPolyViewport';

interface OpeningCutsceneStageProps {
  character: CharacterConfig;
  initialBeatIndex?: number;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSelectChoice: (choice: DialogueChoice) => void;
  onSkipToChoice: () => void;
  onEnterFollowGameplay?: () => void;
}

export const OpeningCutsceneStage: React.FC<OpeningCutsceneStageProps> = ({
  character,
  initialBeatIndex = 0,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onSelectChoice,
  onSkipToChoice,
  onEnterFollowGameplay,
}) => {
  const [beatIndex, setBeatIndex] = useState(initialBeatIndex);
  const [showingIntertitle, setShowingIntertitle] = useState<boolean>(
    Boolean(OPENING_CUTSCENE_BEATS[initialBeatIndex]?.intertitle)
  );
  const [paused, setPaused] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cameraMode, setCameraMode] = useState<CutsceneCameraMode>('auto');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() =>
    voiceEngine.isEnabled()
  );

  useEffect(() => {
    return voiceEngine.subscribe(setVoiceEnabled);
  }, []);

  useEffect(() => {
    setBeatIndex(initialBeatIndex);
  }, [initialBeatIndex]);

  const CAMERA_MODES: { id: CutsceneCameraMode; label: string }[] = [
    { id: 'auto', label: 'Cinema' },
    { id: 'aerea', label: 'Aérea' },
    { id: 'discipulo', label: 'Discípulo' },
    { id: 'margem', label: 'Margem' },
  ];
  const cycleCameraMode = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.id === cameraMode);
    setCameraMode(CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].id);
  };
  const currentCamLabel =
    CAMERA_MODES.find((m) => m.id === cameraMode)?.label ?? 'Cinema';

  const beat = OPENING_CUTSCENE_BEATS[beatIndex];
  const isLastBeat = beatIndex === OPENING_CUTSCENE_BEATS.length - 1;

  // Dynamic Jordan Valley soundscape per cutscene beat (river, birds, crowd, cliff wind & terrace fire)
  useEffect(() => {
    const presets: Record<number, Partial<JordanAmbienceConfig>> = {
      0: { waterLevel: 0.34, crowdLevel: 0.42, birdsLevel: 0.78, windLevel: 0.46, fireLevel: 0.22 }, // Cena 1: Topo do barranco ao amanhecer
      1: { waterLevel: 0.58, crowdLevel: 0.56, birdsLevel: 0.55, windLevel: 0.28, fireLevel: 0.16 }, // Cena 2: Descendo pelas pedras
      2: { waterLevel: 0.9, crowdLevel: 0.36, birdsLevel: 0.25, windLevel: 0.14, fireLevel: 0.0 },   // Cena 3: João dentro da água
      3: { waterLevel: 0.44, crowdLevel: 0.14, birdsLevel: 0.12, windLevel: 0.12, fireLevel: 0.0 },  // Cena 4: João para ao ver Jesus
      4: { waterLevel: 0.62, crowdLevel: 0.0, birdsLevel: 0.0, windLevel: 0.16, fireLevel: 0.0 },    // Cena 5: Batismo e céus abertos
      5: { waterLevel: 0.36, crowdLevel: 0.08, birdsLevel: 0.24, windLevel: 0.22, fireLevel: 0.55 }, // Cena 6: Terraço das fogueiras
      6: { waterLevel: 0.52, crowdLevel: 0.0, birdsLevel: 0.85, windLevel: 0.28, fireLevel: 0.14 },  // Cena 7: Manhã do dia seguinte
      7: { waterLevel: 0.44, crowdLevel: 0.0, birdsLevel: 0.45, windLevel: 0.18, fireLevel: 0.0 },   // Cena 8: "Que buscais?"
    };
    const cfg = presets[beatIndex] ?? {
      waterLevel: 0.48,
      crowdLevel: 0.1,
      birdsLevel: 0.4,
      windLevel: 0.2,
    };
    audioEngine.setJordanAmbience(true, cfg);
  }, [beatIndex]);

  // Timed foley sound effects matching beat actions (stone steps, baptism splash & shimmer, dirt steps)
  useEffect(() => {
    if (paused || showingIntertitle) return;
    const timers: number[] = [];

    if (beatIndex === 1) {
      // Descending zigzag limestone path
      [350, 950, 1550, 2150, 2750, 3350, 3950].forEach((ms) => {
        timers.push(window.setTimeout(() => audioEngine.playFootstep('stone'), ms));
      });
    } else if (beatIndex === 4) {
      // Jesus wading into the Jordan + emerging under opened heaven
      timers.push(window.setTimeout(() => audioEngine.playWaterSplash(0.55), 800));
      timers.push(window.setTimeout(() => audioEngine.playWaterSplash(0.85), 2550));
      timers.push(window.setTimeout(() => audioEngine.playDivineShimmer(), 2950));
    } else if (beatIndex === 6) {
      // Following behind Jesus along the morning grass/dust
      [3300, 3950, 4600, 5250, 5900].forEach((ms) => {
        timers.push(window.setTimeout(() => audioEngine.playFootstep('dirt'), ms));
      });
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [beatIndex, paused, showingIntertitle]);

  // Character voice synthesis synchronized with beat dialogue
  useEffect(() => {
    if (paused || showingIntertitle || !beat.subtitle || muted || !voiceEnabled) {
      voiceEngine.stop();
      return;
    }

    const delayMs = beatIndex === 4 ? 3200 : beatIndex === 3 ? 1100 : 450;
    const t = window.setTimeout(() => {
      voiceEngine.speak(beat.speaker ?? 'narrator', beat.subtitle!, {
        playerGender: character.gender,
      });
    }, delayMs);

    return () => {
      window.clearTimeout(t);
      voiceEngine.stop();
    };
  }, [
    beatIndex,
    beat.speaker,
    beat.subtitle,
    paused,
    showingIntertitle,
    muted,
    voiceEnabled,
    character.gender,
  ]);

  useEffect(() => {
    return () => {
      audioEngine.setJordanAmbience(false);
      voiceEngine.stop();
    };
  }, []);

  // Show intertitle card briefly whenever a beat defines one (e.g. Cena 1 & Cena 7 "No Dia Seguinte")
  useEffect(() => {
    if (beat.intertitle) {
      setShowingIntertitle(true);
      const t = window.setTimeout(() => {
        setShowingIntertitle(false);
      }, 2400);
      return () => clearTimeout(t);
    } else {
      setShowingIntertitle(false);
    }
  }, [beatIndex, beat.intertitle]);

  const advanceNextBeat = () => {
    if (beatIndex === 6 && onEnterFollowGameplay) {
      onEnterFollowGameplay();
      return;
    }
    setBeatIndex((prev) =>
      Math.min(OPENING_CUTSCENE_BEATS.length - 1, prev + 1)
    );
  };

  // Auto-advance contemplative pacing across beats 1..7 when not paused or in intertitle
  useEffect(() => {
    if (isLastBeat || paused || showingIntertitle) return;
    const timer = window.setTimeout(() => {
      if (beatIndex === 6 && onEnterFollowGameplay) {
        onEnterFollowGameplay();
      } else {
        setBeatIndex((prev) =>
          Math.min(OPENING_CUTSCENE_BEATS.length - 1, prev + 1)
        );
      }
    }, beat.durationSec * 1000);
    return () => clearTimeout(timer);
  }, [
    beatIndex,
    beat.durationSec,
    isLastBeat,
    paused,
    showingIntertitle,
    onEnterFollowGameplay,
  ]);

  // Auto-fade top utility bar after 3.2s unless paused or on Beat 8
  useEffect(() => {
    setControlsVisible(true);
    if (paused || isLastBeat) return;
    const hideTimer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3200);
    return () => clearTimeout(hideTimer);
  }, [beatIndex, paused, isLastBeat]);

  const handleViewportTap = () => {
    if (showingIntertitle) {
      setShowingIntertitle(false);
      return;
    }
    setControlsVisible(true);
  };

  return (
    <div
      onMouseMove={() => setControlsVisible(true)}
      onClick={handleViewportTap}
      className="relative w-full h-[100dvh] overflow-hidden bg-[#12100d] select-none"
    >
      {/* Full-Bleed 3D Low-Poly Jordan Valley Cutscene */}
      <div className="absolute inset-0 z-0">
        <LowPolyViewport
          mode="cutscene_jordan"
          character={character}
          cutsceneBeatIndex={beatIndex}
          cutsceneBeatDuration={beat.durationSec}
          cutsceneCameraMode={cameraMode}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 55%, rgba(10,8,6,0.52) 100%)',
          }}
        />
      </div>

      {/* Whisper-thin 8-beat progress hairline at very top edge */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-1 pointer-events-none">
        {OPENING_CUTSCENE_BEATS.map((b, idx) => (
          <div
            key={b.beatNumber}
            className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${
              idx <= beatIndex ? 'bg-[#eab668]/85' : 'bg-[#f5efe6]/20'
            }`}
          />
        ))}
      </div>

      {/* Discreet Top-Left Orienting Cue + Top-Right Controls */}
      <header
        className={`relative z-20 flex items-center justify-between gap-4 px-5 sm:px-8 pt-4 transition-opacity duration-500 ${
          controlsVisible || isLastBeat || paused
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-w-0">
          <div
            className="text-xs sm:text-sm text-[#f5efe6]/90 font-medium truncate"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
          >
            {beat.contextCue}
          </div>
          <div
            className="text-[11px] text-[#eab668]/85 tabular-nums"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
          >
            Cena {beat.beatNumber} de {OPENING_CUTSCENE_BEATS.length} ·{' '}
            {beat.title}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 sm:gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {beatIndex > 0 && (
            <button
              type="button"
              onClick={() => setBeatIndex((prev) => Math.max(0, prev - 1))}
              aria-label="Cena anterior"
              className="w-8 h-8 inline-flex items-center justify-center text-[#f5efe6]/80 hover:text-[#eab668] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {!isLastBeat && (
            <>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Retomar cutscene' : 'Pausar cutscene'}
                className="w-8 h-8 inline-flex items-center justify-center text-[#f5efe6]/80 hover:text-[#eab668] transition-colors cursor-pointer"
              >
                {paused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={advanceNextBeat}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f5efe6]/85 hover:text-[#eab668] transition-colors cursor-pointer"
              >
                <span>{beatIndex === 6 ? 'Seguir Jesus' : 'Próxima'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowingIntertitle(false);
                  setBeatIndex(OPENING_CUTSCENE_BEATS.length - 1);
                  onSkipToChoice();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f5efe6]/70 hover:text-[#eab668] transition-colors cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ir à escolha</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={cycleCameraMode}
            title="Mudar ângulo da câmera"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#eab668]/90 hover:text-[#f5efe6] transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{currentCamLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => voiceEngine.toggleEnabled()}
            title={voiceEnabled ? 'Desativar voz dos personagens' : 'Ativar voz dos personagens'}
            aria-label={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs transition-colors cursor-pointer ${
              voiceEnabled
                ? 'text-[#eab668] hover:text-[#f5efe6]'
                : 'text-[#f5efe6]/45 hover:text-[#f5efe6]/80'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Voz</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            className="w-8 h-8 inline-flex items-center justify-center text-[#f5efe6]/80 hover:text-[#eab668] transition-colors cursor-pointer"
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
            className="w-8 h-8 inline-flex items-center justify-center text-[#f5efe6]/80 hover:text-[#eab668] transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Time-Jump & Chapter Intertitle Card (Cena 1 & Cena 7 "No Dia Seguinte") */}
      {showingIntertitle && beat.intertitle && (
        <div className="absolute inset-0 z-30 bg-[#0d0b09]/92 flex flex-col items-center justify-center text-center px-6 cursor-pointer">
          <div className="text-xs tracking-[0.2em] uppercase text-[#eab668] mb-2">
            {beat.intertitle.kicker}
          </div>
          <h2
            className="text-2xl sm:text-4xl font-semibold text-[#f5efe6] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {beat.intertitle.heading}
          </h2>
          <p className="text-xs sm:text-sm text-[#cfc3b0]/85 max-w-md mb-6">
            {beat.intertitle.subtext}
          </p>
          <span className="text-[11px] text-[#cfc3b0]/55">
            Toque para continuar imediatamente
          </span>
        </div>
      )}

      {/* Borderless, Boxless Discreet Subtitles */}
      {!showingIntertitle && beat.subtitle && (
        <div
          className={`pointer-events-none absolute bottom-5 sm:bottom-7 z-10 transition-all duration-500 ${
            isLastBeat
              ? 'left-6 sm:left-10 max-w-md text-left'
              : 'left-1/2 -translate-x-1/2 max-w-xl w-[90%] text-center'
          }`}
        >
          <p
            className="text-xs sm:text-sm md:text-[15px] text-[#f5efe6]/95 leading-relaxed font-normal"
            style={{
              textShadow:
                '0 2px 10px rgba(0,0,0,0.98), 0 1px 3px rgba(0,0,0,0.95)',
            }}
          >
            {beat.speaker && (
              <span className="text-[#eab668] font-medium mr-1.5">
                {beat.speaker}:
              </span>
            )}
            <span>{beat.subtitle}</span>
            {beat.scriptureRef && (
              <span className="ml-2 text-[11px] text-[#cfc3b0]/80">
                ({beat.scriptureRef})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Beat 8 Only: Subtle-bordered compact choice bubble in lower-right corner */}
      {!showingIntertitle && beat.isFinalChoiceBeat && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-20 w-[min(340px,86vw)] rounded-md border border-[#eab668]/35 bg-[#14110d]/84 p-3 sm:p-3.5 shadow-2xl"
        >
          <div className="text-[11px] text-[#eab668]/95 mb-2">
            Fim da abertura · Sua resposta a Jesus
          </div>
          <div className="flex flex-col gap-1.5">
            {CUTSCENE_FINAL_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelectChoice(choice)}
                className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/12 hover:border-[#eab668]/65 hover:bg-[#d99b43]/15 text-xs text-[#f5efe6] transition-colors cursor-pointer"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
