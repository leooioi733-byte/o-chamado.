import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Smartphone, X } from 'lucide-react';
import { ActsCodexModal, CodexTabKey } from './components/ActsCodexModal';
import { CharacterCreationScreen } from './components/CharacterCreationScreen';
import { FollowJesusStage } from './components/FollowJesusStage';
import { NarrativeStage } from './components/NarrativeStage';
import { OpeningCutsceneStage } from './components/OpeningCutsceneStage';
import { SecondCutsceneStage } from './components/SecondCutsceneStage';
import { ThirdCutsceneStage } from './components/ThirdCutsceneStage';
import { TitleScreen } from './components/TitleScreen';
import { DEFAULT_CHARACTER } from './data/characterOptions';
import {
  FaithMilestone,
  getNewlyUnlockedMilestones,
} from './data/faithMilestones';
import { STORY_NODES } from './data/storyScript';
import {
  CharacterConfig,
  DialogueChoice,
  SaveState,
  ScreenState,
  SecondCutsceneConsequences,
} from './types/game';
import { audioEngine } from './utils/audio';
import { useFullscreen } from './utils/fullscreen';
import { loadSaveState, saveGameState } from './utils/storage';
import { voiceEngine } from './utils/voice';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [saveState, setSaveState] = useState<SaveState | null>(() =>
    loadSaveState()
  );
  const [muted, setMuted] = useState<boolean>(false);
  const [codexOpen, setCodexOpen] = useState<boolean>(false);
  const [codexTab, setCodexTab] = useState<CodexTabKey>('marcos');
  const [unlockedToast, setUnlockedToast] = useState<FaithMilestone | null>(
    null
  );
  const toastTimerRef = useRef<number | null>(null);
  const [cutsceneStartBeat, setCutsceneStartBeat] = useState<number>(0);
  const [secondCutsceneStartBeat, setSecondCutsceneStartBeat] =
    useState<number>(0);
  const [thirdCutsceneStartBeat, setThirdCutsceneStartBeat] =
    useState<number>(0);
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);
  const [dismissedOrientationHint, setDismissedOrientationHint] =
    useState<boolean>(false);

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    const checkOrientation = () => {
      const narrowPortrait =
        window.innerWidth < 640 && window.innerHeight > window.innerWidth;
      setIsPortraitMobile(narrowPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = audioEngine.toggleMute();
    if (nextMuted) {
      voiceEngine.stop();
    }
    setMuted(nextMuted);
  }, []);

  useEffect(() => {
    return () => {
      voiceEngine.stop();
    };
  }, [screen]);

  const handleStartNewGame = useCallback(() => {
    audioEngine.startAmbient();
    audioEngine.playSoftConfirm();
    setScreen('CHARACTER_CREATION');
  }, []);

  const handleContinueGame = useCallback(() => {
    if (!saveState) return;
    audioEngine.startAmbient();
    audioEngine.playSoftConfirm();
    if (!STORY_NODES[saveState.currentNodeId]) {
      const normalized: SaveState = {
        ...saveState,
        currentNodeId: 'a1_f1_jordao_3',
        updatedAt: new Date().toISOString(),
      };
      saveGameState(normalized);
      setSaveState(normalized);
    }
    setScreen('PLAYING');
  }, [saveState]);

  const handleConfirmCharacter = useCallback((character: CharacterConfig) => {
    audioEngine.startAmbient();
    audioEngine.playSoftConfirm();

    const freshSave: SaveState = {
      character,
      currentNodeId: 'a1_f1_jordao_1',
      motivations: {
        verdade: 0,
        compaixao: 0,
        temor: 0,
        pertenca: 0,
      },
      history: [],
      completedNodeIds: [],
      updatedAt: new Date().toISOString(),
    };

    saveGameState(freshSave);
    setSaveState(freshSave);
    setCutsceneStartBeat(0);
    setScreen('OPENING_CUTSCENE');
  }, []);

  const handleAdvanceNode = useCallback((nextNodeId: string) => {
    audioEngine.playPluck(2);
    setSaveState((prev) => {
      if (!prev) return prev;
      const updated: SaveState = {
        ...prev,
        completedNodeIds: prev.completedNodeIds.includes(prev.currentNodeId)
          ? prev.completedNodeIds
          : [...prev.completedNodeIds, prev.currentNodeId],
        currentNodeId: nextNodeId,
        updatedAt: new Date().toISOString(),
      };
      saveGameState(updated);
      return updated;
    });
  }, []);

  const triggerMilestoneToast = useCallback((milestone: FaithMilestone) => {
    setUnlockedToast(milestone);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setUnlockedToast(null);
      toastTimerRef.current = null;
    }, 4500);
  }, []);

  const recordChoiceInSave = useCallback(
    (choice: DialogueChoice) => {
      audioEngine.playSoftConfirm();
      setSaveState((prev) => {
        if (!prev) return prev;
        const currentNode = STORY_NODES[prev.currentNodeId];
        const nextMotivations = {
          ...prev.motivations,
          [choice.motivation]: prev.motivations[choice.motivation] + 1,
        };
        const nextHistory = [
          ...prev.history,
          {
            sceneId: prev.currentNodeId,
            actTitle: currentNode?.actTitle ?? 'Ato I — O Chamado',
            phaseTitle: currentNode?.phaseTitle ?? 'Às Margens do Jordão',
            choiceText: choice.text,
            motivation: choice.motivation,
            reflection: choice.reflection,
          },
        ];

        const newlyUnlocked = getNewlyUnlockedMilestones(
          prev.motivations,
          prev.history,
          nextMotivations,
          nextHistory
        );
        if (newlyUnlocked.length > 0) {
          // Prefer the specific motivation badge first if multiple unlocked together
          const primary =
            newlyUnlocked.find((m) => Boolean(m.motivation)) ?? newlyUnlocked[0];
          triggerMilestoneToast(primary);
        }

        const updated: SaveState = {
          ...prev,
          currentNodeId: choice.nextNodeId,
          motivations: nextMotivations,
          history: nextHistory,
          completedNodeIds: prev.completedNodeIds.includes(prev.currentNodeId)
            ? prev.completedNodeIds
            : [...prev.completedNodeIds, prev.currentNodeId],
          updatedAt: new Date().toISOString(),
        };
        saveGameState(updated);
        return updated;
      });
    },
    [triggerMilestoneToast]
  );

  const handleMakeChoice = useCallback(
    (choice: DialogueChoice) => {
      recordChoiceInSave(choice);
      setScreen('PLAYING');
    },
    [recordChoiceInSave]
  );

  const handleChooseFromJordanCutscene = useCallback(
    (choice: DialogueChoice) => {
      recordChoiceInSave(choice);
      setSecondCutsceneStartBeat(1);
      setScreen('SECOND_CUTSCENE');
    },
    [recordChoiceInSave]
  );

  const handleUpdateSecondCutsceneConsequences = useCallback(
    (patch: Partial<SecondCutsceneConsequences>) => {
      setSaveState((prev) => {
        if (!prev) return prev;
        const updated: SaveState = {
          ...prev,
          secondCutsceneConsequences: {
            ...prev.secondCutsceneConsequences,
            ...patch,
          },
          updatedAt: new Date().toISOString(),
        };
        saveGameState(updated);
        return updated;
      });
    },
    []
  );

  const handleFinishSecondCutscene = useCallback(() => {
    audioEngine.playPluck(3);
    setSaveState((prev) => {
      if (!prev) return prev;
      const updated: SaveState = {
        ...prev,
        currentNodeId: 'a1_f1_jordao_3',
        updatedAt: new Date().toISOString(),
      };
      saveGameState(updated);
      return updated;
    });
    setScreen('PLAYING');
  }, []);

  const handleWatchOpeningCutscene = useCallback(() => {
    audioEngine.startAmbient();
    if (!saveState) {
      const quickSave: SaveState = {
        character: DEFAULT_CHARACTER,
        currentNodeId: 'a1_f1_jordao_1',
        motivations: { verdade: 0, compaixao: 0, temor: 0, pertenca: 0 },
        history: [],
        completedNodeIds: [],
        updatedAt: new Date().toISOString(),
      };
      saveGameState(quickSave);
      setSaveState(quickSave);
    }
    setCutsceneStartBeat(0);
    setScreen('OPENING_CUTSCENE');
  }, [saveState]);

  const handleWatchSecondCutscene = useCallback(() => {
    audioEngine.startAmbient();
    if (!saveState) {
      const quickSave: SaveState = {
        character: DEFAULT_CHARACTER,
        currentNodeId: 'a1_f1_jordao_1',
        motivations: { verdade: 0, compaixao: 0, temor: 0, pertenca: 0 },
        history: [],
        completedNodeIds: [],
        updatedAt: new Date().toISOString(),
      };
      saveGameState(quickSave);
      setSaveState(quickSave);
    }
    setSecondCutsceneStartBeat(0);
    setScreen('SECOND_CUTSCENE');
  }, [saveState]);

  const handleWatchThirdCutscene = useCallback(() => {
    audioEngine.startAmbient();
    if (!saveState) {
      const quickSave: SaveState = {
        character: DEFAULT_CHARACTER,
        currentNodeId: 'a1_f1_jordao_3',
        motivations: { verdade: 0, compaixao: 0, temor: 0, pertenca: 0 },
        history: [],
        completedNodeIds: [],
        updatedAt: new Date().toISOString(),
      };
      saveGameState(quickSave);
      setSaveState(quickSave);
    }
    setThirdCutsceneStartBeat(0);
    setScreen('THIRD_CUTSCENE');
  }, [saveState]);

  const handleFinishThirdCutscene = useCallback(() => {
    audioEngine.playPluck(4);
    setSaveState((prev) => {
      if (!prev) return prev;
      const updated: SaveState = {
        ...prev,
        currentNodeId: 'a1_f2_figueira_fim',
        updatedAt: new Date().toISOString(),
      };
      saveGameState(updated);
      return updated;
    });
    setScreen('PLAYING');
  }, []);

  const handleRestartJourney = useCallback(() => {
    audioEngine.playSoftConfirm();
    setSaveState((prev) => {
      if (!prev) return prev;
      const reset: SaveState = {
        ...prev,
        currentNodeId: 'a1_f1_jordao_1',
        motivations: {
          verdade: 0,
          compaixao: 0,
          temor: 0,
          pertenca: 0,
        },
        history: [],
        completedNodeIds: [],
        secondCutsceneConsequences: undefined,
        updatedAt: new Date().toISOString(),
      };
      saveGameState(reset);
      return reset;
    });
    setCutsceneStartBeat(0);
    setScreen('OPENING_CUTSCENE');
  }, []);

  const openCodex = useCallback((tab: CodexTabKey) => {
    setCodexTab(tab);
    setCodexOpen(true);
  }, []);

  return (
    <>
      {screen === 'TITLE' && (
        <TitleScreen
          existingSave={saveState}
          muted={muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
          onContinue={handleContinueGame}
          onNewGame={handleStartNewGame}
          onOpenCodex={(tab = 'cutscene') => openCodex(tab)}
        />
      )}

      {screen === 'CHARACTER_CREATION' && (
        <CharacterCreationScreen
          initialCharacter={saveState?.character}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onBack={() => setScreen('TITLE')}
          onConfirm={handleConfirmCharacter}
        />
      )}

      {screen === 'OPENING_CUTSCENE' && saveState && (
        <OpeningCutsceneStage
          character={saveState.character}
          initialBeatIndex={cutsceneStartBeat}
          muted={muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
          onSelectChoice={handleChooseFromJordanCutscene}
          onSkipToChoice={() => {
            // Skips directly to Beat 8 ("Que buscais?") handled internally by OpeningCutsceneStage
          }}
          onEnterFollowGameplay={() => {
            audioEngine.playPluck(3);
            setScreen('FOLLOW_JESUS');
          }}
        />
      )}

      {screen === 'FOLLOW_JESUS' && saveState && (
        <FollowJesusStage
          character={saveState.character}
          muted={muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
          onReachedJesus={() => {
            audioEngine.playSoftConfirm();
            setSecondCutsceneStartBeat(0);
            setScreen('SECOND_CUTSCENE');
          }}
        />
      )}

      {screen === 'SECOND_CUTSCENE' && saveState && (
        <SecondCutsceneStage
          character={saveState.character}
          initialBeatIndex={secondCutsceneStartBeat}
          muted={muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
          onSelectChoice={recordChoiceInSave}
          onUpdateConsequences={handleUpdateSecondCutsceneConsequences}
          onFinishCutscene={handleFinishSecondCutscene}
        />
      )}

      {screen === 'THIRD_CUTSCENE' && saveState && (
        <ThirdCutsceneStage
          character={saveState.character}
          initialBeatIndex={thirdCutsceneStartBeat}
          muted={muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
          onSelectChoice={recordChoiceInSave}
          onFinishCutscene={handleFinishThirdCutscene}
        />
      )}

      {screen === 'PLAYING' && saveState && (
        <NarrativeStage
          saveState={saveState}
          muted={muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
          onAdvanceNode={handleAdvanceNode}
          onMakeChoice={handleMakeChoice}
          onReturnToTitle={() => setScreen('TITLE')}
          onRestartJourney={handleRestartJourney}
          onStartThirdCutscene={handleWatchThirdCutscene}
          onOpenCodex={openCodex}
        />
      )}

      <ActsCodexModal
        isOpen={codexOpen}
        onClose={() => setCodexOpen(false)}
        initialTab={codexTab}
        motivations={saveState?.motivations}
        history={saveState?.history}
        onWatchOpeningCutscene={handleWatchOpeningCutscene}
        onWatchSecondCutscene={handleWatchSecondCutscene}
        onWatchThirdCutscene={handleWatchThirdCutscene}
      />

      {unlockedToast && !codexOpen && (
        <div
          role="status"
          className="fixed top-14 right-4 sm:right-6 z-40 max-w-xs rounded-md border border-[#eab668]/45 bg-[#171410]/95 px-3.5 py-2.5 shadow-2xl flex items-start gap-2.5"
        >
          <div className="w-8 h-8 rounded-full border border-[#eab668]/60 bg-[#d99b43]/20 flex items-center justify-center shrink-0 text-[#eab668]">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-wider uppercase text-[#eab668] font-medium">
              Marco de Fé Desbloqueado
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#f5efe6] truncate">
              {unlockedToast.title}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setUnlockedToast(null);
                  openCodex('marcos');
                }}
                className="text-[11px] font-semibold text-[#eab668] hover:text-[#f5efe6] transition-colors cursor-pointer"
              >
                Ver no Codex
              </button>
              <span className="text-[11px] text-[#cfc3b0]/70">
                {unlockedToast.badgeLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUnlockedToast(null)}
            aria-label="Dispensar aviso"
            className="text-[#cfc3b0]/70 hover:text-[#f5efe6] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isPortraitMobile && !dismissedOrientationHint && (
        <div className="fixed bottom-3 left-3 right-3 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-[#171410] border border-[#eab668]/50 text-xs text-[#f5efe6] shadow-xl">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-[#eab668] rotate-90 shrink-0" />
            <span>
              Este jogo foi criado para o modo horizontal. Gire a tela ou use o botão Tela cheia.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissedOrientationHint(true)}
            className="text-[#eab668] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Entendi
          </button>
        </div>
      )}
    </>
  );
}
