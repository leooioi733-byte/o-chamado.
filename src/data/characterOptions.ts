import { BeardStyle, CharacterConfig, HairStyle } from '../types/game';

export interface SwatchOption {
  id: string;
  label: string;
  hex: string;
}

export interface StyleOption<T extends string> {
  id: T;
  label: string;
}

export const SKIN_TONES: SwatchOption[] = [
  { id: 'oliva_claro', label: 'Oliva claro', hex: '#E3BA98' },
  { id: 'dourado_deserto', label: 'Dourado do deserto', hex: '#D19F77' },
  { id: 'bronzeado_galileia', label: 'Bronzeado da Galileia', hex: '#B87E56' },
  { id: 'ambar_terroso', label: 'Âmbar terroso', hex: '#9A6340' },
  { id: 'castanho_profundo', label: 'Castanho profundo', hex: '#76472B' },
  { id: 'ebano_quente', label: 'Ébano quente', hex: '#4F2D1B' },
];

export const HAIR_COLORS: SwatchOption[] = [
  { id: 'preto_azeviche', label: 'Preto azeviche', hex: '#1B1715' },
  { id: 'castanho_escuro', label: 'Castanho escuro', hex: '#38251B' },
  { id: 'castanho_acobreado', label: 'Castanho acobreado', hex: '#683A24' },
  { id: 'louro_jordao', label: 'Castanho dourado', hex: '#9A7248' },
  { id: 'grisalho', label: 'Grisalho', hex: '#7C7770' },
  { id: 'branco_anciao', label: 'Branco ancião', hex: '#D8D2C9' },
];

export const TUNIC_COLORS: SwatchOption[] = [
  { id: 'linho_cru', label: 'Linho cru', hex: '#D9CEBC' },
  { id: 'areia_judeia', label: 'Areia da Judeia', hex: '#BFA782' },
  { id: 'terracota', label: 'Terracota', hex: '#9E533B' },
  { id: 'oliva', label: 'Verde-oliva', hex: '#5D6646' },
  { id: 'indigo_tiro', label: 'Índigo do mar', hex: '#37535D' },
  { id: 'carvao', label: 'Carvão de pedra', hex: '#2F2C29' },
];

export const CLOAK_COLORS: SwatchOption[] = [
  { id: 'ocre', label: 'Ocre do caminho', hex: '#8F6339' },
  { id: 'vinho_judeia', label: 'Vinho escuro', hex: '#632E2D' },
  { id: 'azul_galileia', label: 'Azul da Galileia', hex: '#2C4652' },
  { id: 'terra_sombria', label: 'Terra sombria', hex: '#46382E' },
  { id: 'lã_clara', label: 'Lã natural', hex: '#C7B89E' },
  { id: 'musgo', label: 'Cedro antigo', hex: '#434E3D' },
];

export const HAIR_STYLES: StyleOption<HairStyle>[] = [
  { id: 'curto_ondulado', label: 'Curto ondulado' },
  { id: 'longo_ombros', label: 'Longo aos ombros' },
  { id: 'preso_faixa', label: 'Preso com faixa' },
  { id: 'cachos_naturais', label: 'Cachos naturais' },
  { id: 'curtissimo', label: 'Raspado / curto' },
  { id: 'trancado_veu', label: 'Trançado com véu' },
];

export const BEARD_STYLES: StyleOption<BeardStyle>[] = [
  { id: 'sem_barba', label: 'Sem barba' },
  { id: 'curta', label: 'Barba curta' },
  { id: 'cheia', label: 'Barba cheia' },
  { id: 'patriarca', label: 'Barba longa' },
];

export const SUGGESTED_NAMES: Record<'masculino' | 'feminino', string[]> = {
  masculino: ['Eliézer', 'Matias', 'Tobias', 'Jonas', 'Silas'],
  feminino: ['Miriam', 'Susana', 'Joana', 'Marta', 'Rute'],
};

export const DEFAULT_CHARACTER: CharacterConfig = {
  name: 'Eliézer',
  gender: 'masculino',
  beardStyle: 'curta',
  hairStyle: 'curto_ondulado',
  skinTone: '#B87E56',
  hairColor: '#38251B',
  tunicColor: '#D9CEBC',
  cloakColor: '#2C4652',
};
