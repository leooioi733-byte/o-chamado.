import { DialogueChoice } from '../types/game';

export interface CutsceneBeat {
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
  uiNote: string;
  durationSec: number;
  isFinalChoiceBeat?: boolean;
}

export const OPENING_CUTSCENE_BEATS: CutsceneBeat[] = [
  {
    beatNumber: 1,
    title: 'Cena 1 — O Vale Sob a Névoa',
    contextCue: 'Dia 1 · Topo do barranco norte — Você avista o vale do Jordão, a multidão e as fogueiras',
    intertitle: {
      kicker: 'Cutscene de Abertura · João 1:29–39',
      heading: 'Às Margens do Jordão',
      subtext: 'O início da jornada do discípulo sem nome',
    },
    cameraDirection:
      'Plano geral extremo (extreme wide shot) em primeira pessoa no alto do desfiladeiro norte. Panorâmica horizontal lenta revelando a trilha em ziguezague, o rio turquesa, as tendas à esquerda e o terraço com fogueiras à direita.',
    visualDescription:
      'Amanhecer no vale do Jordão. Uma névoa baixa repousa sobre as águas claras entre as pedras do leito. Na margem sul, tendas de linho e dezenas de ouvintes se reúnem enquanto fogueiras ardem no terraço rochoso à direita.',
    audioDirection:
      'Vento seco passando pelos juncos, água corrente distante e um murmúrio quase imperceptível de vozes humanas subindo do vale. Silêncio musical nos primeiros segundos; apenas uma nota grave sustentada de corda grave (cello) entra em fade-in sutil.',
    subtitle: undefined,
    uiNote:
      'Sem legendas e sem HUD. Apenas o quadro aberto e o respiro do vale.',
    durationSec: 6.5,
  },
  {
    beatNumber: 2,
    title: 'Cena 2 — A Descida Pelas Pedras',
    contextCue: 'Você desce a trilha em ziguezague pelo desfiladeiro em direção ao rio',
    cameraDirection:
      'Plano conjunto em acompanhamento traseiro (tracking shot por trás do ombro do discípulo), descendo suavemente pelo caminho em ziguezague. Profundidade de campo rasa mantendo a silhueta em foco e revelando a multidão abaixo.',
    visualDescription:
      'O discípulo anônimo inicia a descida pela trilha estreita de pedra clara e terra batida entre os paredões de calcário. A cada curva do ziguezague, a luz dourada do sol nascente recorta seus ombros estilo Caravaggio, revelando o rio e a multidão às margens.',
    audioDirection:
      'Passos suaves de sandálias no cascalho seco; o crepitar distante da lenha e o som do rio ficando mais nítido. Uma melodia minimalista de lira/harpa antiga toca duas notas espaçadas.',
    subtitle: undefined,
    uiNote:
      'Interface completamente oculta durante a descida para preservar a imersão cinematográfica.',
    durationSec: 6.5,
  },
  {
    beatNumber: 3,
    title: 'Cena 3 — A Voz Dentro da Água',
    contextCue: 'João Batista prega dentro do rio diante da multidão reunida perto das tendas',
    cameraDirection:
      'Plano médio baixo na altura da água, avançando devagar por entre os ombros da multidão silenciosa até enquadrar João Batista com luz lateral dramática.',
    visualDescription:
      'João Batista está de pé com água até os joelhos no leito claro do Jordão. Veste manto áspero de pelos e couro. Na margem sudoeste, diante das tendas, homens, mulheres e publicanos permanecem imóveis em silêncio atento.',
    audioDirection:
      'O sussurro constante da correnteza. A trilha sonora recua para dar espaço absoluto à voz firme e rouca de João.',
    speaker: 'João Batista',
    scriptureRef: 'Mateus 3:2 · Lucas 3:8',
    subtitle:
      '“Arrependei-vos, porque é chegado o Reino dos Céus... produzi frutos dignos de arrependimento.”',
    uiNote:
      'Legenda limpa e pequena na base inferior, sem caixa nem borda, sumindo suavemente antes da pausa seguinte.',
    durationSec: 6.5,
  },
  {
    beatNumber: 4,
    title: 'Cena 4 — O Olhar que Se Detém',
    contextCue: 'Jesus vem pela estrada de terra à direita — João para no meio da frase',
    cameraDirection:
      'Corte lento para plano aberto revelando Jesus caminhando pela estrada arenosa ao sudeste; retorno em close lento no rosto de João Batista quando sua fala se interrompe no meio.',
    visualDescription:
      'Pela estrada cercada de madeira ao sudeste, Jesus caminha em direção ao rio, banhado pela luz oblíqua da manhã. João Batista para de falar subitamente no meio da frase. Seu olhar atravessa a margem e se fixa naquele Homem.',
    audioDirection:
      'Silêncio repentino de quase três segundos — até a água parece soar mais baixa. Uma única nota aguda e limpa sustenta a suspensão antes da fala.',
    speaker: 'João Batista',
    scriptureRef: 'João 1:29',
    subtitle:
      '“Eis o Cordeiro de Deus, que tira o pecado do mundo.”',
    uiNote:
      'Legenda surge apenas durante a proclamação, sem caixas; desaparece assim que João termina.',
    durationSec: 7.5,
  },
  {
    beatNumber: 5,
    title: 'Cena 5 — Céus Abertos Sobre o Jordão',
    contextCue: 'O Batismo de Jesus no centro do rio — A luz dourada e a pomba descem dos céus',
    cameraDirection:
      'Plano sequência lento: acompanha Jesus entrando na água; no momento em que emerge, a câmera inclina suavemente para o alto (tilt up) acompanhando o facho de luz dourada e a descida da pomba.',
    visualDescription:
      'Jesus entra nas águas claras do Jordão diante de João. Ao sair da água, o céu acima do vale se fende numa claridade dourada e serena — não cegante, mas viva. Uma luz vertical banha a água e a figura da pomba desce suavemente sobre Ele em meio à bruma luminosa.',
    audioDirection:
      'Som suave da água se abrindo; um acorde coral etéreo sem palavras entra em crescendo contido e dá lugar a uma voz profunda, solene e paterna que parece vibrar no ar.',
    speaker: 'Voz dos Céus',
    scriptureRef: 'Mateus 3:16-17',
    subtitle: '“Este é o meu Filho amado, em quem me comprazo.”',
    uiNote:
      'Durante a abertura dos céus e a descida da pomba, nenhuma barra ou botão aparece. Apenas a frase sagrada na base inferior com sombra sutil.',
    durationSec: 8,
  },
  {
    beatNumber: 6,
    title: 'Cena 6 — O Peso Silencioso no Peito',
    contextCue: 'Você observa do terraço das fogueiras — ainda não entende, mas sente o coração arder',
    cameraDirection:
      'Close lento no rosto do discípulo anônimo junto ao mirante rochoso e ao banco de madeira à direita, com o reflexo das fogueiras e do rio ao fundo.',
    visualDescription:
      'Do alto das pedras junto ao fogo, o discípulo não compreende o alcance de tudo o que viu. Não há explicação teológica na mente — apenas uma quietude estranha e uma certeza quente no peito de que tudo antes daquela manhã era espera.',
    audioDirection:
      'A trilha retorna quase a um sussurro de harpa e vento; ouve-se o batimento calmo e a respiração contida.',
    subtitle: undefined,
    uiNote:
      'Silêncio visual total de legendas (3 segundos de pura contemplação).',
    durationSec: 5.5,
  },
  {
    beatNumber: 7,
    title: 'Cena 7 — No Dia Seguinte',
    contextCue: 'Dia 2 · Do terraço junto a João e André, vocês veem Jesus passar e O seguem em silêncio',
    intertitle: {
      kicker: 'Passagem de Tempo · João 1:35–37',
      heading: 'No Dia Seguinte',
      subtext: 'João está junto a você e André quando Jesus torna a passar pela margem',
    },
    cameraDirection:
      'Transição por dissolvência luminosa. Plano médio acompanhando João no terraço ao lado de dois discípulos; câmera desliza devagar enquanto vocês descem para seguir os passos de Jesus pelo gramado da margem.',
    visualDescription:
      'Manhã do dia seguinte. João está parado junto ao discípulo anônimo e André. Jesus passa pela campina dourada junto ao rio adiante. João torna a fitá-Lo e pronuncia as mesmas palavras. Sem combinarem nada, você e André deixam João para trás e passam a caminhar atrás de Jesus em silêncio.',
    audioDirection:
      'Passos leves na areia e poeira seca. A fala de João ecoa mais íntima, dirigida agora a apenas dois corações.',
    speaker: 'João Batista',
    scriptureRef: 'João 1:35-37',
    subtitle: '“Eis o Cordeiro de Deus.”',
    uiNote:
      'Legenda mínima apenas na frase de João; nos segundos seguintes de caminhada atrás de Jesus, a tela fica limpa.',
    durationSec: 7.5,
  },
  {
    beatNumber: 8,
    title: 'Cena 8 — “Que buscais?”',
    contextCue: 'Na clareira da margem, Jesus para, volta-se para você e André e faz a primeira pergunta',
    cameraDirection:
      'Travelling lento pelas costas dos dois discípulos. Jesus para diante da grande oliveira na clareira, vira-se com serenidade e a câmera o enquadra contra o rio e os penhascos ao fundo.',
    visualDescription:
      'Jesus interrompe o passo, volta o rosto para vocês dois sob a luz oblíqua da manhã e pergunta com mansidão direta. A cena congela num silêncio respeitoso e vivo, aguardando a primeira palavra do jogador.',
    audioDirection:
      'A trilha sustenta uma única corda quente em suspensão aberta, esperando a resposta do coração.',
    speaker: 'Jesus',
    scriptureRef: 'João 1:38',
    subtitle: '“Que buscais?”',
    uiNote:
      'A legenda permanece sutil na base esquerda; apenas o pequeno balão de escolha do jogador surge com borda fina no canto inferior direito, sem cobrir rostos nem o centro da cena.',
    durationSec: 6,
    isFinalChoiceBeat: true,
  },
];

