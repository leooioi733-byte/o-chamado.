import { DialogueChoice } from '../types/game';

export interface GameplayDecisionOption {
  id: string;
  label: string;
  consequence: string;
}

export interface GameplayEncounterBlock {
  encounterTitle: string;
  options: GameplayDecisionOption[];
}

export interface SecondCutsceneBeat {
  beatNumber: number;
  title: string;
  contextCue: string;
  intertitle?: {
    kicker: string;
    heading: string;
    subtext: string;
  };
  cameraDirection: string;
  visualDescription: string;
  audioDirection: string;
  speaker?: string;
  scriptureRef?: string;
  subtitle?: string;
  atmosphereNote?: string;
  gameplayEncounters?: GameplayEncounterBlock[];
  uiNote: string;
  durationSec: number;
  pausesForChoice?: boolean;
  isGameplayMission?: boolean;
  isEndingBeat?: boolean;
}

export const SECOND_CUTSCENE_BEATS: SecondCutsceneBeat[] = [
  {
    beatNumber: 1,
    title: 'Cena 1 — “Que buscais?”',
    contextCue:
      'Estrada às margens do Jordão · Jesus para e se volta para você e André',
    intertitle: {
      kicker: 'Segunda Cutscene Interativa · João 1:38–39',
      heading: 'A Décima Hora',
      subtext: 'O entardecer na morada simples e a primeira lição de serviço',
    },
    cameraDirection:
      'Plano médio em foco raso pelas costas dos dois discípulos. Jesus interrompe o passo diante da luz dourada do fim da tarde e se volta devagar até enquadrar Seu rosto em plano próximo contemplativo, deslocado suavemente à esquerda.',
    visualDescription:
      'O sol começa a inclinar-se sobre o vale do Jordão, alongando as sombras na poeira da trilha. Jesus para, vira-se lentamente sem surpresa nem pressa, e olha nos olhos do discípulo anônimo e de André. A imagem sustenta o silêncio vivo da espera.',
    audioDirection:
      'Brisa baixa nos juncos distantes e o último murmúrio quase inaudível do rio ficando para trás. Silêncio musical absoluto após a pergunta.',
    speaker: 'Jesus',
    scriptureRef: 'João 1:38',
    subtitle: '“Que buscais?”',
    uiNote:
      'Legenda limpa sem bordas nem caixa na base esquerda durante a pergunta. A cena pausa e exibe apenas um balão compacto com borda sutil no canto inferior direito para a escolha do jogador.',
    durationSec: 4.4,
    pausesForChoice: true,
  },
  {
    beatNumber: 2,
    title: 'Cena 2 — “Vinde e vede”',
    contextCue:
      'Pela estrada de terra — O sol baixo projeta sombras compridas rumo à casa',
    cameraDirection:
      'Plano-sequência contínuo e longo em movimento baixo pelas costas dos três, acompanhando toda a travessia pela estrada de terra contra a luz oblíqua do entardecer até a fachada da casa simples sob a figueira.',
    visualDescription:
      'Jesus responde com mansidão simples e retoma o passo pela vereda de terra clara. Você e André o acompanham alguns passos atrás. O sol baixo tinge os mantos de âmbar e estica três sombras compridas pela poeira até revelar um pequeno pátio de terra, uma figueira retorcida e uma casa humilde de pedra e barro com porta baixa, onde Jesus curva os ombros para entrar.',
    audioDirection:
      'Passos cadenciados de sandálias na terra batida, vento morno passando pelas ervas secas e o ranger suave da madeira seca sob o batente baixo.',
    speaker: 'Jesus',
    scriptureRef: 'João 1:39',
    subtitle: '“Vinde e vede.”',
    uiNote:
      'A legenda aparece apenas nos primeiros instantes da fala de Jesus e desaparece por completo durante o longo plano-sequência até a porta da casa.',
    durationSec: 9.0,
  },
  {
    beatNumber: 3,
    title: 'Cena 3 — A Bacia Vazia e o Pedido',
    contextCue:
      'Interior em claro-escuro · A bacia de barro vazia repousa ao lado da porta',
    cameraDirection:
      'Plano claro-escuro estilo Caravaggio dentro do aposento quase escuro: um único feixe oblíquo vindo da fresta revela a bacia de barro seca junto à soleira e sobe em corte lento até as mãos e o olhar sereno de Jesus.',
    visualDescription:
      'Dentro da morada simples, quase tudo repousa em sombra de umber escuro. Ao lado da porta baixa há uma bacia de barro inteiramente vazia, ainda com poeira seca no fundo. Jesus não manda nem apressa: olha para o vaso vazio, depois para o discípulo, e pede com simplicidade que vá buscar água no poço do vilarejo — não porque falte algo, mas para que Ele possa ensinar algo sobre servir.',
    audioDirection:
      'Quietude fechada de pedra e barro dentro do quarto; entrada sutilíssima de uma corda grave e contemplativa no instante do pedido.',
    speaker: 'Jesus',
    scriptureRef: 'Criação de atmosfera (prelúdio a João 13:5)',
    subtitle: '“Traz água do poço; há muito o que lavar antes que a noite caia.”',
    atmosphereNote:
      'Paráfrase breve criada apenas para atmosfera e ligação narrativa com a missão, sem contradizer João 1:38–39.',
    uiNote:
      'Legenda pequena sem caixa nem bordas apenas durante a fala breve; em seguida a interface da cena dissolve para dar lugar à caminhada jogável.',
    durationSec: 7.4,
  },
  {
    beatNumber: 4,
    title: 'Cena 4 — Missão: O Caminho até o Poço do Vilarejo',
    contextCue:
      'Gameplay interativo · Caminhe até o poço, ajude ou passe pela viúva e traga água',
    cameraDirection:
      'Câmera em terceira pessoa fluida acompanhando os passos do discípulo pela estrada do vilarejo em luz de fim de tarde, fechando suavemente nos momentos de encontro com a viúva e na beira de pedra do poço.',
    visualDescription:
      'O jogador assume o controle do discípulo saindo do pátio da figueira pela ruela de terra batida rumo ao poço de pedra do vilarejo, cercado por muros baixos e oliveiras ao pôr do sol. No meio da estrada, uma viúva cansada apoia um cântaro pesado contra a pedra do muro. Adiante, o poço comunitário aguarda com corda e balde sob os últimos raios dourados antes da volta para casa.',
    audioDirection:
      'Passos na terra batida, brisa suave entre os muros de pedra, som distante de cabras e grilos começando a despertar, e o eco suave da água profunda dentro do poço.',
    gameplayEncounters: [
      {
        encounterTitle: 'Encontro na Estrada · A Viúva com o Cântaro Pesado',
        options: [
          {
            id: 'widow_help',
            label: 'Ajudar a viúva a carregar o cântaro',
            consequence:
              'Registrado no Coração (+Compaixão): o discípulo divide o peso até o muro da casa dela. Ela agradece com um olhar silencioso e o gesto ecoa na paz da cena final.',
          },
          {
            id: 'widow_pass',
            label: 'Passar direto em silêncio',
            consequence:
              'Registrado no Coração (+Foco na tarefa): o discípulo apressa o passo para cumprir logo o pedido de Jesus; a imagem da viúva curvada retorna como peso silencioso mais adiante.',
          },
        ],
      },
      {
        encounterTitle: 'No Poço do Vilarejo · Como Encher o Cântaro',
        options: [
          {
            id: 'well_careful',
            label: 'Encher devagar e com cuidado',
            consequence:
              'A água sobe límpida e sem desperdício; na Cena 5, a bacia enche-se com serenidade e sem respingos ao redor.',
          },
          {
            id: 'well_hurried',
            label: 'Encher rápido e com pressa',
            consequence:
              'O cântaro transborda na borda de pedra; na Cena 5, gotas escuras marcam o chão junto à bacia enquanto a água ainda ondula.',
          },
        ],
      },
    ],
    uiNote:
      'Indicadores espaciais discretos em luz âmbar sobre a viúva e a borda do poço, sem poluir a composição; apenas um balão sutil de escolha abre quando o jogador interage.',
    durationSec: 12.0,
    isGameplayMission: true,
  },
  {
    beatNumber: 5,
    title: 'Cena 5 — A Água e os Pés Lavados',
    contextCue:
      'De volta à casa · Em silêncio claro-escuro, Jesus lava os pés de André e os seus',
    cameraDirection:
      'Plano íntimo estilo Caravaggio no chão de pedra junto à soleira iluminada pela fresta: close fechado na água vertida do cântaro dentro da bacia, nas mãos de Jesus enxugando e lavando primeiro os pés de André e depois os do discípulo, subindo lentamente para o rosto de Jesus.',
    visualDescription:
      'De volta ao aposento sombrio, o discípulo entrega o cântaro. Jesus despeja a água na bacia de barro (serena e plena se colhida com cuidado, ou agitada com respingos na pedra seca se trazida com pressa), ajoelha-se no chão frio e lava os pés empoeirados de André e do próprio discípulo. Enquanto inclina a cabeça sob o feixe dourado, Ele pronuncia poucas palavras sobre servir.',
    audioDirection:
      'Som cristalino e reverberante de água despejada no barro e escorrendo entre os dedos; silêncio profundo interrompido apenas por poucas notas cálidas de viola antiga.',
    speaker: 'Jesus',
    scriptureRef: 'Criação de atmosfera (ecoando João 13:5)',
    subtitle:
      '“Quem caminha comigo aprende primeiro a inclinar-se pelos outros.”',
    atmosphereNote:
      'Paráfrase contemplativa marcada como criação de atmosfera: ecoa João 13:5 e o gesto de serviço de Jesus sem citar a Última Ceia diretamente.',
    uiNote:
      'Nos primeiros segundos do gesto de lavar os pés a tela permanece 100% limpa; a legenda curta entra sem bordas apenas no instante da fala e se apaga em seguida.',
    durationSec: 9.0,
  },
  {
    beatNumber: 6,
    title: 'Cena 6 — O Entardecer pela Fresta',
    contextCue:
      'Eram quase a hora décima · Os três sentam-se à mesa em silêncio (João 1:39)',
    cameraDirection:
      'Plano longo contemplativo pela mesa de madeira no claro-escuro: a luz dourada da tarde afina-se na fresta da parede oeste enquanto a câmera se aproxima devagar pelo olhar do discípulo até repousar no rosto silencioso de Jesus.',
    visualDescription:
      'Lá fora, o céu passa para o azul profundo do entardecer. O último fio dourado que atravessa a fresta ilumina os rostos à mesa simples: André em reverência quieta, o discípulo em paz (trazendo na memória o encontro da estrada com a viúva), e Jesus do outro lado da madeira, olhando diretamente para o discípulo como quem já o conhece por inteiro.',
    audioDirection:
      'Grilos serenos no pátio sob a figueira; a trilha dissolve em silêncio pacífico sobre a última imagem.',
    speaker: 'João 1:39',
    scriptureRef: 'João 1:39',
    subtitle: 'Eram quase a hora décima — e permaneceram com Ele aquele dia.',
    uiNote:
      'Legenda poética mínima sem bordas nem caixa nos instantes finais, desaparecendo antes do encerramento em silêncio sobre o olhar de Jesus.',
    durationSec: 7.5,
    isEndingBeat: true,
  },
];

