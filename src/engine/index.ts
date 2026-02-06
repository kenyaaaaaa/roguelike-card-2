export type SceneId =
  | 'S00_BOOT'
  | 'S01_TITLE'
  | 'S02_TITLE_OPTION'
  | 'S03_SAVE_SELECT'
  | 'S10_HUB'
  | 'S20_AREA_PROGRESS'
  | 'S21_EVENT'
  | 'S22_MINIGAME'
  | 'S23_SHOP'
  | 'S24_SHRINE'
  | 'S30_BATTLE'
  | 'S31_BATTLE_REWARD'
  | 'S70_GAMEOVER_DEATH'
  | 'S71_RUN_RESULT';

export type EngineError = {
  code: string;
  message: string;
  data?: unknown;
};

export type EffectRequest =
  | { type: 'SAVE_PROFILE' }
  | { type: 'SAVE_RUN' }
  | { type: 'PLAY_SFX'; id: string }
  | { type: 'PLAY_BGM'; id: string }
  | { type: 'SHOW_TOAST'; text: string };

export type UIAction = {
  type: string;
  payload?: Record<string, unknown>;
};

export type ActionEnvelope = {
  clientSeq: number;
  action: UIAction;
};

export type ExecutionLog = {
  executionId: string;
  scope: 'TURN_END' | 'BATTLE_END';
  events: ExecEvent[];
};

export type ExecEventBase = {
  seq: number;
  tags: string[];
};

export type ExecEvent = ExecEventBase & {
  kind: 'EFFECT_CANCELLED';
  note: string;
};

export type State = {
  scene: SceneId;
  ui: {
    modal: 'PAUSE' | null;
  };
  client: {
    lastProcessedSeq: number;
  };
};

export type StepResult = {
  nextState: State;
  requests: EffectRequest[];
  executionLog: ExecutionLog | null;
  error: EngineError | null;
};

const INITIAL_STATE: State = {
  scene: 'S00_BOOT',
  ui: {
    modal: null,
  },
  client: {
    lastProcessedSeq: -1,
  },
};

export const init = (): State => {
  return {
    scene: INITIAL_STATE.scene,
    ui: { ...INITIAL_STATE.ui },
    client: { ...INITIAL_STATE.client },
  };
};

export const step = (state: State, envelope: ActionEnvelope): StepResult => {
  if (envelope.clientSeq >= state.client.lastProcessedSeq) {
    return {
      nextState: state,
      requests: [],
      executionLog: null,
      error: null,
    };
  }

  const nextState: State = {
    ...state,
    ui: { ...state.ui },
    client: {
      ...state.client,
      lastProcessedSeq: envelope.clientSeq,
    },
  };

  return {
    nextState,
    requests: [],
    executionLog: null,
    error: null,
  };
};
