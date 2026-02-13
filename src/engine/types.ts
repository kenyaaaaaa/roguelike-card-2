// src/engine/types.ts
// Single source of truth for UI↔Engine contract types.
// Keep this file dependency-free to avoid circular import explosions.

//////////////////////
// 0) Small helpers
//////////////////////

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type IdString<B extends string> = Brand<string, B>;

//////////////////////
// 1) IDs / Enums (leaf types)
//////////////////////

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

export type BattlePhase = 'read' | 'plan' | 'distortion' | 'execute' | 'cleanup';

export type PlayerId = IdString<'PlayerId'>;
export type EnemyId = IdString<'EnemyId'>;
export type CardId = IdString<'CardId'>;
export type RelicId = IdString<'RelicId'>;
export type PlayerAbilityId = IdString<'PlayerAbilityId'>;
export type StatusId = IdString<'StatusId'>;

export type CardUid = IdString<'CardUid'>;
export type IconId = IdString<'IconId'>;

//////////////////////
// 2) Engine error / requests (contract)
//////////////////////

export type EngineErrorCode =
  | 'ACTION_NOT_ALLOWED'
  | 'INVALID_PAYLOAD'
  | 'INVARIANT_BROKEN'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN';

export type EngineError = {
  code: EngineErrorCode;
  message: string;
  data?: unknown;
};

export type EffectRequest =
  | { type: 'SAVE_PROFILE' }
  | { type: 'SAVE_RUN' }
  | { type: 'PLAY_SFX'; id: string }
  | { type: 'PLAY_BGM'; id: string }
  | { type: 'SHOW_TOAST'; text: string };

//////////////////////
// 3) UIAction (contract-first, strict union)
//////////////////////

// Title / boot
export type UIActionBootDone = { type: 'BOOT_DONE' };

export type UIActionTitleStart = { type: 'TITLE_START' };
export type UIActionTitleContinue = { type: 'TITLE_CONTINUE' };
export type UIActionTitleOpenOptions = { type: 'TITLE_OPEN_OPTIONS' };
export type UIActionTitleBack = { type: 'TITLE_BACK' };

export type UIActionOptionsSet = {
  type: 'OPTIONS_SET';
  payload: {
    // keep open; you can tighten later
    key: string;
    value: unknown;
  };
};
export type UIActionOptionsBack = { type: 'OPTIONS_BACK' };

// Save select
export type UIActionSaveSelectSlot = {
  type: 'SAVE_SELECT_SLOT';
  payload: { slotIndex: number };
};
export type UIActionSaveCreateSlot = {
  type: 'SAVE_CREATE_SLOT';
  payload: { slotIndex: number };
};
export type UIActionSaveDeleteSlot = {
  type: 'SAVE_DELETE_SLOT';
  payload: { slotIndex: number };
};

// Pause (modal; scene does NOT change)
export type UIActionPauseOpen = { type: 'PAUSE_OPEN' };
export type UIActionPauseResume = { type: 'PAUSE_RESUME' };
export type UIActionPauseQuitToTitle = { type: 'PAUSE_QUIT_TO_TITLE' };

// Hub
export type UIActionHubSelectPlayer = {
  type: 'HUB_SELECT_PLAYER';
  payload: { playerId: PlayerId };
};
export type UIActionHubUpgradeMeta = {
  type: 'HUB_UPGRADE_META';
  payload: { upgradeId: string };
};
export type UIActionHubEquipAbility = {
  type: 'HUB_EQUIP_ABILITY';
  payload: { slotIndex: number; abilityId: PlayerAbilityId | null };
};
export type UIActionHubLaunchRun = { type: 'HUB_LAUNCH_RUN' };
export type UIActionHubBackToTitle = { type: 'HUB_BACK_TO_TITLE' };

// Area progress
export type UIActionAreaNext = { type: 'AREA_NEXT' };
export type UIActionAreaOpenMap = { type: 'AREA_OPEN_MAP' };
export type UIActionAreaCloseMap = { type: 'AREA_CLOSE_MAP' };

// Event / Minigame (minigame is allowed to reuse EVENT_CONFIRM per contract)
export type UIActionEventChoose = {
  type: 'EVENT_CHOOSE';
  payload: { choiceId: string };
};
export type UIActionEventConfirm = { type: 'EVENT_CONFIRM' };

// Shop
export type UIActionShopBuy = {
  type: 'SHOP_BUY';
  payload: { itemId: string };
};
export type UIActionShopSellCard = {
  type: 'SHOP_SELL_CARD';
  payload: { cardUid: CardUid };
};
export type UIActionShopLeave = { type: 'SHOP_LEAVE' };

