import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Footprints,
  Maximize2,
  Minimize2,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CharacterConfig } from '../types/game';
import { audioEngine } from '../utils/audio';
import { LowPolyViewport } from './LowPolyViewport';

interface FollowJesusStageProps {
  character: CharacterConfig;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onReachedJesus: () => void;
}

export const FollowJesusStage: React.FC<FollowJesusStageProps> = ({
  character,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onReachedJesus,
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [autoWalk, setAutoWalk] = useState(false);
  const [distance, setDistance] = useState<number>(4.5);
  const [reached, setReached] = useState(false);
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
  const reachedOnceRef = useRef(false);

  const syncCombinedInput = useCallback(() => {
    if (showIntro || reachedOnceRef.current) {
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
  }, [autoWalk, showIntro]);

  useEffect(() => {
    syncCombinedInput();
  }, [autoWalk, showIntro, syncCombinedInput]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
          k
        )
      ) {
        if (showIntro) {
          setShowIntro(false);
        }
        if (autoWalk) setAutoWalk(false);
        keysHeldRef.current.add(k);
        syncCombinedInput();
      }
      if (showIntro && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setShowIntro(false);
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
    };
  }, [autoWalk, showIntro, syncCombinedInput]);

  useEffect(() => {
    audioEngine.setJordanAmbience(true, {
      waterLevel: 0.6,
      crowdLevel: 0.0,
      birdsLevel: 0.8,
      windLevel: 0.28,
    });
    return () => {
      audioEngine.setJordanAmbience(false);
    };
  }, []);

  // Subtle dirt/grass footsteps while walking with Andrew
  useEffect(() => {
    if (showIntro || reached || muted) return;
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
  }, [showIntro, reached, muted]);

  const handleFollowProgress = useCallback(
    (dist: number, isReached: boolean) => {
      setDistance(dist);
      // Water gently swells slightly as player descends off the terrace toward the meadow bank
      const proximityWater = Math.min(0.74, Math.max(0.45, 0.72 - dist * 0.035));
      audioEngine.setJordanAmbience(true, {
        waterLevel: proximityWater,
        crowdLevel: 0.0,
        birdsLevel: isReached ? 0.35 : 0.78,
      });
      if (isReached && !reachedOnceRef.current) {
        reachedOnceRef.current = true;
        setReached(true);
        inputRef.current.forward = 0;
        inputRef.current.right = 0;
        audioEngine.playClothRustle();
        window.setTimeout(() => {
          onReachedJesus();
        }, 1250);
      }
    },
    [onReachedJesus]
  );

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

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#12100d] select-none">
      {/* Live Physical 3D Jordan Riverbank Gameplay */}
      <div className="absolute inset-0 z-0">
        <LowPolyViewport
          mode="follow_jesus"
          character={character}
          followInputRef={inputRef}
          onFollowProgress={handleFollowProgress}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 56%, rgba(10,8,6,0.48) 100%)',
          }}
        />
      </div>

      {/* Top Orienting Bar */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 sm:px-8 pt-4 pointer-events-none">
        <div className="min-w-0">
          <div
            className="text-xs sm:text-sm text-[#eab668] font-medium truncate"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
          >
            Momento Jogável · No Dia Seguinte (João 1:37)
          </div>
          <div
            className="text-xs text-[#f5efe6]/90 truncate"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
          >
            {reached
              ? 'Jesus interrompe o passo e se volta para vocês...'
              : `Caminhe em silêncio com André até alcançar Jesus (${distance.toFixed(1)} m)`}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={() => setAutoWalk((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
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
            onClick={onReachedJesus}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#e8dec8]/20 bg-[#14110d]/85 text-xs text-[#cfc3b0] hover:text-[#eab668] transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ir à cena</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-[#e8dec8]/20 bg-[#14110d]/85 text-[#f5efe6]/85 hover:text-[#eab668] transition-colors cursor-pointer"
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
            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-[#e8dec8]/20 bg-[#14110d]/85 text-[#f5efe6]/85 hover:text-[#eab668] transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Bottom-Left Virtual Analog Stick (Works with Touch & Mouse Drag) */}
      {!showIntro && !reached && (
        <div className="absolute bottom-5 left-5 sm:bottom-7 sm:left-8 z-20 flex items-end gap-4">
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
            className="relative w-28 h-28 rounded-full border border-[#eab668]/40 bg-[#14110d]/70 touch-none flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div className="w-10 h-10 rounded-full border border-[#e8dec8]/15 pointer-events-none" />
            <div
              className="absolute w-11 h-11 rounded-full bg-[#d99b43]/90 border border-[#f5efe6]/60 shadow-lg pointer-events-none"
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>

          <div
            className="hidden sm:block text-xs text-[#cfc3b0]/85 pb-2"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
          >
            Use <span className="text-[#eab668] font-semibold">W A S D</span> ou as{' '}
            <span className="text-[#eab668] font-semibold">Setas</span> para caminhar com André
          </div>
        </div>
      )}

      {/* Clear Intro Overlay separating Cutscene from Playable Moment */}
      {showIntro && (
        <div
          className="fixed inset-0 z-30 bg-[#0d0b09]/90 flex flex-col items-center justify-center text-center px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Siga Jesus com André"
        >
          <div className="max-w-lg">
            <div className="text-xs tracking-[0.18em] uppercase text-[#eab668] mb-2">
              Novo Momento · Gameplay no Vale
            </div>
            <h2
              className="text-2xl sm:text-4xl font-semibold text-[#f5efe6] mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Siga Jesus com André
            </h2>
            <p className="text-sm sm:text-base text-[#cfc3b0]/90 leading-relaxed mb-6">
              Após ouvir João apontar o Cordeiro de Deus, você e André deixam a margem para trás. Caminhe pelo vale ao lado de André até alcançar Jesus na clareira.
            </p>
            <button
              type="button"
              onClick={() => setShowIntro(false)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] font-semibold text-sm transition-colors cursor-pointer"
            >
              <span>Começar a Caminhar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
