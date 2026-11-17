import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Compass,
  Crown,
  Droplets,
  Film,
  Flame,
  Heart,
  Home,
  Lightbulb,
  Lock,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import {
  evaluateFaithMilestones,
  MilestoneIconKey,
} from '../data/faithMilestones';
import {
  INTERFACE_DIRECTION_NOTE,
  OPENING_CUTSCENE_BEATS,
} from '../data/openingCutscene';
import {
  SECOND_CUTSCENE_BEATS,
  SECOND_CUTSCENE_INTERFACE_NOTE,
} from '../data/secondCutscene';
import {
  THIRD_CUTSCENE_BEATS,
  THIRD_CUTSCENE_INTERFACE_NOTE,
} from '../data/thirdCutscene';
import { MOTIVATION_META } from '../data/storyScript';
import {
  JournalEntry,
  MotivationKey,
  MotivationProfile,
} from '../types/game';

export type CodexTabKey =
  | 'marcos'
  | 'diario'
  | 'cutscene'
  | 'cutscene2'
  | 'cutscene3';

interface ActsCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CodexTabKey;
  motivations?: MotivationProfile;
  history?: JournalEntry[];
  onWatchOpeningCutscene?: () => void;
  onWatchSecondCutscene?: () => void;
  onWatchThirdCutscene?: () => void;
}

const EMPTY_MOTIVATIONS: MotivationProfile = {
  verdade: 0,
  compaixao: 0,
  temor: 0,
  pertenca: 0,
};

function MilestoneIcon({
  iconKey,
  className,
}: {
  iconKey: MilestoneIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case 'lamp':
      return <Lightbulb className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'water':
      return <Droplets className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'book':
      return <BookOpen className={className} />;
  }
}

