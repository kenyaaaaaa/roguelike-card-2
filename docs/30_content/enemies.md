0. 基本方針（重要）

敵の行動は すべて TimelineIcon として表現する

敵は Effectを即時実行しない

行動内容は Icon.payload（Effect[]） に積まれ、Executeで解決される

敵の「意図表示」は UI 用メタ情報であり、ロジックとは分離する

Status と Timeline干渉（SlotEffect / Distortion）は完全分離



敵speed設計

敵のテンポは EnemyAction.ct（baseCt）で設計し、enemy speed は補助とする。

baseCt は原則4段階（18/28/40/55）から選ぶ。例外はボスのみ（12/70）。

複数回行動は「別アイコン複数回」を基本とし、hits は例外（割り込み余地を減らしたい時のみ）とする

敵speedは「個体の俊敏さ」を表す補助パラメータであり、行動テンポは主に各 EnemyAction の baseCt で設計する。

speedレンジ：

通常敵：-10〜+20

エリート：+10〜+35

ボス：+20〜+50（例外で+60まで）

状態異常（Haste/Slow）は ±10/stack を基準とし、speedレンジはこの基準値に対して過度に大きくしない。




1. EnemyDefinition（敵個体定義）
export type EnemyDefinition = {
  id: EnemyId
  name: string
  maxHp: number

  /**
   * 敵の素早さ（補助値）
   * CT計算式：
   * scheduledCt = max(minCt, baseCt * 100 / (100 + speed))
   */
  speed: number

  tags?: EnemyTag[]

  /**
   * 次に使う Move を決定するAI
   * Move は「このターンに予約する行動束」
   */
  ai: EnemyAI

  /**
   * 行動定義の辞書
   */
  moves: Record<EnemyMoveId, EnemyMove>

  /**
   * ボス専用：Timeline干渉
   */
  distortion?: DistortionSpec
}

2. EnemyMove（行動束）

1ターンに予約される行動の集合

「複数回行動」は actions を複数持つことで表現

hits は例外（割り込み余地を減らしたい時のみ）

export type EnemyMove = {
  id: EnemyMoveId
  name: string

  /**
   * このMoveが選ばれたとき、
   * TimelineIcon を複数生成する
   */
  actions: EnemyAction[]

  /**
   * 使用条件（任意）
   */
  condition?: Condition
}

3. EnemyAction（TimelineIcon生成単位）

EnemyAction = 1 Icon = 1回のExecute

export type EnemyAction = {
  /**
   * baseCt（設計値）
   * 実際のctは speed / minCt を考慮して算出される
   */
  baseCt: number

  /**
   * 下限CT（なければ0）
   * 予約時に TimelineIcon.minCtFrozen にコピー
   */
  minCt?: number

  /**
   * UI用の「次の行動表示」
   * ロジックでは参照しない
   */
  intent: EnemyIntent

  /**
   * Execute時に処理される Effect 群
   * すべて Effect解決モデルを通す
   */
  effects: Effect[]
}

4. EnemyIntent（UI専用）
export type EnemyIntent =
  | { type: 'attack'; amount: number; hits?: number }
  | { type: 'buff'; label: string }
  | { type: 'debuff'; label: string }
  | { type: 'special'; label: string }
  | { type: 'idle' }


数値は参考表示

実ダメージ・状態付与は effects 側が唯一の真実

5. EnemyAI（Move選択）
export type EnemyAI =
  | { type: 'pattern'; sequence: EnemyMoveId[] }
  | { type: 'random'; pool: EnemyMoveId[]; avoidRepeat?: boolean }
  | { type: 'weighted'; pool: { id: EnemyMoveId; w: number }[]; avoidRepeat?: boolean }
  | { type: 'priority'; pool: EnemyMoveId[] }


Cleanup フェーズで次の Move を確定

Read フェーズで intent を表示

6. TimelineIcon 生成ルール（敵側）

