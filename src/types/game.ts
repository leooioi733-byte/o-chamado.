export type ScreenState =
  | 'TITLE'
  | 'CHARACTER_CREATION'
  | 'OPENING_CUTSCENE'
  | 'FOLLOW_JESUS'
  | 'SECOND_CUTSCENE'
  | 'THIRD_CUTSCENE'
  | 'PLAYING';

export type GenderOption = 'masculino' | 'feminino';

export type BeardStyle =
  | 'sem_barba'
  | 'curta'
  | 'cheia'
  | 'patriarca';

export type HairStyle =
  | 'curto_ondulado'
  | 'longo_ombros'
  | 'preso_faixa'
  | 'cachos_naturais'
  | 'curtissimo'
  | 'trancado_veu';

export interface CharacterConfig {
  name: string;
  gender: GenderOption;
  beardStyle: BeardStyle;
  hairStyle: HairStyle;
  skinTone: string;
  hairColor: string;
  tunicColor: string;
  cloakColor: string;
}

export type MotivationKey =
  | 'verdade'
  | 'compaixao'
  | 'temor'
  | 'pertenca';

export interface MotivationProfile {
  verdade: number;
  compaixao: number;
  temor: number;
  pertenca: number;
}

export interface JournalEntry {
  sceneId: string;
  actTitle: string;
  phaseTitle: string;
  choiceText: string;
  motivation: MotivationKey;
  reflection: string;
}

export interface SecondCutsceneConsequences {
  helpedWidow?: boolean;
  wellPace?: 'careful' | 'hurried';
}

export interface SaveState {
  character: CharacterConfig;
  currentNodeId: string;
  motivations: MotivationProfile;
  history: JournalEntry[];
  completedNodeIds: string[];
  secondCutsceneConsequences?: SecondCutsceneConsequences;
  updatedAt: string;
}

export type SceneBackdropKey =
  | 'dawn_shore'
  | 'jordan_river'
  | 'first_day_dwelling'
  | 'galilee_waters';

export type SpeakerRole =
  | 'narrator'
  | 'player'
  | 'jesus'
  | 'john_baptist'
  | 'andrew'
  | 'peter'
  | 'philip'
  | 'nathanael'
  | 'mary';

export interface DialogueChoice {
  id: string;
  text: string;
  motivation: MotivationKey;
  reflection: string;
  nextNodeId: string;
}

export interface DynamicCallbackVariant {
  dominantMotivation: MotivationKey;
  text: string;
}

export interface StoryNode {
  id: string;
  actNumber: 1 | 2 | 3 | 4;
  actTitle: string;
  phaseTitle: string;
  scriptureRef: string;
  backdrop: SceneBackdropKey;
  speaker: SpeakerRole;
  speakerLabel?: string;
  paragraphs: string[];
  dynamicCallbacks?: DynamicCallbackVariant[];
  choices?: DialogueChoice[];
  nextNodeId?: string;
  isActEnd?: boolean;
  isJourneyEnd?: boolean;
}

export interface PhaseBlueprint {
  phaseNumber: string;
  title: string;
  scripture: string;
  setting: string;
  summary: string;
  motivationEcho: string;
  playableNodeId?: string;
}

export interface ActBlueprint {
  actNumber: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  theme: string;
  phases: PhaseBlueprint[];
}