export const SECOND_CUTSCENE_CHOICES: DialogueChoice[] = [
  {
    id: 'c2_onde_moras',
    text: '“Rabi, onde moras?”',
    motivation: 'verdade',
    reflection:
      'À beira do caminho do Jordão, você perguntou onde Ele habitava para conhecer de perto Sua vida e ensino.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c2_ficar_perto',
    text: '“Não sei, mas quero ficar perto de Ti”',
    motivation: 'pertenca',
    reflection:
      'Mesmo sem saber formular perguntas teológicas, você reconheceu nEle o único lugar onde o coração queria permanecer.',
    nextNodeId: 'a1_f1_jordao_3',
  },
];

export const WIDOW_CHOICES: DialogueChoice[] = [
  {
    id: 'c2_widow_help',
    text: 'Ajudar a viúva a carregar o cântaro',
    motivation: 'compaixao',
    reflection:
      'No caminho do poço, você parou para aliviar o peso da viúva antes mesmo de ouvir a lição sobre servir.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c2_widow_pass',
    text: 'Passar direto em silêncio',
    motivation: 'verdade',
    reflection:
      'Apressado para cumprir o que o Mestre pediu, você deixou a viúva sozinha com seu cântaro — e o silêncio da noite lembrou esse passo.',
    nextNodeId: 'a1_f1_jordao_3',
  },
];

