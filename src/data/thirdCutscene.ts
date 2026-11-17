import { DialogueChoice } from '../types/game';

export interface CutsceneDialogueLine {
  speaker: string;
  scriptureRef: string;
  text: string;
  /** Normalized progress threshold (0..1) within the scene when the line starts */
  startAt: number;
  /** Normalized progress threshold (0..1) when the line clears */
  endAt: number;
}

export interface ThirdCutsceneBeat {
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
  lines: CutsceneDialogueLine[];
  uiNote: string;
  durationSec: number;
  pausesForChoice?: boolean;
  hasOpenHeavenMoment?: boolean;
  /** Progress threshold (0..1) in Cena 5 where 100% of UI hides for the open sky */
  openHeavenUiCutoff?: number;
}

export const THIRD_CUTSCENE_BEATS: ThirdCutsceneBeat[] = [
  {
    beatNumber: 1,
    title: 'Cena 1 — “Segue-me” ao Amanhecer',
    contextCue:
      'No dia seguinte · Partida para a Galileia sob a neblina baixa do amanhecer',
    intertitle: {
      kicker: 'Terceira Cutscene · João 1:43–51',
      heading: 'A Caminho da Galileia',
      subtext:
        'Na manhã seguinte ao dia na casa, Jesus chama Filipe e revela a Natanael o céu aberto',
    },
    cameraDirection:
      'Plano longo contemplativo em profundidade de campo: os discípulos atravessam a porta baixa da casa sob neblina rasteira e contraluz dourada estilo Caravaggio, avançando em plano médio até o rosto sereno de Jesus diante de Filipe.',
    visualDescription:
      'O dia nasce envolto em névoa baixa azulada sobre a relva úmida e os muros de pedra. O discípulo anônimo e André saem da morada atrás de Jesus, que resolve partir para a Galileia. À beira do caminho, Filipe — natural de Betsaida, cidade de André e Pedro — detém-se ao ouvir o chamado simples. Sem fazer perguntas nem olhar para trás, larga seus pertences junto ao muro e passa a caminhar com o grupo.',
    audioDirection:
      'Silêncio frio da madrugada com vento leve na relva e passos úmidos na terra; pausa silenciosa antes da voz firme e mansa de Jesus, sem música.',
    lines: [
      {
        speaker: 'Jesus',
        scriptureRef: 'João 1:43',
        text: '“Segue-me.”',
        startAt: 0.34,
        endAt: 0.72,
      },
    ],
    uiNote:
      'Legenda pequena, limpa, sem bordas e sem caixa na margem inferior apenas no instante da fala; silêncio visual total antes e durante a partida silenciosa de Filipe.',
    durationSec: 7.5,
  },
  {
    beatNumber: 2,
    title: 'Cena 2 — “Pode vir algo de bom de Nazaré?”',
    contextCue:
      'Estrada entre muros e oliveiras · Filipe encontra Natanael',
    cameraDirection:
      'Plano médio em foco raso acompanhando a chegada apressada de Filipe diante de um muro de pedra aquecido pelo sol nascente; corte contemplativo fechado para a expressão cética de Natanael à meia-sombra das oliveiras.',
    visualDescription:
      'Mais adiante na trilha, Filipe avista Natanael e aproxima-se com o rosto aceso pela descoberta, falando com entusiasmo contido. Natanael ergue a sobrancelha sem esconder o ceticismo diante da origem humilde da aldeia anunciada, mas aceita o convite direto de Filipe.',
    audioDirection:
      'Brisa matinal nos ramos de oliveira e silêncio breve antes de cada resposta; nenhum instrumento musical entra ainda.',
    lines: [
      {
        speaker: 'Filipe',
        scriptureRef: 'João 1:45',
        text: '“Achamos aquele de quem Moisés escreveu na lei, e os profetas: Jesus de Nazaré, filho de José.”',
        startAt: 0.14,
        endAt: 0.48,
      },
      {
        speaker: 'Natanael',
        scriptureRef: 'João 1:46',
        text: '“Pode vir algo de bom de Nazaré?”',
        startAt: 0.54,
        endAt: 0.78,
      },
      {
        speaker: 'Filipe',
        scriptureRef: 'João 1:46',
        text: '“Vem e vê.”',
        startAt: 0.82,
        endAt: 0.99,
      },
    ],
    uiNote:
      'Legendas limpas sem caixas acompanham as falas alternadas; ao final da hesitação de Natanael, um pequeno balão de borda sutil surge no canto inferior direito para registrar o olhar interior do discípulo sem cobrir os rostos.',
    durationSec: 9.2,
    pausesForChoice: true,
  },
  {
    beatNumber: 3,
    title: 'Cena 3 — Sob a Sombra da Figueira',
    contextCue:
      'Plano-sequência pela trilha da Galileia · Encontro de Jesus com Natanael',
    cameraDirection:
      'Longo plano-sequência fluido caminhando junto a Jesus, Filipe, André e o discípulo anônimo ao longo da vereda até revelar Natanael sentado na sombra recortada sob os galhos da figueira; corte lento para close no rosto de Natanael quando Jesus fala.',
    visualDescription:
      'O grupo avança pela estrada de terra clara enquanto o sol da manhã recorta feixes oblíquos por entre os galhos espessos de uma grande figueira. Natanael aguarda à sombra, ainda reservado. Ao vê-lo aproximar-se, Jesus contempla-o com clareza serena, provocando estranhamento imediato no semblante de Natanael.',
    audioDirection:
      'Passos contínuos na terra batida durante o plano-sequência; silêncio súbito quando o grupo para sob a copa da figueira antes da primeira palavra.',
    lines: [
      {
        speaker: 'Jesus',
        scriptureRef: 'João 1:47',
        text: '“Eis um verdadeiro israelita, em quem não há dolo.”',
        startAt: 0.44,
        endAt: 0.74,
      },
      {
        speaker: 'Natanael',
        scriptureRef: 'João 1:48',
        text: '“De onde me conheces?”',
        startAt: 0.78,
        endAt: 0.98,
      },
    ],
    uiNote:
      'Tela completamente limpa ao longo de toda a caminhada em plano-sequência; legendas discretas e sem bordas entram apenas sob a figueira nos instantes exatos das falas.',
    durationSec: 9.8,
  },
  {
    beatNumber: 4,
    title: 'Cena 4 — “Antes de Filipe te chamar”',
    contextCue:
      'Debaixo da figueira · O ceticismo cede lugar à reverência',
    cameraDirection:
      'Close fechado em claro-escuro estilo Caravaggio no rosto tranquilo de Jesus, seguido de plano próximo demorado no rosto de Natanael na sombra da figueira — captando o instante lento em que a desconfiança se desfaz em assombro e adoração.',
    visualDescription:
      'Os raios dourados atravessam as folhas e tangenciam o rosto de Natanael ainda em meia-sombra. Diante da resposta direta de Jesus, sua postura rígida cede, os olhos se dilatam e o cético inclina a cabeça ao reconhecer quem está diante dele.',
    audioDirection:
      'Silêncio absoluto precedendo a resposta de Jesus; após o susto silencioso de Natanael, um acorde grave e sutil começa a respirar por baixo de sua confissão.',
    lines: [
      {
        speaker: 'Jesus',
        scriptureRef: 'João 1:48',
        text: '“Antes de Filipe te chamar, eu te vi quando estavas debaixo da figueira.”',
        startAt: 0.1,
        endAt: 0.5,
      },
      {
        speaker: 'Natanael',
        scriptureRef: 'João 1:49',
        text: '“Rabi, tu és o Filho de Deus, tu és o Rei de Israel.”',
        startAt: 0.58,
        endAt: 0.96,
      },
    ],
    uiNote:
      'Silêncio visual nos intervalos entre as frases; legenda discreta sem caixas na base esquerda para não interromper a leitura emocional do close no rosto de Natanael.',
    durationSec: 8.8,
  },
  {
    beatNumber: 5,
    title: 'Cena 5 — O Céu Aberto',
    contextCue:
      'João 1:51 · A promessa e a imensidão do céu aberto',
    cameraDirection:
      'Close sereno no sorriso manso de Jesus durante a promessa; no instante seguinte, a câmera recua e sobe devagar em movimento contínuo e majestoso acima da copa da figueira, mostrando Jesus, o discípulo anônimo, André, Filipe e Natanael pequeninos diante do céu aberto.',
    visualDescription:
      'Jesus sorri com brandura diante da fé nascente de Natanael e pronuncia a promessa final. Assim que termina de falar, o azul claro da manhã rasga-se em uma claridade dourada vertiginosa. Colunas de luz descem sobre o Filho do Homem e anjos luminosos sobem e descem silenciosamente entre a terra e o firmamento enquanto o grupo permanece imóvel, diminuto diante da imensidão.',
    audioDirection:
      'Silêncio solene antes da promessa; assim que a última palavra ressoa e o céu se abre, a trilha orquestral e coral cresce gradualmente em plenitude luminosa e reverente até o desfecho.',
    lines: [
      {
        speaker: 'Jesus',
        scriptureRef: 'João 1:51',
        text: '“Em verdade, em verdade vos digo que vereis o céu aberto, e os anjos de Deus subindo e descendo sobre o Filho do Homem.”',
        startAt: 0.06,
        endAt: 0.36,
      },
    ],
    uiNote:
      'Assim que a promessa termina e o céu se abre, 100% da interface — legendas, botões, barras e indicações — desaparece por completo da tela durante todo o plano ascendente.',
    durationSec: 12.0,
    hasOpenHeavenMoment: true,
    openHeavenUiCutoff: 0.37,
  },
];