EnemyAction → TimelineIcon 変換時：

const scheduledCt = max(
  minCt ?? 0,
  baseCt * 100 / (100 + enemy.speed)
)

icon = {
  owner: { type: 'enemy', index },
  source: { type: 'enemyAction', moveId, actionIndex },
  baseCt,
  ct: scheduledCt,
  minCtFrozen: minCt ?? 0,
  payload: effects,
  slotEffects: []
}


ct が唯一の真実

SlotEffect は「注釈」でしかない

7. Distortion（歪曲）

ボス専用

TimelineIcon を直接触らない

必ず Effect（CtChange / CancelAction 等）を発行する

export type DistortionSpec = {
  cadence?: { type: 'everyNTurns'; n: number; offset?: number }
  triggers?: DistortionTrigger[]
  maxPerTurn?: 1 | 2
  pool: DistortionId[]
  uiLabel?: string
}


// enemy.ts (migrated + updated for current spec)
//

// =====================
// Core Types
// =====================

export type EnemyId =
  | 'slime'
  | 'goblin'
  | 'knight'
  | 'berserker'
  | 'mage'
  | 'chrono_sentinel' // boss

export type EnemyMoveId = string
export type StatusId = string

export type CharacterTarget =
  | 'self'
  | 'player'
  | 'enemy'
  | { type: 'specific'; id: string }

export type DamageTarget =
  | CharacterTarget
  | 'allEnemies'
  | 'randomEnemy'

export type CtTarget =
  | 'nextEnemyIcon'
  | 'nextPlayerIcon'
  | 'allEnemyIcons'
  | { type: 'icon'; iconId: string }

export type ActionTarget =
  | 'nextEnemyIcon'
  | 'nextPlayerIcon'
  | { type: 'icon'; iconId: string }

export type ResourceType = 'HP' | 'AP' | 'FP'

export type Condition =
  | { type: 'always' }
  | { type: 'turnAtLeast'; n: number }
  | { type: 'hpBelowPct'; pct: number } // 0.5=50%
  | { type: 'hasStatus'; target: CharacterTarget; status: StatusId }
  | { type: 'not'; cond: Condition }
  | { type: 'and'; conds: Condition[] }
  | { type: 'or'; conds: Condition[] }

// =====================
// IntentEffect / Effect (payload)
// =====================
// - Effect解決モデルに合わせて「意図」を積む
// - 多段は Damage.hits で表現（resolveで分解 or executeで反復）

export type IntentEffect =
  | {
      kind: 'Damage'
      base: number
      target: DamageTarget
      hits?: number // ★追加：多段（例外用途）
    }
  | { kind: 'Heal'; base: number; target: CharacterTarget }
  | { kind: 'CtChange'; delta: number; target: CtTarget }
  | { kind: 'CancelAction'; target: ActionTarget }
  | { kind: 'ApplyStatus'; statusId: StatusId; stacks: number; target: CharacterTarget }
  | { kind: 'RemoveStatus'; statusId: StatusId; target: CharacterTarget }
  | { kind: 'GainResource'; resource: ResourceType; amount: number; target: CharacterTarget }
  | { kind: 'LoseResource'; resource: ResourceType; amount: number; target: CharacterTarget }
  | { kind: 'Draw'; count: number; target: 'player' }
  | { kind: 'Discard'; count: number; target: 'player'; reason: 'effect' }
  | {
      kind: 'SetEnemyNextMove'
      // resolve時に enemyIndex を確定させる。sourceが敵アイコンなら self を拾える
      target: { type: 'enemy'; index: number } | 'selfEnemy'
      moveId: EnemyMoveId
      mode?: 'replace' | 'ignoreIfPresent' // default: replace
    }

export type Effect = IntentEffect

