import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Heart,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { evaluateFaithMilestones } from '../data/faithMilestones';
import {
  MOTIVATION_META,
  STORY_NODES,
  getDominantMotivation,
} from '../data/storyScript';
import { DialogueChoice, SaveState, SpeakerRole } from '../types/game';
import { audioEngine } from '../utils/audio';
import { voiceEngine } from '../utils/voice';
import { CodexTabKey } from './ActsCodexModal';
import { LowPolyViewport } from './LowPolyViewport';

interface NarrativeStageProps {
  saveState: SaveState;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onAdvanceNode: (nextNodeId: string) => void;
  onMakeChoice: (choice: DialogueChoice) => void;
  onReturnToTitle: () => void;
  onRestartJourney: () => void;
  onStartThirdCutscene?: () => void;
  onOpenCodex: (tab: CodexTabKey) => void;
}

interface MomentCardInfo {
  kicker: string;
  title: string;
  subtitle: string;
}

const MOMENT_TRANSITIONS: Record<string, MomentCardInfo> = {
  a1_f1_jordao_3: {
    kicker: 'A Décima Hora · João 1:38–39',
    title: '“Permaneceram com Ele aquele dia.”',
    subtitle:
      'Sentado à mesa simples sob a última luz da tarde, começa em silêncio o primeiro dia ao lado de Jesus.',
  },
  a1_f2_figueira_fim: {
    kicker: 'Rumo à Galileia · João 1:43–51',
    title: '“Vereis o céu aberto.”',
    subtitle:
      'Filipe e Natanael agora caminham convosco sob a promessa maior do Filho do Homem.',
  },
};

function getSpeakerBadge(
  speaker: SpeakerRole,
  speakerLabel: string | undefined,
  playerName: string
): string {
  if (speaker === 'narrator') return 'Narrativa';
  if (speaker === 'player') return playerName;
  return speakerLabel || 'Discípulo';
}

