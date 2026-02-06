// =====================
// Card Tags (synergy only)
// =====================
export type CardTag =
  // timing (UI/filters/relic hooks)
  | 'CT'
  | 'INSTANT'
  // role
  | 'ATTACK'
  | 'BLOCK'
  | 'STATUS'
  | 'DRAW'
  | 'ECONOMY'
  | 'TIME'
  // targeting (minimal)
  | 'SINGLE'
  | 'AOE'
  // synergy (optional, few)
  | 'SETUP'
  | 'FINISHER'
  // discard / retain hooks (self-trigger markers)
  | 'ON_DISCARD' // このカードが捨てられた時に何か起きる想定（例：OnDiscardByEffect/TurnEndで発火）
  | 'ON_RETAIN'  // このカードが手札に残ってターン終了した時に何か起きる想定（OnTurnEndInHandで発火）

  // hand-time mechanics (self / UI hints)
  | 'FRESH'          // 引いたターン(手札に入った直後)が強い想定（OnDraw/OnEnterHand→強化、TurnEndで消える等）
  | 'CHARGE'         // 使わずにいると育つ想定（OnTurnEndInHand/OnDiscardByTurnEndで蓄積、使用時に消費）
  | 'DECAY'          // 時間経過で弱体化/劣化する想定（OnTurnStartInHand/OnTurnEndInHand等で減衰）

  // lifecycle / consumption intent
  | 'ONE_SHOT'       // 使い切り前提の設計ラベル（実処理はEffect/TriggerでExhaust等を行う）
  | 'CURSED'         // 呪い/不利益枠の目印（通常は availability.rarityPool:'cursed' と併用）

  // archetype / build hooks (not necessarily self-trigger)
  | 'DISCARD_SYNERGY' // 「捨てる」を軸にしたビルド参照用（レリック/イベント/報酬の重み付けなど）
  | 'DELAYED_PAYOFF'  // 遅いCTが報われる設計ラベル（OnIconExecuted等で報酬、重いカードの正当化）

  // archetype hooks (optional, future)
  | 'ARCHETYPE_LUKA'
  | 'ARCHETYPE_PLAGUE'
  | 'ARCHETYPE_BLOOD'

// =====================
// Availability (gating / pools)
// =====================
export type CardRarityPool = 'global' | 'class' | 'cursed'

export type CardAvailability = {
  /**
   * 出現プールの大枠
   * - global: 誰でも候補になり得る
   * - class: 原則そのキャラのプール（ただしイベント等で混ざる余地あり）
   * - cursed: 呪い/デメリット枠（専用演出や除去需要を作る）
   */
  rarityPool?: CardRarityPool

  /**
   * “専用”の判定（権限・出現制御）
   * - ここは「使える/出る」の制御だけ
   * - シナジー参照は tags でやる
   */
  characters?: PlayerId[] // 例: ['luka'] のみ 等

  /**
   * アンロック条件など（将来）
   * 例: 特定ボス撃破 / 実績 / 周回強化 など
   */
  unlockFlag?: string
}

// =====================
// Card Effects (placeholder)
//   - 既存のEffect/PlayerEffect設計に合わせて統一してOK
// =====================
export type Effect = PlayerEffect | EnemyEffect // ←君のエンジンの統一方針に合わせる

// =====================
// Card Upgrade
// =====================

/**
 * Upgrade は「差分パッチ」。
 *  - 元CardDefinitionを複製しない
 *  - 数値/CT/コスト/効果追加だけを最小で扱う
 *
 * effects を “部分更新” したくなったら、Effectに effectId を持たせて
 * effectsPatch を追加する（今は不要）。
 */
export type CardUpgrade = {
  /** 表示用。未指定なら "+" 推奨 */
  nameSuffix?: string // e.g. "+", "改"

  /**
   * 差分。undefined は「変更なし」
   * - costFp / baseCt / minCt は上書き
   * - effectsAdd は末尾追加（順序に意味があるゲームならここを明示）
   * - tagsAdd は将来のシナジー拡張用（基本は使わなくてOK）
   */
  patch: {
    costFp?: number
    baseCt?: number
    minCt?: number
    effectsAdd?: Effect[]
    tagsAdd?: CardTag[]
  }
}


// どの領域のカードが“反応能力”を持つか
export type CardTriggerScope =
  | 'HAND_ONLY'            // 手札のみ（安全）
  | 'IN_HAND_AND_DRAW'     // 手札 + 山札（やや派手）
  | 'IN_HAND_AND_DISCARD'  // 手札 + 捨て札（捨てビルド向け）
  | 'ALL_PILES'            // 手札 + 山札 + 捨て札（派手・危険）