// UI intent (display only; logic truth is effects)
export type EnemyIntent =
  | { type: 'attack'; amount: number; hits?: number }
  | { type: 'buff'; label: string }
  | { type: 'debuff'; label: string }
  | { type: 'special'; label: string }
  | { type: 'idle' }

// =====================
// Enemy Actions / Moves / AI
// =====================

export type EnemyAction = {
  baseCt: number
  minCt?: number
  intent: EnemyIntent
  effects: Effect[]
}

export type EnemyMove = {
  id: EnemyMoveId
  name: string
  actions: EnemyAction[]
  condition?: Condition
}

export type EnemyAI =
  | { type: 'pattern'; sequence: EnemyMoveId[] }
  | { type: 'random'; pool: EnemyMoveId[]; avoidRepeat?: boolean }
  | { type: 'weighted'; pool: { id: EnemyMoveId; w: number }[]; avoidRepeat?: boolean }
  | { type: 'priority'; pool: EnemyMoveId[] }

// =====================
// Distortion (boss only)
// =====================

export type DistortionId =
  | 'delayFastestPlayerIcon'
  | 'lockNextPlayerIcon'
  | 'swapTwoPlayerIcons'
  | 'raiseMinCTThisTurn'

export type DistortionTrigger =
  | { type: 'apSpentAtLeast'; n: number }
  | { type: 'ctCardsQueuedAtLeast'; n: number }
  | { type: 'minPlayerCTBelowOrEqual'; ct: number }

export type DistortionSpec = {
  cadence?: { type: 'everyNTurns'; n: number; offset?: number }
  triggers?: DistortionTrigger[]
  maxPerTurn?: 1 | 2
  pool: DistortionId[]
  uiLabel?: string
}

// =====================
// EnemyDefinition
// =====================
//
// speed ranges (guideline):
// - normal: -10..+20
// - elite : +10..+35
// - boss  : +20..+50 (exception +60)
// baseCt is the main tempo; speed is auxiliary.

export type EnemyDefinition = {
  id: EnemyId
  name: string
  maxHp: number
  speed: number
  ai: EnemyAI
  moves: Record<EnemyMoveId, EnemyMove>
  distortion?: DistortionSpec
}

// =====================
// Example Enemies (updated)
// =====================

export const enemies: Record<EnemyId, EnemyDefinition> = {
  // normal (-10..+20)
  slime: {
    id: 'slime',
    name: 'Slime',
    maxHp: 28,
    speed: -5,
    ai: { type: 'pattern', sequence: ['slam'] },
    moves: {
      slam: {
        id: 'slam',
        name: 'Slam',
        actions: [
          {
            baseCt: 40, // guideline bucket: 40
            intent: { type: 'attack', amount: 6 },
            effects: [{ kind: 'Damage', target: 'player', base: 6 }],
          },
        ],
      },
    },
  },

  // normal
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    maxHp: 34,
    speed: 12,
    ai: { type: 'pattern', sequence: ['double_stab'] },
    moves: {
      double_stab: {
        id: 'double_stab',
        name: 'Double Stab',
        actions: [
          // 複数回行動は「別アイコン2回」が基本
          {
            baseCt: 18,
            intent: { type: 'attack', amount: 4 },
            effects: [{ kind: 'Damage', target: 'player', base: 4 }],
          },
          {
            baseCt: 28,
            intent: { type: 'attack', amount: 4 },
            effects: [{ kind: 'Damage', target: 'player', base: 4 }],
          },
        ],
      },
    },
  },

  // normal
  knight: {
    id: 'knight',
    name: 'Knight',
    maxHp: 52,
    speed: 5,
    ai: { type: 'pattern', sequence: ['guard_then_strike'] },
    moves: {
      guard_then_strike: {
        id: 'guard_then_strike',
        name: 'Guard → Strike',
        actions: [
          {
            baseCt: 28,
            intent: { type: 'buff', label: 'Gain 8 block' },
            // NOTE: StatusIdはプロジェクトの最終表に合わせて後で確定（ここは移植の仮置き）
            effects: [{ kind: 'ApplyStatus', target: 'self', statusId: 'block', stacks: 8 }],
          },
          {
            baseCt: 55,
            intent: { type: 'attack', amount: 7 },
            effects: [{ kind: 'Damage', target: 'player', base: 7 }],
          },
        ],
      },
    },
  },

  // elite (+10..+35)
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    maxHp: 60,
    speed: 22,
    ai: { type: 'pattern', sequence: ['roar_then_slash'] },
    moves: {
      roar_then_slash: {
        id: 'roar_then_slash',
        name: 'Roar → Slash → Slash',
        actions: [
          {
            baseCt: 28,
            intent: { type: 'buff', label: 'Strength +2' },
            // NOTE: 恒常STRを採用しない方針なら、後で別表現に置換
            effects: [{ kind: 'ApplyStatus', target: 'self', statusId: 'strength', stacks: 2 }],
          },
          {
            baseCt: 40,
            intent: { type: 'attack', amount: 6 },
            effects: [{ kind: 'Damage', target: 'player', base: 6 }],
          },
          {
            baseCt: 55,
            intent: { type: 'attack', amount: 6 },
            effects: [{ kind: 'Damage', target: 'player', base: 6 }],
          },
        ],
      },
    },
  },

  // elite
