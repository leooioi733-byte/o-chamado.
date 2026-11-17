import { JournalEntry, MotivationKey, MotivationProfile } from '../types/game';

export type MilestoneIconKey =
  | 'lamp'
  | 'compass'
  | 'heart'
  | 'water'
  | 'shield'
  | 'flame'
  | 'home'
  | 'crown'
  | 'sun'
  | 'book';

export interface FaithMilestone {
  id: string;
  title: string;
  subtitle: string;
  scriptureHint: string;
  motivation?: MotivationKey;
  badgeLabel: string;
  tier: 'bronze' | 'ouro' | 'plenitude';
  iconKey: MilestoneIconKey;
  target: number;
  getProgress: (
    motivations: MotivationProfile,
    history: JournalEntry[]
  ) => number;
}

export interface EvaluatedMilestone {
  milestone: FaithMilestone;
  unlocked: boolean;
  current: number;
  target: number;
}

export const FAITH_MILESTONES: FaithMilestone[] = [
  {
    id: 'primeiro_chamado',
    title: 'Às Margens do Jordão',
    subtitle:
      'Respondeu pela primeira vez ao chamado de Jesus quando Ele perguntou: “Que buscais?”.',
    scriptureHint: 'João 1:38',
    badgeLabel: 'Primeiro Passo',
    tier: 'bronze',
    iconKey: 'compass',
    target: 1,
    getProgress: (_m, history) => Math.min(1, history.length),
  },
  {
    id: 'verdade_1',
    title: 'Olhar que Busca',
    subtitle:
      'Deu um passo movido pela sede de Verdade, desejando compreender o que Deus revelava.',
    scriptureHint: 'João 1:38–39',
    motivation: 'verdade',
    badgeLabel: 'Verdade · Grau I',
    tier: 'bronze',
    iconKey: 'lamp',
    target: 1,
    getProgress: (m) => Math.min(1, m.verdade),
  },
  {
    id: 'verdade_2',
    title: 'Lâmpada na Vereda',
    subtitle:
      'Perseverou na busca das Escrituras e caminhou confiante no “Vem e vê” anunciado a Natanael.',
    scriptureHint: 'João 1:45–46',
    motivation: 'verdade',
    badgeLabel: 'Verdade · Grau II',
    tier: 'ouro',
    iconKey: 'book',
    target: 2,
    getProgress: (m) => Math.min(2, m.verdade),
  },
  {
    id: 'compaixao_1',
    title: 'Mão Estendida',
    subtitle:
      'Inclinou-se diante do sofrimento alheio, preferindo aliviar o fardo do próximo pelo caminho.',
    scriptureHint: 'João 1:39 · Serviço',
    motivation: 'compaixao',
    badgeLabel: 'Compaixão · Grau I',
    tier: 'bronze',
    iconKey: 'heart',
    target: 1,
    getProgress: (m) => Math.min(1, m.compaixao),
  },
  {
    id: 'compaixao_2',
    title: 'Coração de Servo',
    subtitle:
      'Fez da misericórdia a resposta constante do coração diante da bacia e da estrada.',
    scriptureHint: 'Eco de João 13:5',
    motivation: 'compaixao',
    badgeLabel: 'Compaixão · Grau II',
    tier: 'ouro',
    iconKey: 'water',
    target: 2,
    getProgress: (m) => Math.min(2, m.compaixao),
  },
  {
    id: 'temor_1',
    title: 'Passos Descalços',
    subtitle:
      'Aproximou-se de Cristo em reverência sincera, reconhecendo a santidade de quem o chamava.',
    scriptureHint: 'João 1:38',
    motivation: 'temor',
    badgeLabel: 'Temor · Grau I',
    tier: 'bronze',
    iconKey: 'shield',
    target: 1,
    getProgress: (m) => Math.min(1, m.temor),
  },
  {
    id: 'temor_2',
    title: 'Ouvido Atento',
    subtitle:
      'Guardou o silêncio santo diante da dúvida alheia e recebeu com calma a palavra do Mestre.',
    scriptureHint: 'João 1:47–49',
    motivation: 'temor',
    badgeLabel: 'Temor · Grau II',
    tier: 'ouro',
    iconKey: 'flame',
    target: 2,
    getProgress: (m) => Math.min(2, m.temor),
  },
  {
    id: 'pertenca_1',
    title: 'Abrigo Encontrado',
    subtitle:
      'Não procurou argumentos: quis apenas permanecer perto d’Aquele em quem o coração encontrou lar.',
    scriptureHint: 'João 1:39',
    motivation: 'pertenca',
    badgeLabel: 'Pertença · Grau I',
    tier: 'bronze',
    iconKey: 'home',
    target: 1,
    getProgress: (m) => Math.min(1, m.pertenca),
  },
  {
    id: 'pertenca_2',
    title: 'Morada em Ti',
    subtitle:
      'Fez da presença de Jesus o centro de cada escolha e do anseio de ficar ao Seu lado.',
    scriptureHint: 'João 1:43',
    motivation: 'pertenca',
    badgeLabel: 'Pertença · Grau II',
    tier: 'ouro',
    iconKey: 'sun',
    target: 2,
    getProgress: (m) => Math.min(2, m.pertenca),
  },
  {
    id: 'coracao_pleno',
    title: 'Coração Pleno sob o Céu Aberto',
    subtitle:
      'Desbloqueou decisões em pelo menos três motivações distintas ao longo da jornada pela Galileia.',
    scriptureHint: 'João 1:51',
    badgeLabel: 'Plenitude',
    tier: 'plenitude',
    iconKey: 'crown',
    target: 3,
    getProgress: (m) => {
      let distinct = 0;
      if (m.verdade > 0) distinct++;
      if (m.compaixao > 0) distinct++;
      if (m.temor > 0) distinct++;
      if (m.pertenca > 0) distinct++;
      return Math.min(3, distinct);
    },
  },
];

const EMPTY_MOTIVATIONS: MotivationProfile = {
  verdade: 0,
  compaixao: 0,
  temor: 0,
  pertenca: 0,
};

export function evaluateFaithMilestones(
  motivations: MotivationProfile = EMPTY_MOTIVATIONS,
  history: JournalEntry[] = []
): EvaluatedMilestone[] {
  return FAITH_MILESTONES.map((milestone) => {
    const current = milestone.getProgress(motivations, history);
    return {
      milestone,
      unlocked: current >= milestone.target,
      current,
      target: milestone.target,
    };
  });
}

export function getNewlyUnlockedMilestones(
  prevMotivations: MotivationProfile,
  prevHistory: JournalEntry[],
  nextMotivations: MotivationProfile,
  nextHistory: JournalEntry[]
): FaithMilestone[] {
  const before = evaluateFaithMilestones(prevMotivations, prevHistory);
  const after = evaluateFaithMilestones(nextMotivations, nextHistory);
  const newly: FaithMilestone[] = [];
  for (let i = 0; i < after.length; i++) {
    if (after[i].unlocked && !before[i].unlocked) {
      newly.push(after[i].milestone);
    }
  }
  return newly;
}