export type CardTrigger =
  // =====================
  // Discard / Retain
  // =====================

  | 'OnDiscardByTurnEnd'    // ターン終了時の一括破棄（頻度高・弱め効果専用）
  | 'OnDiscardByEffect'     // 効果・指示による能動的な破棄（Discardビルドの主軸）
  | 'OnDiscardByOverflow'  // 手札上限超過による破棄（上限導入時のみ）
  | 'OnTurnEndInHand'      // 手札に残ったままターン終了（保留・仕込み用）

  // =====================
  // Hand entry
  // =====================

  | 'OnDraw'               // ドローで引いた瞬間（鮮度・即時強化向け）
  | 'OnEnterHand'          // 手札に入った瞬間（ドロー/生成/回収を包括）
                            // ※ OnDraw より広い概念

  // =====================
  // Use / Timeline
  // =====================

  | 'OnCardPlayed'         // カード使用が確定した瞬間（Planでコスト支払い後）
                            // 既存のエンジンイベントと統合しやすい
  | 'OnIconScheduled'      // CTカードが TimelineIcon として予約された瞬間
                            // 「予約したら〜」系ビルド、TIMEタグと相性◎
  | 'OnIconExecuted'       // そのカード由来の Icon が実行された瞬間
                            // 重いカード成功時の報酬設計向け

  // =====================
  // Card destination
  // =====================

  | 'OnExhaust'            // カードが除外領域に移動した瞬間
                            // 燃料・代償・不可逆リソース向け
  | 'OnShuffle'            // 捨て札が山札にシャッフルされた瞬間
                            // ループ対策・混ざると強化（※管理コスト高）

  // =====================
  // Turn boundary (danger)
  // =====================

  | 'OnTurnStartInHand';  // ターン開始時に手札にある
                            // 保留・仕込み用（毎ターン発火するため limit 必須）

// Trigger1個ぶんの定義
export type CardTriggerSpec = {
  trigger: CardTrigger

  // ★追加：発火範囲
  scope: CardTriggerScope

  // 反応時に起きること（基本は即時解決が無難）
  effects: Effect[]

  // バランス用の安全弁
  limit?: { type: 'perTurn'; n: number } | { type: 'perBattle'; n: number }
}



// =====================
// Card Definition
// =====================
export type CardKind = 'ct' | 'instant'

export type CardId = string

export type CardDefinition = {
  id: CardId
  name: string

  // costs
  costFp: number

  // timing
  kind: CardKind

  /**
   * CTカードのみ使用
   * baseCt: 計算元の重さ
   * minCt : 下限（なければ0）
   */
  baseCt?: number
  minCt?: number

  /**
   * 効果本体
   * - instant: Planで即時解決
   * - ct     : TimelineIcon.payloadとしてExecuteで解決
   */
  effects: Effect[]


  /**
   * シナジー参照用（レリック/イベント/フィルタ/UI）
   * ※「専用かどうか」はここに入れない
   */
  tags: CardTag[]

  /**
   * 出現/使用制御（専用・プール・アンロック）
   */
  availability?: CardAvailability

  /**
   * 表示/運用の補助（任意）
   */
  ui?: {
    description?: string
    artKey?: string
  }
  /** 強化定義（1回強化の想定） */
  upgrade?: CardUpgrade

  triggers?: CardTriggerSpec[]
}


// =====================
// Deck Instance (recommended)
// =====================

/**
 * デッキ/手札に入るのは「インスタンス」。
 * cardId は同じで、isUpgraded だけが違う。
 */
export type CardInstance = {
  uid: string // 同名カードが複数あるので一意IDが必要
  cardId: CardId
  isUpgraded?: boolean
}

// =====================
// Helper (how to apply upgrade)
// =====================

export const resolveCardDefinition = (base: CardDefinition, inst?: CardInstance): CardDefinition => {
  if (!inst?.isUpgraded || !base.upgrade) return base

  const { patch, nameSuffix } = base.upgrade
  return {
    ...base,
    name: `${base.name}${nameSuffix ?? '+'}`,
    costFp: patch.costFp ?? base.costFp,
    baseCt: patch.baseCt ?? base.baseCt,
    minCt: patch.minCt ?? base.minCt,
    effects: patch.effectsAdd ? [...base.effects, ...patch.effectsAdd] : base.effects,
    tags: patch.tagsAdd ? [...base.tags, ...patch.tagsAdd] : base.tags,
  }
}