mage: {
  id: 'mage',
  name: 'Mage',
  maxHp: 46,
  speed: 18, // eliteレンジ内
  ai: { type: 'pattern', sequence: ['charge', 'big_blast'] },
  moves: {
    charge: {
      id: 'charge',
      name: 'Charge',
      actions: [
        {
          baseCt: 28,
          intent: { type: 'special', label: 'Prepares a big attack' },
          effects: [
            { kind: 'ApplyStatus', target: 'player', statusId: 'vulnerable', stacks: 1 },
            // SetEnemyNextMove は不要（patternが保証する）
          ],
        },
      ],
    },
    big_blast: {
      id: 'big_blast',
      name: 'Big Blast',
      actions: [
        {
          baseCt: 55,
          intent: { type: 'attack', amount: 16 },
          effects: [{ kind: 'Damage', target: 'player', base: 16 }],
        },
      ],
    },
  },
},

  // boss (+20..+50)
  chrono_sentinel: {
    id: 'chrono_sentinel',
    name: 'The Chrono Sentinel',
    maxHp: 180,
    speed: 38,

    ai: {
      type: 'priority',
      pool: [
        'enrage',
        'charge_and_mark',
        'shear_guard_shear',
        'triple_shear',
        'random_tactic',
      ],
    },

    moves: {
      // 例外：hits（割り込み余地を減らしたい時のみ）
      shear_guard_shear: {
        id: 'shear_guard_shear',
        name: 'Shear → Guard → Shear',
        actions: [
          {
            baseCt: 18,
            intent: { type: 'attack', amount: 5, hits: 2 },
            effects: [{ kind: 'Damage', target: 'player', base: 5, hits: 2 }],
          },
          {
            baseCt: 28,
            intent: { type: 'buff', label: 'Gain 12 block' },
            effects: [{ kind: 'ApplyStatus', target: 'self', statusId: 'block', stacks: 12 }],
          },
          {
            baseCt: 40,
            intent: { type: 'attack', amount: 7 },
            effects: [{ kind: 'Damage', target: 'player', base: 7 }],
          },
        ],
      },

      // 複数回行動（別アイコン3回）
      triple_shear: {
        id: 'triple_shear',
        name: 'Triple Shear',
        actions: [
          { baseCt: 18, intent: { type: 'attack', amount: 4 }, effects: [{ kind: 'Damage', target: 'player', base: 4 }] },
          { baseCt: 28, intent: { type: 'attack', amount: 4 }, effects: [{ kind: 'Damage', target: 'player', base: 4 }] },
          { baseCt: 40, intent: { type: 'attack', amount: 4 }, effects: [{ kind: 'Damage', target: 'player', base: 4 }] },
        ],
      },

      // 溜め：次Move固定（AIメモリ）＋脆弱で予告
      charge_and_mark: {
        id: 'charge_and_mark',
        name: 'Charge Core',
        actions: [
          {
            baseCt: 28,
            intent: { type: 'special', label: 'Charges a devastating combo' },
            effects: [
              { kind: 'ApplyStatus', target: 'player', statusId: 'vulnerable', stacks: 1 },
              { kind: 'SetEnemyNextMove', target: 'selfEnemy', moveId: 'big_blast_combo', mode: 'replace' },
            ],
          },
        ],
      },

      // 大技束：弱体 → 超火力
      big_blast_combo: {
        id: 'big_blast_combo',
        name: 'Chrono Blast Combo',
        actions: [
          {
            baseCt: 18,
            intent: { type: 'debuff', label: 'Weak (1 turn)' },
            effects: [{ kind: 'ApplyStatus', target: 'player', statusId: 'weak', stacks: 1 }],
          },
          {
            baseCt: 55,
            intent: { type: 'attack', amount: 22 },
            effects: [{ kind: 'Damage', target: 'player', base: 22 }],
          },
        ],
      },

      // 条件分岐：HP50%以下
      enrage: {
        id: 'enrage',
        name: 'Overclock',
        condition: { type: 'hpBelowPct', pct: 0.5 },
        actions: [
          {
            baseCt: 18,
            intent: { type: 'buff', label: 'Strength +3 (permanent)' },
            effects: [{ kind: 'ApplyStatus', target: 'self', statusId: 'strength', stacks: 3 }],
          },
          {
            baseCt: 28,
            intent: { type: 'buff', label: 'Gain 10 block' },
            effects: [{ kind: 'ApplyStatus', target: 'self', statusId: 'block', stacks: 10 }],
          },
        ],
      },

      random_tactic: {
        id: 'random_tactic',
        name: 'Unstable Tactic',
        actions: [
          {
            baseCt: 40,
            intent: { type: 'special', label: 'Adapts' },
            effects: [
              { kind: 'ApplyStatus', target: 'self', statusId: 'block', stacks: 8 },
              { kind: 'ApplyStatus', target: 'player', statusId: 'vulnerable', stacks: 1 },
            ],
          },
        ],
      },
    },

    distortion: {
      uiLabel: 'Distortion',
      cadence: { type: 'everyNTurns', n: 2, offset: 0 },
      triggers: [
        { type: 'apSpentAtLeast', n: 2 },
        { type: 'ctCardsQueuedAtLeast', n: 3 },
        { type: 'minPlayerCTBelowOrEqual', ct: 10 },
      ],
      maxPerTurn: 1,
      pool: ['delayFastestPlayerIcon', 'lockNextPlayerIcon', 'swapTwoPlayerIcons', 'raiseMinCTThisTurn'],
    },
  },
}

/**
 * =====================
 * Engine-side notes (implementation hooks)
 * =====================
 *
 * 1) SetEnemyNextMove
 * - Resolve: 'selfEnemy' の場合、source（enemy icon / enemy move）から enemyIndex を確定
 * - Execute: state.enemies[enemyIndex].aiMem.nextMoveOverride = moveId (modeに従う)
 * - Consume: decideNextMove() が nextMoveOverride を優先し、採用したら消す（1回限り）
 *
 * 2) Damage hits
 * - Resolve案A（推奨）：ResolvedEffectを hits 回に展開してキューへ（FIFO維持）
 * - Execute案B：executeDamage が hits ループで DamageApplied を複数emit
 *
 * ※ Block/Armorの消費や OnTakeDamage 連鎖を「1ヒットごと」に発火させたいなら、
 *    Resolveで分解（案A）のほうがきれい。
 */
