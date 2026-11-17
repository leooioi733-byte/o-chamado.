import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  SECOND_CUTSCENE_BEATS,
  SECOND_CUTSCENE_CHOICES,
  WELL_CHOICES,
  WIDOW_CHOICES,
} from '../data/secondCutscene';
import { CutsceneCameraMode } from '../three/cutsceneJordan';
import {
  WellMissionResult,
  WellMissionState,
} from '../three/cutsceneSecondHouse';
import {
  CharacterConfig,
  DialogueChoice,
  SecondCutsceneConsequences,
} from '../types/game';
import { audioEngine } from '../utils/audio';
import { voiceEngine } from '../utils/voice';
import { LowPolyViewport } from './LowPolyViewport';

interface SecondCutsceneStageProps {
  character: CharacterConfig;
  initialBeatIndex?: number;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSelectChoice: (choice: DialogueChoice) => void;
  onUpdateConsequences: (patch: Partial<SecondCutsceneConsequences>) => void;
  onFinishCutscene: () => void;
}

const CAMERA_MODES: { id: CutsceneCameraMode; label: string }[] = [
  { id: 'auto', label: 'Cinema' },
  { id: 'aerea', label: 'Aérea' },
  { id: 'discipulo', label: 'Discípulo' },
];

export const SecondCutsceneStage: React.FC<SecondCutsceneStageProps> = ({
  character,
  initialBeatIndex = 0,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onSelectChoice,
  onUpdateConsequences,
  onFinishCutscene,
}) => {
  const [beatIndex, setBeatIndex] = useState(initialBeatIndex);
  const [showingIntertitle, setShowingIntertitle] = useState<boolean>(
    Boolean(SECOND_CUTSCENE_BEATS[initialBeatIndex]?.intertitle)
  );
  const [choicePromptReady, setChoicePromptReady] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CutsceneCameraMode>('auto');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() =>
    voiceEngine.isEnabled()
  );

  useEffect(() => {
    return voiceEngine.subscribe(setVoiceEnabled);
  }, []);

  // Village Well Mission interactive state (Cena 4)
  const [missionState, setMissionState] = useState<WellMissionState>({
    widowResolved: false,
    helpedWidow: null,
    wellResolved: false,
    wellPace: null,
  });
  const [telemetry, setTelemetry] = useState<WellMissionResult>({
    nearWidow: false,
    nearWell: false,
    nearDoorReturn: false,
    distToWidow: 11.4,
    distToWell: 23.3,
    distToDoor: 0.6,
  });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

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
  const returnedOnceRef = useRef<boolean>(false);

  useEffect(() => {
    setBeatIndex(initialBeatIndex);
    setChoicePromptReady(false);
    setShowingIntertitle(
      Boolean(SECOND_CUTSCENE_BEATS[initialBeatIndex]?.intertitle)
    );
    returnedOnceRef.current = false;
  }, [initialBeatIndex]);

  const beat = SECOND_CUTSCENE_BEATS[beatIndex] ?? SECOND_CUTSCENE_BEATS[0];
  const isLastBeat = beatIndex === SECOND_CUTSCENE_BEATS.length - 1;
  const isChoiceBeat = Boolean(beat.pausesForChoice);
  const isGameplayBeat = Boolean(beat.isGameplayMission);

  const cycleCameraMode = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.id === cameraMode);
    setCameraMode(CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].id);
  };
  const currentCamLabel =
    CAMERA_MODES.find((m) => m.id === cameraMode)?.label ?? 'Cinema';

  const modalBubbleOpen =
    isGameplayBeat &&
    ((telemetry.nearWidow && !missionState.widowResolved) ||
      (telemetry.nearWell && !missionState.wellResolved));

  const syncCombinedInput = useCallback(() => {
    if (!isGameplayBeat || modalBubbleOpen || showingIntertitle) {
      inputRef.current.forward = 0;
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
  }, [isGameplayBeat, modalBubbleOpen, showingIntertitle]);

  useEffect(() => {
    syncCombinedInput();
  }, [isGameplayBeat, modalBubbleOpen, showingIntertitle, syncCombinedInput]);

  useEffect(() => {
    if (!isGameplayBeat) return;
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
        keysHeldRef.current.add(k);
        syncCombinedInput();
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
  }, [isGameplayBeat, syncCombinedInput]);

  // Contextual soundscape across road walk, empty basin, well mission, foot washing & table dusk
  useEffect(() => {
    if (beatIndex === 0) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.14,
        crowdLevel: 0.0,
        birdsLevel: 0.24,
        windLevel: 0.28,
        fireLevel: 0.0,
        cricketLevel: 0.0,
      });
    } else if (beatIndex === 1) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.04,
        crowdLevel: 0.0,
        birdsLevel: 0.18,
        windLevel: 0.34,
        fireLevel: 0.0,
        cricketLevel: 0.12,
      });
    } else if (beatIndex === 2) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.0,
        windLevel: 0.08,
        fireLevel: 0.34,
        cricketLevel: 0.15,
      });
      audioEngine.startAmbient();
    } else if (beatIndex === 3) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.08,
        crowdLevel: 0.0,
        birdsLevel: 0.2,
        windLevel: 0.25,
        fireLevel: 0.0,
        cricketLevel: 0.36,
      });
    } else if (beatIndex === 4) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: missionState.wellPace === 'hurried' ? 0.34 : 0.2,
        crowdLevel: 0.0,
        birdsLevel: 0.0,
        windLevel: 0.06,
        fireLevel: 0.36,
        cricketLevel: 0.25,
      });
    } else {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.0,
        windLevel: 0.06,
        fireLevel: 0.32,
        cricketLevel: 0.62,
      });
      audioEngine.playPluck(0);
    }
  }, [beatIndex, missionState.wellPace]);

  // Timed foley per scene beat (road footsteps + low door creak in Cena 2; pouring + washing water in Cena 5)
  useEffect(() => {
    if (paused || showingIntertitle) return;
    const timers: number[] = [];

    if (beatIndex === 1) {
      [1000, 1650, 2300, 2950, 3600, 4250, 4900, 5550, 6200, 6850].forEach((ms) => {
        timers.push(window.setTimeout(() => audioEngine.playFootstep('dirt'), ms));
      });
      timers.push(window.setTimeout(() => audioEngine.playDoorCreak(), 7200));
    } else if (beatIndex === 4) {
      timers.push(window.setTimeout(() => audioEngine.playWaterPour(), 450));
      timers.push(window.setTimeout(() => audioEngine.playWaterSplash(0.55), 2550));
      timers.push(window.setTimeout(() => audioEngine.playWaterSplash(0.5), 5150));
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [beatIndex, paused, showingIntertitle]);

  // Footsteps during Cena 4 village well mission gameplay
  useEffect(() => {
    if (!isGameplayBeat || modalBubbleOpen || showingIntertitle || muted) return;
    const stepTimer = window.setInterval(() => {
      const mag = Math.hypot(
        inputRef.current.forward,
        inputRef.current.right
      );
      if (mag > 0.12) {
        audioEngine.playFootstep('dirt');
      }
    }, 390);
    return () => window.clearInterval(stepTimer);
  }, [isGameplayBeat, modalBubbleOpen, showingIntertitle, muted]);

  useEffect(() => {
    return () => {
      audioEngine.setJordanAmbience(false);
      voiceEngine.stop();
    };
  }, []);

  // Show intertitle briefly on Cena 1
  useEffect(() => {
    if (beat.intertitle) {
      setShowingIntertitle(true);
      const t = window.setTimeout(() => {
        setShowingIntertitle(false);
      }, 2200);
      return () => clearTimeout(t);
    }
    setShowingIntertitle(false);
  }, [beatIndex, beat.intertitle]);

  // Beat progression: Cena 1 pauses for choice; Cena 4 holds until mission completes; others auto-advance
  useEffect(() => {
    if (paused || showingIntertitle || isGameplayBeat) return;

    if (isChoiceBeat) {
      if (choicePromptReady) return;
      const choiceTimer = window.setTimeout(() => {
        setChoicePromptReady(true);
      }, beat.durationSec * 1000);
      return () => clearTimeout(choiceTimer);
    }

    const timer = window.setTimeout(() => {
      if (isLastBeat) {
        onFinishCutscene();
      } else {
        setBeatIndex((prev) =>
          Math.min(SECOND_CUTSCENE_BEATS.length - 1, prev + 1)
        );
      }
    }, beat.durationSec * 1000);

    return () => clearTimeout(timer);
  }, [
    beatIndex,
    beat.durationSec,
    isChoiceBeat,
    isGameplayBeat,
    isLastBeat,
    choicePromptReady,
    paused,
    showingIntertitle,
    onFinishCutscene,
  ]);

  // Auto-fade top utility controls after 3.2s unless paused, in gameplay, or waiting for choice
  useEffect(() => {
    setControlsVisible(true);
    if (paused || choicePromptReady || isGameplayBeat || isLastBeat) return;
    const hideTimer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3200);
    return () => clearTimeout(hideTimer);
  }, [beatIndex, paused, choicePromptReady, isGameplayBeat, isLastBeat]);

  const handleChooseOpening = (choice: DialogueChoice) => {
    onSelectChoice(choice);
    setChoicePromptReady(false);
    setBeatIndex(1); // Cena 2 — "Vinde e vede."
  };

  const handleChooseWidow = (choice: DialogueChoice, helped: boolean) => {
    audioEngine.playClothRustle();
    onSelectChoice(choice);
    onUpdateConsequences({ helpedWidow: helped });
    setMissionState((prev) => ({
      ...prev,
      widowResolved: true,
      helpedWidow: helped,
    }));
  };

  const handleChooseWell = (
    choice: DialogueChoice,
    pace: 'careful' | 'hurried'
  ) => {
    audioEngine.playWaterPour();
    if (pace === 'hurried') {
      window.setTimeout(() => audioEngine.playWaterSplash(0.8), 350);
    }
    onSelectChoice(choice);
    onUpdateConsequences({ wellPace: pace });
    setMissionState((prev) => ({
      ...prev,
      wellResolved: true,
      wellPace: pace,
    }));
  };

  const handleWellMissionProgress = useCallback(
    (res: WellMissionResult) => {
      setTelemetry(res);
      if (res.nearDoorReturn && !returnedOnceRef.current) {
        returnedOnceRef.current = true;
        audioEngine.playSoftConfirm();
        window.setTimeout(() => {
          setBeatIndex(4); // Cena 5 — Jesus washes feet
        }, 700);
      }
    },
    []
  );

  const handleViewportTap = () => {
    if (showingIntertitle) {
      setShowingIntertitle(false);
      return;
    }
    if (isChoiceBeat && !choicePromptReady) {
      setChoicePromptReady(true);
      return;
    }
    setControlsVisible(true);
  };

  const handleNext = () => {
    if (isChoiceBeat) {
      setChoicePromptReady(true);
      return;
    }
    if (isGameplayBeat) {
      if (!missionState.wellResolved) {
        setMissionState((prev) => ({
          ...prev,
          wellResolved: true,
          wellPace: prev.wellPace ?? 'careful',
        }));
      }
      setBeatIndex(4);
      return;
    }
    if (isLastBeat) {
      onFinishCutscene();
      return;
    }
    setBeatIndex((prev) =>
      Math.min(SECOND_CUTSCENE_BEATS.length - 1, prev + 1)
    );
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
    syncCombinedInput();
  };

  const resetJoystick = () => {
    activePointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    joystickVecRef.current.forward = 0;
    joystickVecRef.current.right = 0;
    syncCombinedInput();
  };

  // Dynamic orienting hint during playable well mission
  const missionObjectiveText = !missionState.wellResolved
    ? !missionState.widowResolved && telemetry.distToWidow < 6.5
      ? 'Aproxime-se da viúva com o cântaro ou siga adiante para o poço'
      : `Caminhe pela estrada do vilarejo até o poço de pedra (${telemetry.distToWell.toFixed(0)} m)`
    : `Leve o cântaro cheio de volta à porta da casa (${telemetry.distToDoor.toFixed(0)} m)`;

  // Subtitle on Cena 5 shifts slightly with well pace note
  const activeSubtitle =
    beatIndex === 4 && missionState.wellPace === 'hurried'
      ? '“Quem caminha comigo aprende primeiro a inclinar-se pelos outros.”'
      : beat.subtitle;

  const showSubtitle =
    !showingIntertitle && !isGameplayBeat && Boolean(activeSubtitle);

  // Character voice synthesis for Cenas 1, 2, 3, 5, 6 (and brief narration at Widow encounter)
  useEffect(() => {
    if (paused || showingIntertitle || muted || !voiceEnabled) {
      voiceEngine.stop();
      return;
    }

    if (!isGameplayBeat && activeSubtitle) {
      const delayMs = beatIndex === 4 ? 1400 : 400;
      const t = window.setTimeout(() => {
        voiceEngine.speak(beat.speaker ?? 'narrator', activeSubtitle, {
          playerGender: character.gender,
        });
      }, delayMs);
      return () => {
        window.clearTimeout(t);
        voiceEngine.stop();
      };
    }

    if (isGameplayBeat && telemetry.nearWidow && !missionState.widowResolved) {
      voiceEngine.speak(
        'Viúva',
        'A mulher apoia o cântaro de barro na pedra, sem fôlego para seguir sozinha.',
        { playerGender: character.gender }
      );
      return () => voiceEngine.stop();
    }
  }, [
    beatIndex,
    beat.speaker,
    activeSubtitle,
    paused,
    showingIntertitle,
    isGameplayBeat,
    telemetry.nearWidow,
    missionState.widowResolved,
    muted,
    voiceEnabled,
    character.gender,
  ]);

  return (
    <div
      onMouseMove={() => setControlsVisible(true)}
      onClick={handleViewportTap}
      className="relative w-full h-[100dvh] overflow-hidden bg-[#100d0a] select-none"
    >
      {/* Full-Bleed 3D Cutscene II & Interactive Well Mission Viewport */}
      <div className="absolute inset-0 z-0">
        <LowPolyViewport
          mode="cutscene_second"
          character={character}
          cutsceneBeatIndex={beatIndex}
          cutsceneBeatDuration={beat.durationSec}
          cutsceneCameraMode={cameraMode}
          followInputRef={inputRef}
          wellMissionState={missionState}
          onWellMissionProgress={handleWellMissionProgress}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 54%, rgba(8,6,4,0.52) 100%)',
          }}
        />
      </div>

      {/* Whisper-thin 6-scene progress hairline */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-1 pointer-events-none">
        {SECOND_CUTSCENE_BEATS.map((b, idx) => (
          <div
            key={b.beatNumber}
            className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${
              idx <= beatIndex ? 'bg-[#eab668]/85' : 'bg-[#f5efe6]/20'
            }`}
          />
        ))}
      </div>

      {/* Discreet Top Bar */}
      <header
        className={`relative z-20 flex items-center justify-between gap-4 px-5 sm:px-8 pt-4 transition-opacity duration-500 ${
          controlsVisible ||
          paused ||
          choicePromptReady ||
          isGameplayBeat ||
          isLastBeat
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-w-0">
          <div
            className="text-xs sm:text-sm text-[#f5efe6]/95 font-medium truncate"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
          >
            {isGameplayBeat ? missionObjectiveText : beat.contextCue}
          </div>
          <div
            className="text-[11px] text-[#eab668]/90 tabular-nums"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
          >
            Cena {beat.beatNumber} de {SECOND_CUTSCENE_BEATS.length} ·{' '}
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
              onClick={() => {
                setChoicePromptReady(false);
                returnedOnceRef.current = false;
                setBeatIndex((prev) => Math.max(0, prev - 1));
              }}
              aria-label="Cena anterior"
              className="w-8 h-8 inline-flex items-center justify-center text-[#f5efe6]/80 hover:text-[#eab668] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {!choicePromptReady && !isGameplayBeat && (
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

          {!(isChoiceBeat && choicePromptReady) && (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f5efe6]/85 hover:text-[#eab668] transition-colors cursor-pointer"
            >
              <span>
                {isGameplayBeat
                  ? 'Levar água'
                  : isLastBeat
                    ? 'Concluir'
                    : 'Próxima'}
              </span>
              {isLastBeat ? (
                <ArrowRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {!isGameplayBeat && (
            <button
              type="button"
              onClick={cycleCameraMode}
              title="Mudar ângulo da câmera"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#eab668]/90 hover:text-[#f5efe6] transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{currentCamLabel}</span>
            </button>
          )}

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

      {/* Brief Chapter Intertitle Card (Cena 1) */}
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

      {/* Borderless, Boxless Discreet Subtitles */}
      {showSubtitle && (
        <div
          className={`pointer-events-none absolute bottom-5 sm:bottom-7 z-10 transition-all duration-500 ${
            isChoiceBeat || isLastBeat
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
            {beat.speaker && beat.speaker !== beat.scriptureRef && (
              <span className="text-[#eab668] font-medium mr-1.5">
                {beat.speaker}:
              </span>
            )}
            <span>{activeSubtitle}</span>
            {beat.scriptureRef && (
              <span className="ml-2 text-[11px] text-[#cfc3b0]/75">
                ({beat.scriptureRef})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Cena 1 Choice Bubble (Compact Subtle Border in Lower-Right Corner) */}
      {!showingIntertitle && isChoiceBeat && choicePromptReady && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-20 w-[min(330px,86vw)] rounded-md border border-[#eab668]/35 bg-[#14110d]/86 p-3 sm:p-3.5 shadow-2xl"
        >
          <div className="text-[11px] text-[#eab668]/95 mb-2">
            Sua resposta a Jesus
          </div>
          <div className="flex flex-col gap-1.5">
            {SECOND_CUTSCENE_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChooseOpening(choice)}
                className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/14 hover:border-[#eab668]/65 hover:bg-[#d99b43]/15 text-xs text-[#f5efe6] transition-colors cursor-pointer"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cena 4 Playable Controls: Discreet Lower-Left Analog Stick */}
      {!showingIntertitle && isGameplayBeat && !modalBubbleOpen && (
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
            className="relative w-24 h-24 rounded-full border border-[#eab668]/35 bg-[#14110d]/60 touch-none flex items-center justify-center cursor-grab active:cursor-grabbing"
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
            <span className="text-[#eab668] font-medium">Setas</span>
          </div>
        </div>
      )}

      {/* Cena 4 Proximity Choice: Widow with Heavy Jar */}
      {!showingIntertitle &&
        isGameplayBeat &&
        telemetry.nearWidow &&
        !missionState.widowResolved && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-20 w-[min(340px,86vw)] rounded-md border border-[#eab668]/35 bg-[#14110d]/88 p-3.5 shadow-2xl"
          >
            <div className="text-[11px] text-[#eab668] mb-1">
              No caminho · Viúva com cântaro pesado
            </div>
            <p className="text-xs text-[#e8dec8]/90 mb-2.5 leading-relaxed">
              A mulher apoia o cântaro de barro na pedra, sem fôlego para seguir sozinha.
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleChooseWidow(WIDOW_CHOICES[0], true)}
                className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/15 hover:border-[#eab668]/70 hover:bg-[#d99b43]/15 text-xs text-[#f5efe6] transition-colors cursor-pointer"
              >
                {WIDOW_CHOICES[0].text}
              </button>
              <button
                type="button"
                onClick={() => handleChooseWidow(WIDOW_CHOICES[1], false)}
                className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/15 hover:border-[#eab668]/70 hover:bg-[#d99b43]/15 text-xs text-[#cfc3b0] transition-colors cursor-pointer"
              >
                {WIDOW_CHOICES[1].text}
              </button>
            </div>
          </div>
        )}

      {/* Cena 4 Proximity Choice: At the Village Well */}
      {!showingIntertitle &&
        isGameplayBeat &&
        telemetry.nearWell &&
        !missionState.wellResolved && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 right-5 sm:bottom-7 sm:right-8 z-20 w-[min(340px,86vw)] rounded-md border border-[#eab668]/35 bg-[#14110d]/88 p-3.5 shadow-2xl"
          >
            <div className="text-[11px] text-[#eab668] mb-1">
              Poço do vilarejo
            </div>
            <p className="text-xs text-[#e8dec8]/90 mb-2.5 leading-relaxed">
              A água fresca repousa no fundo de pedra. Como encher o cântaro?
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleChooseWell(WELL_CHOICES[0], 'careful')}
                className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/15 hover:border-[#eab668]/70 hover:bg-[#d99b43]/15 text-xs text-[#f5efe6] transition-colors cursor-pointer"
              >
                {WELL_CHOICES[0].text}
              </button>
              <button
                type="button"
                onClick={() => handleChooseWell(WELL_CHOICES[1], 'hurried')}
                className="w-full text-left px-3 py-2 rounded border border-[#e8dec8]/15 hover:border-[#eab668]/70 hover:bg-[#d99b43]/15 text-xs text-[#cfc3b0] transition-colors cursor-pointer"
              >
                {WELL_CHOICES[1].text}
              </button>
            </div>
          </div>
        )}
    </div>
  );
};