export const WELL_CHOICES: DialogueChoice[] = [
  {
    id: 'c2_well_careful',
    text: 'Encher devagar e com cuidado',
    motivation: 'temor',
    reflection:
      'No poço do vilarejo, você puxou a água com calma e reverência, sem derramar uma gota na pedra.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c2_well_hurried',
    text: 'Encher rápido e com pressa',
    motivation: 'pertenca',
    reflection:
      'Com ânsia de voltar logo para perto de Jesus, você encheu o cântaro às pressas e respingou água pela soleira.',
    nextNodeId: 'a1_f1_jordao_3',
  },
];

export const SECOND_CUTSCENE_INTERFACE_NOTE =
  'Em toda a segunda cutscene, legendas e indicadores jamais cobrem rostos ou o centro do quadro. Nas Cenas 1, 2, 3, 5 e 6, as legendas surgem sem bordas nem caixas, em texto pequeno na margem inferior apenas durante as falas curtas, mantendo longos silêncios com tela limpa. Na Cena 1, apenas o balão compacto de escolha possui borda sutil no canto inferior direito. Durante a missão jogável do poço (Cena 4), os marcadores sobre a viúva e o poço aparecem integrados ao cenário em luz âmbar discreta e o controle analógico permanece translúcido no canto inferior esquerdo.';