export const CUTSCENE_FINAL_CHOICES: DialogueChoice[] = [
  {
    id: 'c_jordao_verdade',
    text: '“Rabbi, onde moras?” (Buscar a verdade)',
    motivation: 'verdade',
    reflection:
      'No Jordão, você seguiu buscando luz para as perguntas antigas da mente.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c_jordao_compaixao',
    text: '“Rabbi, onde moras?” (Buscar consolo para os feridos)',
    motivation: 'compaixao',
    reflection:
      'No Jordão, você seguiu carregando a ferida e a espera do seu povo.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c_jordao_temor',
    text: '“Rabbi... onde moras?” (Caminhar com reverência)',
    motivation: 'temor',
    reflection:
      'No Jordão, você se aproximou em reverência hesitante, sem se julgar digno.',
    nextNodeId: 'a1_f1_jordao_3',
  },
  {
    id: 'c_jordao_pertenca',
    text: '“Rabbi, onde moras?” (Encontrar um lugar para permanecer)',
    motivation: 'pertenca',
    reflection:
      'No Jordão, você seguiu porque Sua voz soou como abrigo.',
    nextNodeId: 'a1_f1_jordao_3',
  },
];

export const INTERFACE_DIRECTION_NOTE =
  'Durante os 8 blocos da cutscene de abertura, a interface permanece invisível nos momentos puramente contemplativos (Cenas 1, 2 e 6) e reduzida a uma legenda tipográfica limpa sem caixas ou bordas na margem inferior nos momentos de fala (Cenas 3, 4, 5 e 7). Apenas na Cena 8, após o silêncio de "Que buscais?", surge o balão compacto de escolha com borda sutil no quadrante inferior direito, mantendo os rostos e o centro do enquadramento 100% desobstruídos.';
