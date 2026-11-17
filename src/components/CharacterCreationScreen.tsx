import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Maximize2,
  Minimize2,
  RotateCw,
} from 'lucide-react';
import {
  BEARD_STYLES,
  CLOAK_COLORS,
  DEFAULT_CHARACTER,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  SUGGESTED_NAMES,
  TUNIC_COLORS,
} from '../data/characterOptions';
import { CharacterConfig, GenderOption } from '../types/game';
import { LowPolyViewport } from './LowPolyViewport';

interface CharacterCreationScreenProps {
  initialCharacter?: CharacterConfig;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onBack: () => void;
  onConfirm: (character: CharacterConfig) => void;
}

type CreatorTab = 'identidade' | 'cabelo' | 'vestes';

export const CharacterCreationScreen: React.FC<
  CharacterCreationScreenProps
> = ({
  initialCharacter,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  onConfirm,
}) => {
  const [config, setConfig] = useState<CharacterConfig>(
    initialCharacter ?? DEFAULT_CHARACTER
  );
  const [activeTab, setActiveTab] = useState<CreatorTab>('identidade');

  const handleGenderChange = (gender: GenderOption) => {
    setConfig((prev) => ({
      ...prev,
      gender,
      beardStyle: gender === 'feminino' ? 'sem_barba' : prev.beardStyle,
      hairStyle:
        gender === 'feminino' && prev.hairStyle === 'curtissimo'
          ? 'trancado_veu'
          : prev.hairStyle,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = config.name.trim() || 'Discípulo';
    onConfirm({
      ...config,
      name: trimmed,
    });
  };

  const suggestions = SUGGESTED_NAMES[config.gender];

  return (
    <div className="h-[100dvh] w-full bg-[#13110e] text-[#f5efe6] flex flex-col overflow-hidden">
      {/* Compact Horizontal Top Bar */}
      <header className="flex items-center justify-between gap-4 px-5 sm:px-8 py-2.5 border-b border-[#e8dec8]/12 bg-[#16130f] shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#cfc3b0] hover:text-[#eab668] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 px-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <h1
          className="text-sm sm:text-base font-semibold tracking-[0.08em] text-[#f5efe6] truncate"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Criação do Discípulo · 3D Low Poly
        </h1>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#e8dec8]/20 bg-[#12100d] text-xs text-[#e8dec8] hover:border-[#eab668]/70 hover:text-[#eab668] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isFullscreen ? 'Sair' : 'Tela cheia'}
          </span>
        </button>
      </header>

      {/* Horizontal Split Workspace (side-by-side in landscape / desktop) */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden"
      >
        {/* Left: Live 3D Low-Poly Interactive Character Stage */}
        <div className="col-span-5 md:col-span-6 relative h-full min-h-0 bg-[#1a1712] border-r border-[#e8dec8]/12">
          <LowPolyViewport mode="creator" character={config} />

          {/* Clean floating bottom-center orbit hint (no backdrop-blur over WebGL) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none px-3.5 py-1.5 rounded-md bg-[#16130f]/90 border border-[#e8dec8]/15 text-xs text-[#e8dec8] flex items-center gap-2 whitespace-nowrap">
            <RotateCw className="w-3.5 h-3.5 text-[#eab668]" />
            <span>Arraste para girar 360°</span>
          </div>
        </div>

        {/* Right: Horizontal Customization Controls + Tabs */}
        <div className="col-span-7 md:col-span-6 flex flex-col h-full min-h-0 bg-[#171410]">
          {/* Horizontal Category Tabs */}
          <div className="flex items-center gap-2 px-5 sm:px-7 pt-4 pb-3 border-b border-[#e8dec8]/10 shrink-0 overflow-x-auto">
            {(
              [
                { id: 'identidade', label: 'Nome e Gênero' },
                { id: 'cabelo', label: 'Cabelo e Barba' },
                { id: 'vestes', label: 'Pele e Roupas' },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#d99b43] text-[#14100b] font-semibold'
                      : 'bg-[#12100d] text-[#cfc3b0] border border-[#e8dec8]/15 hover:border-[#eab668]/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 flex flex-col gap-5">
            {activeTab === 'identidade' && (
              <>
                <div>
                  <label
                    htmlFor="disciple-name"
                    className="block text-sm font-semibold text-[#f5efe6] mb-2"
                  >
                    Nome do Discípulo
                  </label>
                  <input
                    id="disciple-name"
                    type="text"
                    maxLength={28}
                    value={config.name}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Digite seu nome..."
                    className="w-full px-4 py-2.5 rounded-md bg-[#12100d] border border-[#e8dec8]/20 text-[#f5efe6] placeholder:text-[#cfc3b0]/40 focus:outline-none focus:border-[#eab668] text-sm sm:text-base"
                  />
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#cfc3b0]/75">
                    <span>Sugestões:</span>
                    {suggestions.map((suggested) => (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, name: suggested }))
                        }
                        className="text-[#eab668] hover:text-[#f5efe6] underline underline-offset-4 cursor-pointer py-0.5"
                      >
                        {suggested}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-[#e8dec8]/10" />

                <div>
                  <span className="block text-sm font-semibold text-[#f5efe6] mb-2.5">
                    Gênero
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { id: 'masculino', label: 'Homem' },
                        { id: 'feminino', label: 'Mulher' },
                      ] as const
                    ).map((opt) => {
                      const active = config.gender === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleGenderChange(opt.id)}
                          className={`px-4 py-3 rounded-md border text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${
                            active
                              ? 'bg-[#d99b43]/15 border-[#eab668] text-[#f5efe6]'
                              : 'bg-[#12100d] border-[#e8dec8]/15 text-[#cfc3b0] hover:border-[#e8dec8]/35'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-[#cfc3b0]/75 leading-relaxed pt-1">
                  O segundo discípulo mencionado em João 1:35–40 não recebe nome nas Escrituras porque representa você diante do chamado de Jesus.
                </p>
              </>
            )}

            {activeTab === 'cabelo' && (
              <>
                <div>
                  <span className="block text-sm font-semibold text-[#f5efe6] mb-2.5">
                    Estilo do Cabelo
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {HAIR_STYLES.map((style) => {
                      const active = config.hairStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              hairStyle: style.id,
                            }))
                          }
                          className={`px-3 py-2.5 rounded-md border text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[42px] text-left truncate ${
                            active
                              ? 'bg-[#d99b43]/15 border-[#eab668] text-[#f5efe6]'
                              : 'bg-[#12100d] border-[#e8dec8]/15 text-[#cfc3b0] hover:border-[#e8dec8]/35'
                          }`}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#f5efe6] mb-2.5">
                    Cor do Cabelo e Barba
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {HAIR_COLORS.map((hc) => {
                      const active = config.hairColor === hc.hex;
                      return (
                        <button
                          key={hc.id}
                          type="button"
                          title={hc.label}
                          aria-label={`Cor do cabelo: ${hc.label}`}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              hairColor: hc.hex,
                            }))
                          }
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform cursor-pointer border-2 ${
                            active
                              ? 'border-[#eab668] scale-110'
                              : 'border-[#e8dec8]/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: hc.hex }}
                        >
                          {active && (
                            <Check
                              className={`w-4 h-4 ${
                                hc.id === 'branco_anciao'
                                  ? 'text-[#14100b]'
                                  : 'text-[#f5efe6]'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm font-semibold text-[#f5efe6]">
                      Barba
                    </span>
                    {config.gender === 'feminino' && (
                      <span className="text-xs text-[#cfc3b0]/65">
                        Disponível para perfil masculino
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {BEARD_STYLES.map((beard) => {
                      const disabled = config.gender === 'feminino';
                      const active = !disabled && config.beardStyle === beard.id;
                      return (
                        <button
                          key={beard.id}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              beardStyle: beard.id,
                            }))
                          }
                          className={`px-3 py-2.5 rounded-md border text-xs sm:text-sm font-medium transition-colors min-h-[42px] truncate ${
                            disabled
                              ? 'bg-[#12100d]/50 border-[#e8dec8]/10 text-[#cfc3b0]/35 cursor-not-allowed'
                              : active
                                ? 'bg-[#d99b43]/15 border-[#eab668] text-[#f5efe6] cursor-pointer'
                                : 'bg-[#12100d] border-[#e8dec8]/15 text-[#cfc3b0] hover:border-[#e8dec8]/35 cursor-pointer'
                          }`}
                        >
                          {beard.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'vestes' && (
              <>
                <div>
                  <span className="block text-sm font-semibold text-[#f5efe6] mb-2.5">
                    Cor da Pele
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {SKIN_TONES.map((tone) => {
                      const active = config.skinTone === tone.hex;
                      return (
                        <button
                          key={tone.id}
                          type="button"
                          title={tone.label}
                          aria-label={`Cor da pele: ${tone.label}`}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              skinTone: tone.hex,
                            }))
                          }
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform cursor-pointer border-2 ${
                            active
                              ? 'border-[#eab668] scale-110'
                              : 'border-[#e8dec8]/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: tone.hex }}
                        >
                          {active && (
                            <Check className="w-4 h-4 text-[#14100b] drop-shadow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#f5efe6] mb-2.5">
                    Roupas · Túnica Interna
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {TUNIC_COLORS.map((tc) => {
                      const active = config.tunicColor === tc.hex;
                      return (
                        <button
                          key={tc.id}
                          type="button"
                          title={tc.label}
                          aria-label={`Túnica: ${tc.label}`}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              tunicColor: tc.hex,
                            }))
                          }
                          className={`w-10 h-10 rounded-md flex items-center justify-center transition-transform cursor-pointer border-2 ${
                            active
                              ? 'border-[#eab668] scale-110'
                              : 'border-[#e8dec8]/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: tc.hex }}
                        >
                          {active && (
                            <Check
                              className={`w-4 h-4 ${
                                tc.id === 'linho_cru' ||
                                tc.id === 'areia_judeia'
                                  ? 'text-[#14100b]'
                                  : 'text-[#f5efe6]'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#f5efe6] mb-2.5">
                    Roupas · Manto Externo
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {CLOAK_COLORS.map((cc) => {
                      const active = config.cloakColor === cc.hex;
                      return (
                        <button
                          key={cc.id}
                          type="button"
                          title={cc.label}
                          aria-label={`Manto: ${cc.label}`}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              cloakColor: cc.hex,
                            }))
                          }
                          className={`w-10 h-10 rounded-md flex items-center justify-center transition-transform cursor-pointer border-2 ${
                            active
                              ? 'border-[#eab668] scale-110'
                              : 'border-[#e8dec8]/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: cc.hex }}
                        >
                          {active && (
                            <Check
                              className={`w-4 h-4 ${
                                cc.id === 'lã_clara'
                                  ? 'text-[#14100b]'
                                  : 'text-[#f5efe6]'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pinned Horizontal Footer Action */}
          <div className="px-5 sm:px-7 py-4 border-t border-[#e8dec8]/12 bg-[#14110d] flex items-center justify-between gap-4 shrink-0">
            <span className="text-xs text-[#cfc3b0]/70 hidden md:inline">
              Você pode girar o modelo 3D à esquerda
            </span>

            <button
              type="submit"
              className="ml-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-[#d99b43] hover:bg-[#e5aa53] active:scale-[0.99] text-[#14100b] font-semibold text-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Começar no Jordão</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
