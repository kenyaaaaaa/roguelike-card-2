import { isActionAccepted } from './step/acceptTable';
import type { SceneId, UIAction } from './types';
export type { SceneId, UIAction } from './types';

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
  sceneId: SceneId;
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
  sceneId: 'S00_BOOT',
  ui: {
    modal: null,
  },
  client: {
    lastProcessedSeq: -1,
  },
};

export const init = (): State => {
  return {
    sceneId: INITIAL_STATE.sceneId,
    ui: { ...INITIAL_STATE.ui },
    client: { ...INITIAL_STATE.client },
  };
};

export const step = (state: State, envelope: ActionEnvelope): StepResult => {
  if (envelope.clientSeq <= state.client.lastProcessedSeq) {
    return {
      nextState: state,
      requests: [],
      executionLog: null,
      error: null,
    };
  }

  if (!isActionAccepted(state.sceneId, envelope.action)) {
    return {
      nextState: state,
      requests: [],
      executionLog: null,
      error: {
        code: 'ACTION_REJECTED',
        message: `Action ${envelope.action.type} is not accepted in scene ${state.sceneId}.`,
        data: {
          sceneId: state.sceneId,
          action: envelope.action,
        },
      },
    };
  }

  const nextState: State = {
    ...state,
    sceneId: state.sceneId,
    ui: { ...state.ui },
    client: {
      ...state.client,
      lastProcessedSeq: envelope.clientSeq,
    },
  };

  if (state.sceneId === 'S00_BOOT' && envelope.action.type === 'BOOT_DONE') {
    nextState.sceneId = 'S01_TITLE';
  }

  return {
    nextState,
    requests: [],
    executionLog: null,
    error: null,
  };
};