// Shrine
export type UIActionShrineLockCard = {
  type: 'SHRINE_LOCK_CARD';
  payload: { cardUid: CardUid };
};
export type UIActionShrineUnlockCard = {
  type: 'SHRINE_UNLOCK_CARD';
  payload: { cardUid: CardUid };
};
export type UIActionShrineConfirm = { type: 'SHRINE_CONFIRM' };
export type UIActionShrineLeave = { type: 'SHRINE_LEAVE' };

// Battle
export type UIActionBattleConfirmRead = { type: 'BATTLE_CONFIRM_READ' };

export type UIActionBattlePlayCard = {
  type: 'BATTLE_PLAY_CARD';
  payload: {
    cardUid: CardUid;
    // targets are intentionally loose here; resolver/validator will hard-check
    target?: { kind: 'player' } | { kind: 'enemy'; index: number } | null;
  };
};

export type UIActionBattleSetAbility = {
  type: 'BATTLE_SET_ABILITY';
  payload: {
    abilityId: PlayerAbilityId;
    // optional target; validator decides if required
    target?: { kind: 'player' } | { kind: 'enemy'; index: number } | null;
  };
};

export type UIActionBattleUndoLast = { type: 'BATTLE_UNDO_LAST' };

export type UIActionBattleEndPlan = { type: 'BATTLE_END_PLAN' };

// Contract: skip is state-invariant (UI-only progression); engine returns same nextState.
export type UIActionBattleSkipAnimation = { type: 'BATTLE_SKIP_ANIMATION' };

// Battle reward / result
export type UIActionRewardPickCard = {
  type: 'REWARD_PICK_CARD';
  payload: { cardId: CardId };
};
export type UIActionRewardSkipCard = { type: 'REWARD_SKIP_CARD' };
export type UIActionRewardConfirm = { type: 'REWARD_CONFIRM' };

export type UIActionResultConfirm = { type: 'RESULT_CONFIRM' };

// Exhaustive union (add here first; acceptTable enforces legality)
export type UIAction =
  | UIActionBootDone
  | UIActionTitleStart
  | UIActionTitleContinue
  | UIActionTitleOpenOptions
  | UIActionTitleBack
  | UIActionOptionsSet
  | UIActionOptionsBack
  | UIActionSaveSelectSlot
  | UIActionSaveCreateSlot
  | UIActionSaveDeleteSlot
  | UIActionPauseOpen
  | UIActionPauseResume
  | UIActionPauseQuitToTitle
  | UIActionHubSelectPlayer
  | UIActionHubUpgradeMeta
  | UIActionHubEquipAbility
  | UIActionHubLaunchRun
  | UIActionHubBackToTitle
  | UIActionAreaNext
  | UIActionAreaOpenMap
  | UIActionAreaCloseMap
  | UIActionEventChoose
  | UIActionEventConfirm
  | UIActionShopBuy
  | UIActionShopSellCard
  | UIActionShopLeave
  | UIActionShrineLockCard
  | UIActionShrineUnlockCard
  | UIActionShrineConfirm
  | UIActionShrineLeave
  | UIActionBattleConfirmRead
  | UIActionBattlePlayCard
  | UIActionBattleSetAbility
  | UIActionBattleUndoLast
  | UIActionBattleEndPlan
  | UIActionBattleSkipAnimation
  | UIActionRewardPickCard
  | UIActionRewardSkipCard
  | UIActionRewardConfirm
  | UIActionResultConfirm;

//////////////////////
// 4) clientSeq envelope / step result (contract)
//////////////////////

export type UIActionEnvelope = {
  clientSeq: number;
  action: UIAction;
};

export type EngineStepResult = {
  nextState: GameState;
  requests: EffectRequest[];
  // Present only when Execute actually ran (per contract). Use null for “not present”.
  executionLog: ExecutionLog | null;
  // Use null for “no error” (easier for UI).
  error: EngineError | null;
};

//////////////////////
// 5) ExecutionLog (contract)
//////////////////////

export type ActorRef = { kind: 'player' } | { kind: 'enemy'; index: number };

export type CardRef = { kind: 'card'; uid: CardUid };
export type IconRef = { kind: 'icon'; id: IconId };

export type SourceRef =
  | CardRef
  | IconRef
  | { kind: 'ability'; id: PlayerAbilityId }
  | { kind: 'enemyMove'; enemyIndex: number; moveId: string };

export type ExecEventBase = {
  seq: number; // 0..n-1 (UI does not sort)
  source: SourceRef;
  tags: string[];
};

