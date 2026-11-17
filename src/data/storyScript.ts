import { MotivationKey, MotivationProfile, StoryNode } from '../types/game';

export const MOTIVATION_META: Record<
  MotivationKey,
  { label: string; description: string }
> = {
  verdade: {
    label: 'Sede de Verdade',
    description:
      'Você caminhou atrás de Jesus buscando compreender quem Ele é e o que as Escrituras anunciavam.',
  },
  compaixao: {
    label: 'Coração Compassivo',
    description:
      'Seus passos buscaram alívio para a dor do mundo e consolo para os que não tinham voz.',
  },
  temor: {
    label: 'Temor e Dúvida Sincera',
    description:
      'Você se aproximou com cautela, ciente da própria pequenez diante da santidade de Deus.',
  },
  pertenca: {
    label: 'Anseio por Pertença',
    description:
      'Você seguiu porque reconheceu nEle um lar que nenhum outro mestre havia oferecido.',
  },
};

export function getDominantMotivation(
  profile: MotivationProfile
): MotivationKey {
  const entries = Object.entries(profile) as [MotivationKey, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export const STORY_NODES: Record<string, StoryNode> = {
  // =========================================================================
  // ATO I — ÀS MARGENS DO JORDÃO (JOÃO 1:29-39)
  // =========================================================================
  a1_f1_jordao_1: {
    id: 'a1_f1_jordao_1',
    actNumber: 1,
    actTitle: 'Ato I — O Chamado',
    phaseTitle: 'Às Margens do Jordão',
    scriptureRef: 'João 1:29-37',
    backdrop: 'jordan_river',
    speaker: 'narrator',
    paragraphs: [
      'O ar do vale do Jordão cheira a água fresca, juncos secos e terra aquecida pelo sol da manhã. Você permanece junto a André, ambos discípulos de João Batista, ouvindo o murmúrio constante do rio.',
      'De repente, João interrompe a conversa, ergue os olhos para um homem que caminha pela margem e sua voz atravessa o vale com solenidade tranquila:',
      '“Eis o Cordeiro de Deus.”',
    ],
    nextNodeId: 'a1_f1_jordao_2',
  },
  a1_f1_jordao_2: {
    id: 'a1_f1_jordao_2',
    actNumber: 1,
    actTitle: 'Ato I — O Chamado',
    phaseTitle: 'Às Margens do Jordão',
    scriptureRef: 'João 1:37-38',
    backdrop: 'jordan_river',
    speaker: 'andrew',
    speakerLabel: 'André',
    paragraphs: [
      'André toca seu braço em silêncio. Nem João nos manda ir, nem o estranho nos chama em voz alta — e, ainda assim, nossos pés deixam a beira do rio e seguem a poeira leve de Suas sandálias.',
      'Passos adiante, Jesus para. Sem pressa, Ele se volta e olha diretamente para vocês dois: “Que buscais?”',
    ],
    choices: [
      {
        id: 'c_jordao_verdade',
        text: '“Rabbi, onde moras? Preciso ouvir de perto o que o Senhor ensina.”',
        motivation: 'verdade',
        reflection:
          'No Jordão, você seguiu buscando luz para as perguntas antigas da mente.',
        nextNodeId: 'a1_f1_jordao_3',
      },
      {
        id: 'c_jordao_compaixao',
        text: '“Rabbi, onde moras? Há tanta dor nesta terra... queremos ver se a esperança enfim chegou.”',
        motivation: 'compaixao',
        reflection:
          'No Jordão, você seguiu carregando a ferida e a espera do seu povo.',
        nextNodeId: 'a1_f1_jordao_3',
      },
      {
        id: 'c_jordao_temor',
        text: '“Rabbi... perdoa a ousadia. Onde moras? Só queremos caminhar um pouco contigo.”',
        motivation: 'temor',
        reflection:
          'No Jordão, você se aproximou em reverência hesitante, sem se julgar digno.',
        nextNodeId: 'a1_f1_jordao_3',
      },
      {
        id: 'c_jordao_pertenca',
        text: '“Rabbi, onde moras? Há muito tempo procurávamos um lugar para permanecer.”',
        motivation: 'pertenca',
        reflection:
          'No Jordão, você seguiu porque Sua voz soou como abrigo.',
        nextNodeId: 'a1_f1_jordao_3',
      },
    ],
  },
  a1_f1_jordao_3: {
    id: 'a1_f1_jordao_3',
    actNumber: 1,
    actTitle: 'Ato I — O Chamado',
    phaseTitle: 'Na Casa, à Hora Décima',
    scriptureRef: 'João 1:38–39',
    backdrop: 'first_day_dwelling',
    speaker: 'jesus',
    speakerLabel: 'Jesus',
    paragraphs: [
      'A luz da tarde inclina-se para a noite pela porta baixa. Jesus repousa as mãos sobre a mesa simples e olha para você e para André com a paz de quem já os conhecia.',
      '“Vinde e vede... Senta.”',
      'Eram quase a hora décima — e vocês permaneceram com Ele aquele dia. A graça respondeu antes mesmo que o coração soubesse explicar o que procurava.',
    ],
    isJourneyEnd: true,
  },
  a1_f2_figueira_fim: {
    id: 'a1_f2_figueira_fim',
    actNumber: 1,
    actTitle: 'Ato I — O Chamado',
    phaseTitle: 'Debaixo da Figueira · O Céu Aberto',
    scriptureRef: 'João 1:43–51',
    backdrop: 'dawn_shore',
    speaker: 'nathanael',
    speakerLabel: 'Natanael',
    paragraphs: [
      'À saída daquela manhã rumo à Galileia, Filipe largou tudo ao ouvir “Segue-me”, e Natanael passou do ceticismo à adoração sob a sombra da figueira.',
      'Diante do grupo pequeno reunido na estrada clara, a promessa ainda ecoa no ar: “Vereis o céu aberto, e os anjos de Deus subindo e descendo sobre o Filho do Homem.”',
    ],
    isJourneyEnd: true,
  },
};
