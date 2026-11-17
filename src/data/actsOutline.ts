import { ActBlueprint } from '../types/game';

export const ACTS_BLUEPRINT: ActBlueprint[] = [
  {
    actNumber: 1,
    title: 'Ato I — O Chamado',
    subtitle: 'Água, poeira e o primeiro olhar',
    theme:
      'O discípulo anônimo deixa as margens do Jordão movido por uma busca ainda silenciosa e descobre que a resposta de Jesus não é um sermão, mas um convite: "Vinde e vede".',
    phases: [
      {
        phaseNumber: 'Abertura',
        title: 'Às Margens do Jordão',
        scripture: 'João 1:29-39',
        setting:
          'Vale do rio Jordão ao amanhecer, entre pedras, névoa, tendas e fogueiras.',
        summary:
          'João Batista aponta: "Eis o Cordeiro de Deus". Após o batismo e o raiar do dia seguinte, você e André caminham pelo vale até alcançar Jesus. Ele se volta e pergunta: "Que buscais?".',
        motivationEcho:
          'Define a motivação inicial do coração: Sede de Verdade, Coração Compassivo, Temor Reverente ou Anseio por Pertença.',
        playableNodeId: 'a1_f1_jordao_3',
      },
    ],
  },
];