export type ExecEvent =
  | (ExecEventBase & {
      kind: 'ICON_SCHEDULED';
      icon: IconRef;
      owner: ActorRef;
      baseCt: number;
      ct: number;
      minCt: number;
    })
  | (ExecEventBase & {
      kind: 'ICON_CT_CHANGED';
      icon: IconRef;
      before: number;
      after: number;
      reason:
        | 'HASTE'
        | 'SLOW'
        | 'SWAP'
        | 'DELAY'
        | 'ACCEL'
        | 'CLAMP_MIN'
        | 'OTHER';
    })
  | (ExecEventBase & { kind: 'ICON_EXECUTING'; icon: IconRef; owner: ActorRef })
  | (ExecEventBase & { kind: 'ICON_RESOLVED'; icon: IconRef; owner: ActorRef })
  | (ExecEventBase & {
      kind: 'HP_CHANGED';
      target: ActorRef;
      before: number;
      after: number;
      delta: number;
      nature: 'DAMAGE' | 'HEAL' | 'DRAIN' | 'SELF' | 'DOT';
    })
  | (ExecEventBase & {
      kind: 'FP_CHANGED';
      target: ActorRef;
      before: number;
      after: number;
      delta: number;
      nature: 'GAIN' | 'SPEND' | 'OTHER';
    })
  | (ExecEventBase & {
      kind: 'AP_CHANGED';
      target: ActorRef;
      before: number;
      after: number;
      delta: number;
      nature: 'GAIN' | 'SPEND' | 'LOCK' | 'UNLOCK' | 'OTHER';
    })
  | (ExecEventBase & {
      kind: 'STATUS_APPLIED';
      target: ActorRef;
      statusId: StatusId;
      beforeStack: number | null;
      afterStack: number | null;
      beforeDuration: number | null;
      afterDuration: number | null;
    })
  | (ExecEventBase & {
      kind: 'STATUS_REMOVED';
      target: ActorRef;
      statusId: StatusId;
    })
  | (ExecEventBase & {
      kind: 'STATUS_TICKED';
      target: ActorRef;
      statusId: StatusId;
      beforeDuration: number | null;
      afterDuration: number | null;
      note: string;
    })
  | (ExecEventBase & {
      kind: 'CARD_MOVED';
      card: CardRef;
      from: 'HAND' | 'DRAW' | 'DISCARD' | 'EXHAUST' | 'GENERATED';
      to: 'HAND' | 'DRAW' | 'DISCARD' | 'EXHAUST';
    })
  | (ExecEventBase & { kind: 'DRAW'; actor: ActorRef; count: number })
  | (ExecEventBase & { kind: 'TURN_ENDED'; turn: number })
  | (ExecEventBase & { kind: 'BATTLE_ENDED'; result: 'WIN' | 'LOSE' })
  | (ExecEventBase & { kind: 'EFFECT_CANCELLED'; note: string });

export type ExecutionLog = {
  executionId: string;
  scope: 'TURN_END' | 'BATTLE_END';
  events: ExecEvent[];
};

//////////////////////
// 6) Save stubs (keep minimal for now)
//////////////////////

export type ProfileSave = {
  schemaVersion: number;
  // expand later
  data: Record<string, unknown>;
};

export type RunSave = {
  schemaVersion: number;
  // expand later
  data: Record<string, unknown>;
};

//////////////////////
// 7) GameState (root)
// Keep it “just enough” and stable; tighten per-scene later.
//////////////////////

export type ClientState = {
  lastProcessedSeq: number;
};

export type UiModal = 'PAUSE' | null;

export type UiState = {
  modal: UiModal;
  // You can add e.g. mapOpen etc here later, but keep scene-truth in state.sceneId.
};

export type GameState = {
  sceneId: SceneId;

  client: ClientState;
  ui: UiState;

  // Save-related pointers / runtime data
  profile: ProfileSave;
  run: RunSave | null;

  // Scene payloads (loose now; each scene reducer can narrow internally)
  scene: Record<string, unknown>;

  // Battle snapshot can live here when in battle
  battle: BattleState | null;
};

//////////////////////
// 8) BattleState minimal (placeholder, expand in battle module)
//////////////////////

export type BattleState = {
  phase: BattlePhase;
  turn: number;

  // Keep core visible info; the battle module can hold detailed structures.
  player: Record<string, unknown>;
  enemies: Record<string, unknown>[];

  // timeline / icons
  timeline: Record<string, unknown>;

  // deterministic RNG pointers etc
  rng: Record<string, unknown>;
};

//////////////////////
// 9) Engine interface (optional, but convenient)
//////////////////////

export type Engine = {
  init: (profile: ProfileSave, maybeRun: RunSave | null) => GameState;
  step: (state: GameState, envelope: UIActionEnvelope) => EngineStepResult;
};