export const ActsCodexModal: React.FC<ActsCodexModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cutscene',
  motivations,
  history = [],
  onWatchOpeningCutscene,
  onWatchSecondCutscene,
  onWatchThirdCutscene,
}) => {
  const [activeTab, setActiveTab] = useState<CodexTabKey>(initialTab);
  const [motivationFilter, setMotivationFilter] = useState<
    'todas' | MotivationKey
  >('todas');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const activeMotivations = motivations ?? EMPTY_MOTIVATIONS;
  const evaluatedMilestones = evaluateFaithMilestones(
    activeMotivations,
    history
  );
  const unlockedCount = evaluatedMilestones.filter((m) => m.unlocked).length;
  const filteredMilestones =
    motivationFilter === 'todas'
      ? evaluatedMilestones
      : evaluatedMilestones.filter(
          (m) => m.milestone.motivation === motivationFilter
        );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Codex — Marcos de Fé, Coração e Cutscenes"
    >
      <div className="w-full max-w-4xl max-h-[88dvh] bg-[#171410] border border-[#e8dec8]/18 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 border-b border-[#e8dec8]/12 bg-[#13110d]">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('marcos')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'marcos'
                  ? 'bg-[#d99b43] text-[#14100b] font-semibold'
                  : 'text-[#cfc3b0] hover:text-[#f5efe6]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Marcos de Fé</span>
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                  activeTab === 'marcos'
                    ? 'bg-[#14100b]/20 text-[#14100b]'
                    : 'bg-[#e8dec8]/10 text-[#eab668]'
                }`}
              >
                {unlockedCount}/{evaluatedMilestones.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diario')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'diario'
                  ? 'bg-[#d99b43] text-[#14100b] font-semibold'
                  : 'text-[#cfc3b0] hover:text-[#f5efe6]'
              }`}
            >
              Motivações do Coração
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cutscene')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'cutscene'
                  ? 'bg-[#d99b43] text-[#14100b] font-semibold'
                  : 'text-[#cfc3b0] hover:text-[#f5efe6]'
              }`}
            >
              Cutscene I · Jordão
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cutscene2')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'cutscene2'
                  ? 'bg-[#d99b43] text-[#14100b] font-semibold'
                  : 'text-[#cfc3b0] hover:text-[#f5efe6]'
              }`}
            >
              Cutscene II · A Décima Hora
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cutscene3')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'cutscene3'
                  ? 'bg-[#d99b43] text-[#14100b] font-semibold'
                  : 'text-[#cfc3b0] hover:text-[#f5efe6]'
              }`}
            >
              Cutscene III · Figueira
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[#cfc3b0] hover:text-[#f5efe6] hover:bg-[#e8dec8]/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {activeTab === 'marcos' ? (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-5 pb-4 border-b border-[#e8dec8]/12">
                <div>
                  <div className="text-xs text-[#eab668] tracking-wide mb-1">
                    Codex de Jornada · Insígnias Desbloqueáveis
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-semibold text-[#f5efe6]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Marcos de Fé
                  </h2>
                  <p className="text-xs sm:text-sm text-[#cfc3b0] mt-1 max-w-2xl">
                    Pequenas insígnias gravadas no Codex à medida que suas respostas diante de Jesus revelam Verdade, Compaixão, Temor ou Pertença.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg sm:text-xl font-semibold text-[#eab668] tabular-nums">
                    {unlockedCount} / {evaluatedMilestones.length}
                  </div>
                  <div className="text-[11px] text-[#cfc3b0]/75">
                    Insígnias desbloqueadas
                  </div>
                </div>
              </div>

              {/* Motivation filter bar */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {(
                  [
                    { id: 'todas', label: 'Todas' },
                    { id: 'verdade', label: 'Verdade' },
                    { id: 'compaixao', label: 'Compaixão' },
                    { id: 'temor', label: 'Temor' },
                    { id: 'pertenca', label: 'Pertença' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMotivationFilter(f.id)}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors cursor-pointer ${
                      motivationFilter === f.id
                        ? 'border-[#eab668] bg-[#d99b43]/20 text-[#eab668]'
                        : 'border-[#e8dec8]/15 bg-[#12100d] text-[#cfc3b0] hover:text-[#f5efe6]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Insignia Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredMilestones.map(({ milestone, unlocked, current, target }) => {
                  const pct = Math.min(100, Math.round((current / target) * 100));
                  return (
                    <article
                      key={milestone.id}
                      className={`p-4 rounded-md border transition-colors flex items-start gap-3.5 ${
                        unlocked
                          ? 'bg-[#19150f] border-[#eab668]/45 shadow-lg shadow-black/25'
                          : 'bg-[#12100d]/90 border-[#e8dec8]/10 opacity-75'
                      }`}
                    >
                      {/* Miniature Medallion Insignia */}
                      <div
                        className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          unlocked
                            ? milestone.tier === 'plenitude'
                              ? 'border-[#ffe29a] bg-gradient-to-br from-[#d99b43]/35 to-[#6d4816]/40 text-[#ffe29a]'
                              : milestone.tier === 'ouro'
                                ? 'border-[#eab668] bg-[#d99b43]/22 text-[#eab668]'
                                : 'border-[#c48d48]/80 bg-[#d99b43]/15 text-[#eab668]'
                            : 'border-[#e8dec8]/15 bg-[#171410] text-[#cfc3b0]/40'
                        }`}
                      >
                        <MilestoneIcon
                          iconKey={milestone.iconKey}
                          className="w-5 h-5"
                        />
                        {!unlocked && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#171410] border border-[#e8dec8]/20 flex items-center justify-center">
                            <Lock className="w-2.5 h-2.5 text-[#cfc3b0]/65" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span
                            className={`text-[11px] font-medium ${
                              unlocked ? 'text-[#eab668]' : 'text-[#cfc3b0]/60'
                            }`}
                          >
                            {milestone.badgeLabel} · {milestone.scriptureHint}
                          </span>
                          <span className="text-[11px] text-[#cfc3b0]/75 tabular-nums shrink-0">
                            {unlocked ? 'Desbloqueado' : `${current}/${target}`}
                          </span>
                        </div>

                        <h3
                          className={`text-sm sm:text-base font-semibold truncate ${
                            unlocked ? 'text-[#f5efe6]' : 'text-[#cfc3b0]/80'
                          }`}
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {milestone.title}
                        </h3>

                        <p className="text-xs text-[#cfc3b0]/85 leading-relaxed mt-1">
                          {milestone.subtitle}
                        </p>

                        <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#e8dec8]/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              unlocked ? 'bg-[#eab668]' : 'bg-[#cfc3b0]/35'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'cutscene' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-[#e8dec8]/12">
                <div>
                  <div className="text-xs text-[#eab668] tracking-wide mb-1">
                    Roteiro Cinematográfico · João 1:29–39 · Mateus 3:16–17
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-semibold text-[#f5efe6]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Cutscene de Abertura — Às Margens do Jordão
                  </h2>
                </div>

                {onWatchOpeningCutscene && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onWatchOpeningCutscene();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Film className="w-4 h-4" />
                    <span>Assistir Cutscene em 3D</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-5 mb-6">
                {OPENING_CUTSCENE_BEATS.map((beat) => (
                  <article
                    key={beat.beatNumber}
                    className="p-5 rounded-md bg-[#12100d] border border-[#e8dec8]/12"
                  >
                    <h3
                      className="text-base sm:text-lg font-semibold text-[#f5efe6] mb-3"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {beat.title}
                    </h3>

                    <div className="flex flex-col gap-2.5 text-xs sm:text-sm leading-relaxed">
                      <p className="text-[#e8dec8]/90">
                        <span className="text-[#eab668] font-semibold">
                          Descrição Visual:{' '}
                        </span>
                        {beat.visualDescription}
                      </p>
                      <p className="text-[#cfc3b0]">
                        <span className="text-[#eab668] font-semibold">
                          Câmera:{' '}
                        </span>
                        {beat.cameraDirection}
                      </p>
                      <p className="text-[#cfc3b0]">
                        <span className="text-[#eab668] font-semibold">
                          Som e Trilha:{' '}
                        </span>
                        {beat.audioDirection}
                      </p>
                      {beat.subtitle && (
                        <p className="text-[#f5efe6] pt-1">
                          <span className="text-[#eab668] font-semibold">
                            {beat.speaker} ({beat.scriptureRef}):{' '}
                          </span>
                          {beat.subtitle}
                        </p>
                      )}
                      <p className="text-[#cfc3b0]/80 pt-1 border-t border-[#e8dec8]/8">
                        <span className="text-[#eab668]/90 font-medium">
                          Interface na cena:{' '}
                        </span>
                        {beat.uiNote}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="p-5 rounded-md bg-[#12100d] border border-[#eab668]/25">
                <h4 className="text-sm font-semibold text-[#eab668] mb-1.5">
                  Nota de Direção de Interface (HUD e Legendas)
                </h4>
                <p className="text-xs sm:text-sm text-[#e8dec8]/90 leading-relaxed">
                  {INTERFACE_DIRECTION_NOTE}
                </p>
              </div>
            </div>
          ) : activeTab === 'cutscene2' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-[#e8dec8]/12">
                <div>
                  <div className="text-xs text-[#eab668] tracking-wide mb-1">
                    Roteiro Cinematográfico · João 1:38–39
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-semibold text-[#f5efe6]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Segunda Cutscene — A Décima Hora
                  </h2>
                </div>

                {onWatchSecondCutscene && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onWatchSecondCutscene();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Film className="w-4 h-4" />
                    <span>Assistir Cutscene II em 3D</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-5 mb-6">
                {SECOND_CUTSCENE_BEATS.map((beat) => (
                  <article
                    key={beat.beatNumber}
                    className="p-5 rounded-md bg-[#12100d] border border-[#e8dec8]/12"
                  >
                    <h3
                      className="text-base sm:text-lg font-semibold text-[#f5efe6] mb-3"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {beat.title}
                    </h3>

                    <div className="flex flex-col gap-2.5 text-xs sm:text-sm leading-relaxed">
                      <p className="text-[#e8dec8]/90">
                        <span className="text-[#eab668] font-semibold">
                          Descrição Visual:{' '}
                        </span>
                        {beat.visualDescription}
                      </p>
                      <p className="text-[#cfc3b0]">
                        <span className="text-[#eab668] font-semibold">
                          Câmera:{' '}
                        </span>
                        {beat.cameraDirection}
                      </p>
                      <p className="text-[#cfc3b0]">
                        <span className="text-[#eab668] font-semibold">
                          Som e Trilha:{' '}
                        </span>
                        {beat.audioDirection}
                      </p>
                      {beat.subtitle && (
                        <p className="text-[#f5efe6] pt-1">
                          <span className="text-[#eab668] font-semibold">
                            {beat.speaker} ({beat.scriptureRef}):{' '}
                          </span>
                          {beat.subtitle}
                        </p>
                      )}
                      {beat.atmosphereNote && (
                        <p className="text-[#cfc3b0]/75 italic text-xs">
                          Nota de fidelidade bíblica: {beat.atmosphereNote}
                        </p>
                      )}
                      {beat.gameplayEncounters &&
                        beat.gameplayEncounters.map((enc) => (
                          <div
                            key={enc.encounterTitle}
                            className="mt-1 p-3 rounded border border-[#eab668]/20 bg-[#171410]"
                          >
                            <div className="text-xs font-semibold text-[#eab668] mb-1.5">
                              {enc.encounterTitle}
                            </div>
                            <ul className="flex flex-col gap-1.5 text-xs text-[#e8dec8]/85">
                              {enc.options.map((opt) => (
                                <li key={opt.id}>
                                  <span className="font-semibold text-[#f5efe6]">
                                    • {opt.label}:{' '}
                                  </span>
                                  {opt.consequence}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      <p className="text-[#cfc3b0]/80 pt-1 border-t border-[#e8dec8]/8">
                        <span className="text-[#eab668]/90 font-medium">
                          Interface na cena:{' '}
                        </span>
                        {beat.uiNote}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="p-5 rounded-md bg-[#12100d] border border-[#eab668]/25">
                <h4 className="text-sm font-semibold text-[#eab668] mb-1.5">
                  Nota de Direção de Interface (HUD e Legendas)
                </h4>
                <p className="text-xs sm:text-sm text-[#e8dec8]/90 leading-relaxed">
                  {SECOND_CUTSCENE_INTERFACE_NOTE}
                </p>
              </div>
            </div>
          ) : activeTab === 'cutscene3' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-[#e8dec8]/12">
                <div>
                  <div className="text-xs text-[#eab668] tracking-wide mb-1">
                    Roteiro Cinematográfico · João 1:43–51
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-semibold text-[#f5efe6]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Terceira Cutscene — Sob a Figueira e o Céu Aberto
                  </h2>
                </div>

                {onWatchThirdCutscene && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onWatchThirdCutscene();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] text-[#14100b] text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Film className="w-4 h-4" />
                    <span>Assistir Cutscene III em 3D</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-5 mb-6">
                {THIRD_CUTSCENE_BEATS.map((beat) => (
                  <article
                    key={beat.beatNumber}
                    className="p-5 rounded-md bg-[#12100d] border border-[#e8dec8]/12"
                  >
                    <h3
                      className="text-base sm:text-lg font-semibold text-[#f5efe6] mb-3"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {beat.title}
                    </h3>

                    <div className="flex flex-col gap-2.5 text-xs sm:text-sm leading-relaxed">
                      <p className="text-[#e8dec8]/90">
                        <span className="text-[#eab668] font-semibold">
                          Descrição Visual:{' '}
                        </span>
                        {beat.visualDescription}
                      </p>
                      <p className="text-[#cfc3b0]">
                        <span className="text-[#eab668] font-semibold">
                          Câmera:{' '}
                        </span>
                        {beat.cameraDirection}
                      </p>
                      <p className="text-[#cfc3b0]">
                        <span className="text-[#eab668] font-semibold">
                          Som e Trilha:{' '}
                        </span>
                        {beat.audioDirection}
                      </p>
                      {beat.lines.length > 0 && (
                        <div className="flex flex-col gap-1 pt-1">
                          {beat.lines.map((line, i) => (
                            <p key={i} className="text-[#f5efe6]">
                              <span className="text-[#eab668] font-semibold">
                                {line.speaker} ({line.scriptureRef}):{' '}
                              </span>
                              {line.text}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-[#cfc3b0]/80 pt-1 border-t border-[#e8dec8]/8">
                        <span className="text-[#eab668]/90 font-medium">
                          Interface na cena:{' '}
                        </span>
                        {beat.uiNote}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="p-5 rounded-md bg-[#12100d] border border-[#eab668]/25">
                <h4 className="text-sm font-semibold text-[#eab668] mb-1.5">
                  Nota de Direção de Interface (HUD e Legendas)
                </h4>
                <p className="text-xs sm:text-sm text-[#e8dec8]/90 leading-relaxed">
                  {THIRD_CUTSCENE_INTERFACE_NOTE}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 pb-5 border-b border-[#e8dec8]/12">
                <h2
                  className="text-2xl font-semibold text-[#f5efe6] mb-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Caminho do Coração
                </h2>
                <p className="text-sm text-[#cfc3b0] leading-relaxed">
                  Não existem escolhas erradas diante da graça: cada resposta apenas revela por que você caminhou atrás de Jesus às margens do Jordão.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(
                  Object.keys(MOTIVATION_META) as Array<
                    keyof typeof MOTIVATION_META
                  >
                ).map((key) => {
                  const count = activeMotivations[key];
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-md bg-[#12100d] border border-[#e8dec8]/12"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[#f5efe6]">
                          {MOTIVATION_META[key].label}
                        </span>
                        <span className="text-sm font-semibold text-[#eab668] tabular-nums">
                          {count}
                        </span>
                      </div>
                      <p className="text-xs text-[#cfc3b0]/80 leading-relaxed">
                        {MOTIVATION_META[key].description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mb-7 p-4 rounded-md bg-[#12100d] border border-[#eab668]/25 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#eab668] shrink-0" />
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-[#f5efe6]">
                      Marcos de Fé Desbloqueados: {unlockedCount} de{' '}
                      {evaluatedMilestones.length}
                    </div>
                    <div className="text-xs text-[#cfc3b0]/80">
                      Cada decisão molda o perfil do coração e grava insígnias permanentes no Codex.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('marcos')}
                  className="px-3.5 py-1.5 rounded border border-[#eab668]/45 text-xs font-semibold text-[#eab668] hover:bg-[#d99b43]/15 transition-colors cursor-pointer"
                >
                  Ver Insígnias
                </button>
              </div>

              <h3 className="text-sm font-semibold text-[#f5efe6] mb-3">
                Passos Registrados
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-[#cfc3b0]/70">
                  Sua resposta diante de Jesus no Jordão aparecerá registrada aqui.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((entry, idx) => (
                    <div
                      key={`${entry.sceneId}-${idx}`}
                      className="p-4 rounded-md bg-[#12100d] border border-[#e8dec8]/10"
                    >
                      <div className="text-xs text-[#eab668] mb-1">
                        {entry.actTitle} · {entry.phaseTitle} ·{' '}
                        {MOTIVATION_META[entry.motivation].label}
                      </div>
                      <p className="text-sm text-[#f5efe6] mb-1.5">
                        {entry.choiceText}
                      </p>
                      <p className="text-xs text-[#cfc3b0]/80 italic">
                        {entry.reflection}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