export const THIRD_CUTSCENE_CHOICES: DialogueChoice[] = [
  {
    id: 'c3_natanael_silencio',
    text: 'Guardar a dúvida de Natanael em silêncio e caminhar junto',
    motivation: 'temor',
    reflection:
      'Ao ouvir “Pode vir algo de bom de Nazaré?”, você permaneceu quieto e seguiu os passos de Jesus até a figueira.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c3_natanael_esperanca',
    text: 'Acompanhar o entusiasmo de Filipe: “Vem e vê”',
    motivation: 'verdade',
    reflection:
      'Lembrando o próprio “Vinde e vede” ouvido no dia anterior, você caminhou certo de que a presença de Jesus bastaria como resposta.',
    nextNodeId: 'a1_f1_jordao_3',
  },
];

export const THIRD_CUTSCENE_INTERFACE_NOTE =
  'Todas as legendas desta terceira cutscene aparecem em fonte pequena e discreta na margem inferior, completamente sem bordas e sem caixas opacas, precedidas de silêncio e recolhidas logo após cada fala para preservar a contemplação. Quando surge o balão de escolha na Cena 2, ele é compacto, possui apenas uma borda fina e sutil no canto inferior direito e jamais cobre os rostos ou o centro do quadro. No instante culminante da Cena 5 — quando o céu se abre em luz dourada e os anjos sobem e descem sobre o Filho do Homem — nenhuma interface, legenda, barra ou botão permanece visível na tela.';
