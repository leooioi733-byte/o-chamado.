import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Footprints,
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
  THIRD_CUTSCENE_BEATS,
  THIRD_CUTSCENE_CHOICES,
} from '../data/thirdCutscene';
import { CutsceneCameraMode } from '../three/cutsceneJordan';
import { RoadWalkResult } from '../three/cutsceneThirdGalilee';
import { CharacterConfig, DialogueChoice } from '../types/game';
import { audioEngine } from '../utils/audio';
import { voiceEngine } from '../utils/voice';
import { LowPolyViewport } from './LowPolyViewport';

interface ThirdCutsceneStageProps {
  character: CharacterConfig;
  initialBeatIndex?: number;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSelectChoice: (choice: DialogueChoice) => void;
  onFinishCutscene: () => void;
}

const CAMERA_MODES: { id: CutsceneCameraMode; label: string }[] = [
  { id: 'auto', label: 'Cinema' },
  { id: 'aerea', label: 'Aérea' },
  { id: 'discipulo', label: 'Discípulo' },
];

export const ThirdCutsceneStage: React.FC<ThirdCutsceneStageProps> = ({
  character,
  initialBeatIndex = 0,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onSelectChoice,
  onFinishCutscene,
}) => {
  const [roadWalkActive, setRoadWalkActive] = useState<boolean>(
    initialBeatIndex === 0
  );
  const [walkDistance, setWalkDistance] = useState<number>(14);
  const [walkReached, setWalkReached] = useState<boolean>(false);
  const [autoWalk, setAutoWalk] = useState<boolean>(false);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [beatIndex, setBeatIndex] = useState(initialBeatIndex);
  const [beatProgress, setBeatProgress] = useState(0);
  const [showingIntertitle, setShowingIntertitle] = useState<boolean>(
    Boolean(THIRD_CUTSCENE_BEATS[initialBeatIndex]?.intertitle)
  );
  const [choicePromptReady, setChoicePromptReady] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CutsceneCameraMode>('auto');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() =>
    voiceEngine.isEnabled()
  );

  const crescendoPlayedRef = useRef(false);
  const lastSpokenLineKeyRef = useRef('');

  const inputRef = useRef<{ forward: number; right: number }>({
    forward: 0,
    right: 0,
  });
  const keysHeldRef = useRef<Set<string>>(new Set());
  const joystickVecRef = useRef<{ forward: number; right: number }>({
    forward: 0,
    right: 0,
  });
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const walkReachedOnceRef = useRef<boolean>(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return voiceEngine.subscribe(setVoiceEnabled);
  }, []);

  useEffect(() => {
    setBeatIndex(initialBeatIndex);
    setBeatProgress(0);
    setChoicePromptReady(false);
    setRoadWalkActive(initialBeatIndex === 0);
    setWalkReached(false);
    setAutoWalk(false);
    walkReachedOnceRef.current = false;
    setShowingIntertitle(
      Boolean(THIRD_CUTSCENE_BEATS[initialBeatIndex]?.intertitle)
    );
    crescendoPlayedRef.current = false;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, [initialBeatIndex]);

  const beat = THIRD_CUTSCENE_BEATS[beatIndex] ?? THIRD_CUTSCENE_BEATS[0];
  const isLastBeat = beatIndex === THIRD_CUTSCENE_BEATS.length - 1;
  const openHeavenCutoff = beat.openHeavenUiCutoff ?? 0.37;
  const isOpenHeavenZeroUi =
    !roadWalkActive &&
    Boolean(beat.hasOpenHeavenMoment) &&
    !showingIntertitle &&
    beatProgress >= openHeavenCutoff;

  const syncCombinedInput = useCallback(() => {
    if (!roadWalkActive || showingIntertitle || walkReachedOnceRef.current) {
      inputRef.current.forward = 0;
      inputRef.current.right = 0;
      return;
    }
    if (autoWalk) {
      inputRef.current.forward = 1;
      inputRef.current.right = 0;
      return;
    }

    const keys = keysHeldRef.current;
    let kf = 0;
    let kr = 0;
    if (keys.has('w') || keys.has('arrowup')) kf += 1;
    if (keys.has('s') || keys.has('arrowdown')) kf -= 1;
    if (keys.has('d') || keys.has('arrowright')) kr += 1;
    if (keys.has('a') || keys.has('arrowleft')) kr -= 1;

    const j = joystickVecRef.current;
    const f = Math.abs(j.forward) > 0.05 ? j.forward : kf;
    const r = Math.abs(j.right) > 0.05 ? j.right : kr;

    const len = Math.hypot(f, r);
    if (len > 1) {
      inputRef.current.forward = f / len;
      inputRef.current.right = r / len;
    } else {
      inputRef.current.forward = f;
      inputRef.current.right = r;
    }
  }, [roadWalkActive, showingIntertitle, autoWalk]);

  useEffect(() => {
    syncCombinedInput();
  }, [roadWalkActive, showingIntertitle, autoWalk, syncCombinedInput]);

  useEffect(() => {
    if (!roadWalkActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
        ].includes(k)
      ) {
        if (showingIntertitle) setShowingIntertitle(false);
        if (autoWalk) setAutoWalk(false);
        keysHeldRef.current.add(k);
        syncCombinedInput();
      }
      if (showingIntertitle && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setShowingIntertitle(false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.key.toLowerCase());
      syncCombinedInput();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysHeldRef.current.clear();
    };
  }, [roadWalkActive, showingIntertitle, autoWalk, syncCombinedInput]);

  const cycleCameraMode = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.id === cameraMode);
    setCameraMode(CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].id);
  };
  const currentCamLabel =
    CAMERA_MODES.find((m) => m.id === cameraMode)?.label ?? 'Cinema';

  // Dawn ambience: morning breeze & birds early on, hush before Cena 4 confession, radiant Open Heaven chord
  useEffect(() => {
    if (roadWalkActive || beatIndex === 0) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.56,
        windLevel: 0.36,
      });
    } else if (beatIndex === 1 || beatIndex === 2) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.32,
        windLevel: 0.24,
      });
    } else {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.0,
        windLevel: 0.1,
      });
    }
  }, [roadWalkActive, beatIndex]);

  // Footsteps during interactive road walk
  useEffect(() => {
    if (!roadWalkActive || showingIntertitle || walkReached || muted) return;
    const stepTimer = window.setInterval(() => {
      const mag = Math.hypot(
        inputRef.current.forward,
        inputRef.current.right
      );
      if (mag > 0.12) {
        audioEngine.playFootstep('dirt');
      }
    }, 370);
    return () => window.clearInterval(stepTimer);
  }, [roadWalkActive, showingIntertitle, walkReached, muted]);

  // Timed dirt footsteps during Cena 1 exit and Cena 3 plano-sequência walk
  useEffect(() => {
    if (roadWalkActive || paused || showingIntertitle) return;
    const timers: number[] = [];

    if (beatIndex === 0) {
      [450, 1100, 1750, 2400, 5000, 5650, 6300].forEach((ms) => {
        timers.push(window.setTimeout(() => audioEngine.playFootstep('dirt'), ms));
      });
    } else if (beatIndex === 2) {
      [350, 950, 1550, 2150, 2750, 3350, 3950].forEach((ms) => {
        timers.push(window.setTimeout(() => audioEngine.playFootstep('dirt'), ms));
      });
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [roadWalkActive, beatIndex, paused, showingIntertitle]);

  useEffect(() => {
    return () => {
      audioEngine.setJordanAmbience(false);
      voiceEngine.stop();
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Trigger rising heaven chord score & ethereal shimmer strictly when the sky opens in Cena 5
  useEffect(() => {
    if (isOpenHeavenZeroUi && !crescendoPlayedRef.current) {
      crescendoPlayedRef.current = true;
      audioEngine.playDivineShimmer();
      audioEngine.playHeavenCrescendo();
    }
  }, [isOpenHeavenZeroUi]);

  // Brief chapter intertitle on start
  useEffect(() => {
    if ((roadWalkActive && beatIndex === 0) || (!roadWalkActive && beat.intertitle && beatIndex > 0)) {
      if (beatIndex === 0) {
        setShowingIntertitle(true);
        const t = window.setTimeout(() => {
          setShowingIntertitle(false);
        }, 2300);
        return () => clearTimeout(t);
      }
    }
    if (!roadWalkActive) {
      setShowingIntertitle(false);
    }
  }, [beatIndex, beat.intertitle, roadWalkActive]);

  // Frame-accurate beat progress driver respecting pause, road walk & intertitle & Cena 2 choice pause
  useEffect(() => {
    if (roadWalkActive || paused || showingIntertitle || choicePromptReady) return;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      setBeatProgress((prev) => {
        const next = Math.min(1, prev + dt / Math.max(0.5, beat.durationSec));
        if (next >= 1) {
          if (beat.pausesForChoice) {
            setChoicePromptReady(true);
            return 1;
          }
          if (isLastBeat) {
            onFinishCutscene();
            return 1;
          }
          setBeatIndex((b) =>
            Math.min(THIRD_CUTSCENE_BEATS.length - 1, b + 1)
          );
          return 0;
        }
        return next;
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [
    roadWalkActive,
    beatIndex,
    beat.durationSec,
    beat.pausesForChoice,
    isLastBeat,
    paused,
    showingIntertitle,
    choicePromptReady,
    onFinishCutscene,
  ]);

  // Reset progress cleanly when changing beats
  useEffect(() => {
    setBeatProgress(0);
    setChoicePromptReady(false);
    if (beatIndex < 4) crescendoPlayedRef.current = false;
  }, [beatIndex]);

  // Auto-fade top utility controls after 3.0s unless paused, walking, or waiting for choice
  useEffect(() => {
    if (isOpenHeavenZeroUi) {
      setControlsVisible(false);
      return;
    }
    setControlsVisible(true);
    if (roadWalkActive || paused || choicePromptReady) return;
    const hideTimer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
    return () => clearTimeout(hideTimer);
  }, [roadWalkActive, beatIndex, paused, choicePromptReady, isOpenHeavenZeroUi]);

  const beginCallingCutscene = useCallback(() => {
    audioEngine.playSoftConfirm();
    setRoadWalkActive(false);
    setShowingIntertitle(false);
    setBeatIndex(0);
    setBeatProgress(0);
  }, []);

  const handleRoadWalkProgress = useCallback(
    (res: RoadWalkResult) => {
      setWalkDistance(res.distanceToJesus);
      if (res.reachedJesus && !walkReachedOnceRef.current) {
        walkReachedOnceRef.current = true;
        setWalkReached(true);
        setAutoWalk(false);
        inputRef.current.forward = 0;
        inputRef.current.right = 0;
        audioEngine.playClothRustle();
        transitionTimerRef.current = window.setTimeout(() => {
          beginCallingCutscene();
        }, 900);
      }
    },
    [beginCallingCutscene]
  );

  const handleChoose = (choice: DialogueChoice) => {
    onSelectChoice(choice);
    setChoicePromptReady(false);
    setBeatIndex(2); // Cena 3 — Plano-sequência até a figueira
  };

  const handleViewportTap = () => {
    if (showingIntertitle) {
      setShowingIntertitle(false);
      return;
    }
    if (isOpenHeavenZeroUi) return; // Keep Open Heaven completely UI-free
    setControlsVisible(true);
  };

  const handleNext = () => {
    if (roadWalkActive) {
      beginCallingCutscene();
      return;
    }
    if (beat.pausesForChoice && !choicePromptReady) {
      setChoicePromptReady(true);
      setBeatProgress(1);
      return;
    }
    if (isLastBeat) {
      onFinishCutscene();
      return;
    }
    setBeatIndex((prev) => Math.min(THIRD_CUTSCENE_BEATS.length - 1, prev + 1));
  };

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    joystickVecRef.current.right = dx / maxR;
    joystickVecRef.current.forward = -dy / maxR;
    if (autoWalk) setAutoWalk(false);
    syncCombinedInput();
  };

  const resetJoystick = () => {
    activePointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    joystickVecRef.current.forward = 0;
    joystickVecRef.current.right = 0;
    syncCombinedInput();
  };

  const activeLine =
    !roadWalkActive && !showingIntertitle && !isOpenHeavenZeroUi
      ? beat.lines.find(
          (l) => beatProgress >= l.startAt && beatProgress <= l.endAt
        ) ?? null
      : null;

  // Speak each active dialogue line once when it enters view; stop cleanly if paused or Open Heaven starts
  const activeLineKey = activeLine
    ? `${beatIndex}_${activeLine.speaker}_${activeLine.text}`
    : '';
  useEffect(() => {
    if (
      roadWalkActive ||
      paused ||
      showingIntertitle ||
      isOpenHeavenZeroUi ||
      muted ||
      !voiceEnabled
    ) {
      if (
        !activeLineKey ||
        roadWalkActive ||
        paused ||
        isOpenHeavenZeroUi ||
        muted ||
        !voiceEnabled
      ) {
        voiceEngine.stop();
      }
      if (!activeLineKey) {
        lastSpokenLineKeyRef.current = '';
      }
      return;
    }
    if (activeLine && activeLineKey !== lastSpokenLineKeyRef.current) {
      lastSpokenLineKeyRef.current = activeLineKey;
      voiceEngine.speak(activeLine.speaker, activeLine.text, {
        playerGender: character.gender,
      });
    }
  }, [
    roadWalkActive,
    activeLine,
    activeLineKey,
    paused,
    showingIntertitle,
    isOpenHeavenZeroUi,
    muted,
    voiceEnabled,
    character.gender,
  ]);

  return (
    <div
      onMouseMove={() => {
        if (!isOpenHeavenZeroUi) setControlsVisible(true);
      }}
      onClick={handleViewportTap}
      className="relative w-full h-[100dvh] overflow-hidden bg-[#100d0a] select-none"
    >
      {/* Full-Bleed 3D Cutscene III Viewport */}
      <div className="absolute inset-0 z-0">
        <LowPolyViewport
          mode="cutscene_third"
          character={character}
          cutsceneBeatIndex={beatIndex}
          cutsceneBeatDuration={beat.durationSec}
          cutsceneBeatProgress={beatProgress}
          cutsceneCameraMode={cameraMode}
          followInputRef={inputRef}
          thirdWalkMode={roadWalkActive}
          onThirdWalkProgress={handleRoadWalkProgress}
        />
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
            isOpenHeavenZeroUi ? 'opacity-10' : 'opacity-100'
          }`}
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 56%, rgba(10,8,6,0.44) 100%)',
          }}
        />
      </div>

      {/* Whisper-thin progress hairline — hidden completely during Open Heaven */}
      {!isOpenHeavenZeroUi && (
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-1 pointer-events-none">
          {THIRD_CUTSCENE_BEATS.map((b, idx) => (
            <div
              key={b.beatNumber}
              className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${
                !roadWalkActive && idx <= beatIndex
                  ? 'bg-[#eab668]/85'
                  : 'bg-[#f5efe6]/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Discreet Top Bar — strictly hidden during Open Heaven */}
      {!isOpenHeavenZeroUi && (
        <header
          className={`relative z-20 flex items-center justify-between gap-4 px-5 sm:px-8 pt-4 transition-opacity duration-500 ${
            controlsVisible || roadWalkActive || paused || choicePromptReady
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="min-w-0">
            <div
              className="text-xs sm:text-sm text-[#f5efe6]/95 font-medium truncate"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
            >
              {roadWalkActive
                ? walkReached
                  ? 'Jesus se detém na estrada e volta o olhar para vocês...'
                  : `Estrada da Galileia · Acompanhe os discípulos de Jesus (${walkDistance.toFixed(0)} m)`
                : beat.contextCue}
            </div>
            <div
              className="text-[11px] text-[#eab668]/90 tabular-nums"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
            >
              {roadWalkActive
                ? 'Caminhada entre as oliveiras · Aproxime-se para iniciar o chamado'
                : `Cena ${beat.beatNumber} de ${THIRD_CUTSCENE_BEATS.length} · ${beat.title}`}
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 sm:gap-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {roadWalkActive ? (
              <>
                <button
                  type="button"
                  onClick={() => setAutoWalk((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    autoWalk
                      ? 'border-[#eab668] bg-[#d99b43]/25 text-[#eab668]'
                      : 'border-[#e8dec8]/20 bg-[#14110d]/85 text-[#f5efe6]/85 hover:border-[#eab668]/60'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {autoWalk ? 'Caminhando...' : 'Caminhar auto'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={beginCallingCutscene}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f5efe6]/85 hover:text-[#eab668] transition-colors cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ir à cena</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (beatIndex === 0) {
                      walkReachedOnceRef.current = false;
                      setWalkReached(false);
                      setRoadWalkActive(true);
                    } else {
                      setChoicePromptReady(false);
                      setBeatIndex((prev) => Math.max(0, prev - 1));
                    }
                  }}
                  aria-label="Cena anterior"
                  className="w-8 h-8 inline-flex items-center justify-center text-[#f5efe6]/80 hover:text-[#eab668] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {!choicePromptReady && (
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
                )}

                {!choicePromptReady && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f5efe6]/85 hover:text-[#eab668] transition-colors cursor-pointer"
                  >
                    <span>{isLastBeat ? 'Concluir' : 'Próxima'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
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
              </>
            )}

            <button
              type="button"
              onClick={() => voiceEngine.toggleEnabled()}
              title={
                voiceEnabled
                  ? 'Desativar voz dos personagens'
                  : 'Ativar voz dos personagens'
              }
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
      )}

      {/* Brief Chapter Intertitle Card */}
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
            Toque para continuar
          </span>
        </div>
      )}

      {/* Lower-Left Analog Stick during Interactive Galilee Road Walk */}
      {!showingIntertitle && roadWalkActive && !walkReached && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 left-5 sm:bottom-7 sm:left-8 z-20 flex items-end gap-3.5"
        >
          <div
            ref={padRef}
            onPointerDown={(e) => {
              activePointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              updateJoystickFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (activePointerIdRef.current !== e.pointerId) return;
              updateJoystickFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (activePointerIdRef.current === e.pointerId) {
                resetJoystick();
              }
            }}
            onPointerCancel={resetJoystick}
            className="relative w-24 h-24 rounded-full border border-[#eab668]/40 bg-[#14110d]/65 touch-none flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div className="w-9 h-9 rounded-full border border-[#e8dec8]/15 pointer-events-none" />
            <div
              className="absolute w-10 h-10 rounded-full bg-[#d99b43]/85 border border-[#f5efe6]/55 shadow-lg pointer-events-none"
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>

          <div
            className="hidden sm:block text-[11px] text-[#cfc3b0]/85 pb-2"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
          >
            Use <span className="text-[#eab668] font-medium">W A S D</span> ou{' '}
            <span className="text-[#eab668] font-medium">Setas</span> pela estrada
          </div>
        </div>
      )}

      {/* Clean Borderless, Boxless Discreet Subtitles (zero UI during Open Heaven) */}
      {activeLine && (
        <div
          className={`pointer-events-none absolute bottom-5 sm:bottom-7 z-10 transition-opacity duration-300 ${
            choicePromptReady || beatIndex === 3
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
            <span className="text-[#eab668] font-medium mr-1.5">
              {activeLine.speaker}:
            </span>
            <span>{activeLine.text}</span>
            <span className="ml-2 text-[11px] text-[#cfc3b0]/75">
              ({activeLine.scriptureRef})
            </span>
          </p>
        </div>
      )}

      {/* Cena 2 Compact Subtle-Bordered Choice Bubble in Lower-Right Corner */}
      {!roadWalkActive &&
        !showingIntertitle &&
        !isOpenHeavenZeroUi &&
        beat.pausesForChoice &&
        choicePromptReady && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-20 w-[min(320px,86vw)] rounded-md border border-[#eab668]/32 bg-[#14110d]/85 p-3 shadow-2xl"
          >
            <div className="text-[11px] text-[#eab668]/95 mb-2">
              Diante da dúvida de Natanael
            </div>
            <div className="flex flex-col gap-1.5">
              {THIRD_CUTSCENE_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleChoose(choice)}
                  className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/14 hover:border-[#eab668]/65 hover:bg-[#d99b43]/15 text-xs text-[#f5efe6] transition-colors cursor-pointer"
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