export const NarrativeStage: React.FC<NarrativeStageProps> = ({
  saveState,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onAdvanceNode,
  onMakeChoice,
  onReturnToTitle,
  onRestartJourney,
  onStartThirdCutscene,
  onOpenCodex,
}) => {
  const [paused, setPaused] = useState(false);
  const [momentCard, setMomentCard] = useState<MomentCardInfo | null>(() => {
    return MOMENT_TRANSITIONS[saveState.currentNodeId] ?? null;
  });
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() =>
    voiceEngine.isEnabled()
  );
  const lastSeenNodeRef = useRef<string>(saveState.currentNodeId);

  useEffect(() => {
    return voiceEngine.subscribe(setVoiceEnabled);
  }, []);

  const node =
    STORY_NODES[saveState.currentNodeId] ?? STORY_NODES.a1_f1_jordao_3;

  // Match environmental soundscape dynamically to the active 3D backdrop
  useEffect(() => {
    if (node.backdrop === 'first_day_dwelling') {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.0,
        windLevel: 0.08,
        fireLevel: 0.44,
        cricketLevel: 0.56,
        wavesLevel: 0.0,
      });
    } else if (
      node.backdrop === 'dawn_shore' ||
      node.backdrop === 'galilee_waters'
    ) {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.0,
        crowdLevel: 0.0,
        birdsLevel: 0.4,
        windLevel: 0.28,
        fireLevel: 0.0,
        cricketLevel: 0.0,
        wavesLevel: 0.5,
      });
    } else {
      audioEngine.setJordanAmbience(true, {
        waterLevel: 0.48,
        crowdLevel: 0.0,
        birdsLevel: 0.44,
        windLevel: 0.22,
        fireLevel: 0.0,
        cricketLevel: 0.0,
        wavesLevel: 0.0,
      });
    }
  }, [node.backdrop]);

  useEffect(() => {
    return () => {
      audioEngine.setJordanAmbience(false);
      voiceEngine.stop();
    };
  }, []);

  // Speak active narrative node lines automatically in the character's voice
  useEffect(() => {
    if (paused || Boolean(momentCard) || muted || !voiceEnabled) {
      voiceEngine.stop();
      return;
    }

    const spokenText = node.paragraphs.join(' ');
    const t = window.setTimeout(() => {
      voiceEngine.speak(node.speaker, spokenText, {
        playerGender: saveState.character.gender,
      });
    }, 350);

    return () => {
      window.clearTimeout(t);
      voiceEngine.stop();
    };
  }, [
    node.id,
    node.speaker,
    node.paragraphs,
    paused,
    momentCard,
    muted,
    voiceEnabled,
    saveState.character.gender,
  ]);

  // Trigger a clear transition card whenever entering a new major phase/moment
  useEffect(() => {
    if (lastSeenNodeRef.current !== saveState.currentNodeId) {
      lastSeenNodeRef.current = saveState.currentNodeId;
      const transition = MOMENT_TRANSITIONS[saveState.currentNodeId];
      if (transition) {
        setMomentCard(transition);
      }
    }
  }, [saveState.currentNodeId]);

  const dominantMotivation = getDominantMotivation(saveState.motivations);
  const dynamicCallback = node.dynamicCallbacks?.find(
    (cb) => cb.dominantMotivation === dominantMotivation
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPaused((prev) => !prev);
        return;
      }
      if (momentCard && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setMomentCard(null);
        return;
      }
      if (
        !paused &&
        !momentCard &&
        !node.choices?.length &&
        node.nextNodeId &&
        (e.key === 'Enter' || e.key === ' ')
      ) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'button' && activeTag !== 'a') {
          e.preventDefault();
          onAdvanceNode(node.nextNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paused, momentCard, node, onAdvanceNode]);

  const speakerDisplay = getSpeakerBadge(
    node.speaker,
    node.speakerLabel,
    saveState.character.name
  );

  const hasChoices = Boolean(node.choices && node.choices.length > 0);
  const unlockedMilestones = evaluateFaithMilestones(
    saveState.motivations,
    saveState.history
  ).filter((m) => m.unlocked).length;

  return (
    <div className="relative h-[100dvh] w-full bg-[#12100d] text-[#f5efe6] flex flex-col justify-between overflow-hidden">
      {/* Live 3D Low-Poly World Stage */}
      <div className="absolute inset-0 z-0">
        <LowPolyViewport
          mode="narrative"
          backdrop={node.backdrop}
          character={saveState.character}
          speaker={node.speaker}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(16,13,10,0.58) 0%, rgba(16,13,10,0.08) 34%, rgba(16,13,10,0.45) 68%, rgba(16,13,10,0.92) 100%)',
          }}
        />
      </div>

      {/* Compact Horizontal Top HUD */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 sm:px-8 py-3 pointer-events-none">
        <div className="min-w-0 pointer-events-auto">
          <div className="text-xs text-[#eab668] font-medium truncate">
            {node.actTitle} · {node.scriptureRef}
          </div>
          <div
            className="text-sm sm:text-base font-semibold text-[#f5efe6] truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {node.phaseTitle}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={() => onOpenCodex('marcos')}
            title="Abrir Marcos de Fé no Codex"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#eab668]/40 bg-[#16130f]/85 text-xs font-medium text-[#eab668] hover:border-[#eab668] transition-colors cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marcos</span>
            <span className="tabular-nums text-[11px]">({unlockedMilestones})</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCodex('diario')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#e8dec8]/20 bg-[#16130f]/85 text-xs font-medium text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Coração</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCodex('cutscene')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#e8dec8]/20 bg-[#16130f]/85 text-xs font-medium text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cutscene</span>
          </button>

          <button
            type="button"
            onClick={() => voiceEngine.toggleEnabled()}
            title={voiceEnabled ? 'Desativar voz dos personagens' : 'Ativar voz dos personagens'}
            aria-label={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              voiceEnabled
                ? 'border-[#eab668]/45 bg-[#16130f]/85 text-[#eab668] hover:border-[#eab668]'
                : 'border-[#e8dec8]/20 bg-[#16130f]/85 text-[#e8dec8]/55 hover:text-[#e8dec8]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voz</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-[#e8dec8]/20 bg-[#16130f]/85 text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer"
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
            className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-[#e8dec8]/20 bg-[#16130f]/85 text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setPaused(true)}
            aria-label="Pausar jogo"
            className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-[#e8dec8]/20 bg-[#16130f]/85 text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Horizontal Widescreen Narrative Dock */}
      <main className="relative z-10 px-4 sm:px-8 pb-4 sm:pb-6 max-w-6xl w-full mx-auto pointer-events-none">
        <div className="pointer-events-auto bg-[#171410]/94 border border-[#e8dec8]/18 rounded-lg p-4 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-[#e8dec8]/10">
            <span
              className={`text-sm sm:text-base font-semibold tracking-wide ${
                node.speaker === 'jesus' ? 'text-[#eab668]' : 'text-[#f5efe6]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {speakerDisplay}
            </span>
            <span className="text-xs text-[#cfc3b0]/75 truncate">
              {saveState.character.name} ·{' '}
              {MOTIVATION_META[dominantMotivation].label}
            </span>
          </div>

          <div
            className={
              hasChoices
                ? 'grid grid-cols-1 md:grid-cols-12 gap-5 items-start'
                : 'flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5'
            }
          >
            <div
              className={`flex flex-col gap-2.5 text-xs sm:text-sm md:text-[15px] leading-relaxed text-[#f5efe6]/95 max-h-[26dvh] overflow-y-auto pr-1 ${
                hasChoices ? 'md:col-span-6' : 'flex-1'
              }`}
            >
              {node.paragraphs.map((p, index) => (
                <p key={index}>{p}</p>
              ))}

              {node.isJourneyEnd && saveState.secondCutsceneConsequences && (
                <p className="text-[#e8dec8]/90 italic">
                  {saveState.secondCutsceneConsequences.helpedWidow === true
                    ? 'Na quietude da sala, o olhar agradecido da viúva na estrada volta como paz silenciosa.'
                    : saveState.secondCutsceneConsequences.helpedWidow === false
                      ? 'Mesmo diante da mansidão de Jesus, a lembrança da viúva curvada na estrada ecoa devagar no silêncio.'
                      : null}{' '}
                  {saveState.secondCutsceneConsequences.wellPace === 'careful'
                    ? 'A água colhida com calma repousou inteira na bacia.'
                    : saveState.secondCutsceneConsequences.wellPace === 'hurried'
                      ? 'Até os respingos da sua pressa no poço foram recebidos sem repreensão por quem lavou os seus pés.'
                      : null}
                </p>
              )}

              {dynamicCallback && (
                <p className="text-[#eab668] italic pt-0.5">
                  {dynamicCallback.text}
                </p>
              )}
            </div>

            {hasChoices && node.choices ? (
              <div className="md:col-span-6 flex flex-col gap-2 max-h-[26dvh] overflow-y-auto">
                {node.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onMakeChoice(choice)}
                    className="w-full text-left px-3.5 py-2.5 rounded-md border border-[#e8dec8]/20 bg-[#12100d] hover:bg-[#d99b43]/15 hover:border-[#eab668] active:scale-[0.995] text-xs sm:text-sm text-[#f5efe6] transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <span className="leading-snug">{choice.text}</span>
                    <ArrowRight className="w-4 h-4 text-[#eab668] opacity-70 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            ) : node.isJourneyEnd ? (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenCodex('diario')}
                  className="px-4 py-2.5 rounded-md border border-[#e8dec8]/25 text-xs sm:text-sm font-medium text-[#f5efe6] hover:border-[#eab668] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Caminho do Coração
                </button>
                {node.id === 'a1_f1_jordao_3' && onStartThirdCutscene && (
                  <button
                    type="button"
                    onClick={onStartThirdCutscene}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Dia Seguinte · Galileia</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRestartJourney}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    node.id === 'a1_f1_jordao_3' && onStartThirdCutscene
                      ? 'border border-[#e8dec8]/25 text-[#f5efe6] hover:border-[#eab668]'
                      : 'bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b]'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Recomeçar do Jordão</span>
                </button>
              </div>
            ) : (
              node.nextNodeId && (
                <button
                  type="button"
                  onClick={() => onAdvanceNode(node.nextNodeId!)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] active:scale-[0.99] text-[#14100b] font-semibold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>
                    {node.isActEnd ? 'Próximo Ato' : 'Continuar'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>
      </main>

      {/* Clear Moment / Chapter Transition Overlay */}
      {momentCard && (
        <div
          className="fixed inset-0 z-30 bg-[#0d0b09]/92 flex flex-col items-center justify-center text-center px-6"
          role="dialog"
          aria-modal="true"
          aria-label={momentCard.title}
        >
          <div className="max-w-lg">
            <div className="text-xs tracking-[0.18em] uppercase text-[#eab668] mb-2.5">
              {momentCard.kicker}
            </div>
            <h2
              className="text-2xl sm:text-4xl font-semibold text-[#f5efe6] mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {momentCard.title}
            </h2>
            <p className="text-sm sm:text-base text-[#cfc3b0]/90 leading-relaxed mb-7">
              {momentCard.subtitle}
            </p>
            <button
              type="button"
              onClick={() => setMomentCard(null)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] font-semibold text-sm transition-colors cursor-pointer"
            >
              <span>Entrar neste Momento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {paused && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de Pausa"
        >
          <div className="w-full max-w-sm bg-[#171410] border border-[#e8dec8]/18 rounded-lg p-6 shadow-2xl">
            <h2
              className="text-xl font-semibold text-[#f5efe6] mb-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Jornada Pausada
            </h2>
            <p className="text-xs text-[#cfc3b0]/80 mb-5">
              {saveState.character.name} · {node.actTitle}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="w-full px-4 py-3 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] font-semibold text-sm cursor-pointer transition-colors"
              >
                Retomar História
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  onOpenCodex('cutscene2');
                }}
                className="w-full px-4 py-3 rounded-md border border-[#e8dec8]/20 bg-[#12100d] hover:border-[#eab668] text-[#f5efe6] text-sm font-medium cursor-pointer transition-colors"
              >
                Roteiro das Cutscenes
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  onOpenCodex('marcos');
                }}
                className="w-full px-4 py-3 rounded-md border border-[#eab668]/35 bg-[#12100d] hover:border-[#eab668] text-[#eab668] text-sm font-medium cursor-pointer transition-colors"
              >
                Marcos de Fé ({unlockedMilestones})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  onOpenCodex('diario');
                }}
                className="w-full px-4 py-3 rounded-md border border-[#e8dec8]/20 bg-[#12100d] hover:border-[#eab668] text-[#f5efe6] text-sm font-medium cursor-pointer transition-colors"
              >
                Motivações do Coração
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  onReturnToTitle();
                }}
                className="w-full px-4 py-3 rounded-md border border-[#e8dec8]/15 text-[#cfc3b0] hover:text-[#f5efe6] text-sm cursor-pointer transition-colors"
              >
                Voltar à Tela Inicial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
