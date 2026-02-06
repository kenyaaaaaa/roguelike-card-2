セーブ/ロード仕様（戦闘中セーブなし）
方針

セーブは ラン状態まで を対象とする（戦闘中状態は保存しない）。

アプリ終了/クラッシュ/中断復帰で戦闘中だった場合は、その戦闘を最初から再開する（＝戦闘開始前セーブ地点へ巻き戻す）。

互換性のため、保存データ最上位に schemaVersion を必ず持つ。

セーブの種類
1) プロフィールセーブ（永続）

周回強化、アンロック、設定など

ランに依存しない

2) ランセーブ（ラン中）

マップ進行、所持資源、デッキ、レリック、RNG状態など

**戦闘中であっても「戦闘開始前の状態」**しか保持しない

オートセーブタイミング

ラン開始時（新規ラン生成直後）

ノード確定時（次ノードへ進む瞬間）

戦闘開始直前（戦闘ノード突入時）

戦闘終了後（報酬確定後）

ショップ購入確定後 / 祠選択確定後 など「結果が不可逆」な操作の直後

ファイル構造
SaveFile（最上位）
type SaveFile = {
  schemaVersion: number          // 互換の主キー（必須）
  gameVersion?: string           // 表示/デバッグ用（任意）
  createdAt: string              // ISO8601
  updatedAt: string              // ISO8601

  meta: {
    slotId: number
    playtimeSec?: number
  }

  profile: ProfileSave
  run?: RunSave                  // ラン中のみ存在
}

ProfileSave（永続データ）
type ProfileSave = {
  currency: {
    soulTotal: number
  }

  metaUpgrades: {
    byPlayerId: Record<string, {
      maxHpLv: number
      baseAtkLv: number
      speedLv: number
      apCapLv: number
      abilitySlotsLv: number
      shrineCarryLv: number
    }>
  }

  unlocks?: {
    cards?: string[]
    relics?: string[]
    enemies?: string[]
  }

  settings?: {
    // オプション類（音量/キーなど）
  }
}

RunSave（ラン状態：戦闘中は保存しない）
重要

RunSave は **「次に再開できるチェックポイント」**のみを持つ。

そのため run.scene が戦闘中を指すことはない（後述の復帰処理で補正する）。

type RunSave = {
  runId: string
  playerId: string

  // 進行
  act: number
  nodeIndex: number
  // 分岐が増えるなら routeHistory: NodeId[] 等を追加

  // 資源
  resources: {
    gold: number
    soul: number
    maxHp: number
    hp: number
  }

  // 所持
  relics: Array<{ id: string; state?: unknown }>
  abilities: {
    equipped: string[]      // 現在装備中のアビリティID
    apMax: number           // 最大AP（周回強化反映済み）
  }

  // デッキ状態（ランで維持する情報）
  // ※「戦闘中セーブなし」でも、戦闘外でのデッキ変化（報酬/店/イベント）は保存対象
  deck: {
    list: CardInstance[]    // ランの恒久デッキ一覧（推奨）
  }

  // RNG（完全再現のため最低限これを持つ）
  rng: {
    runSeed: string
    runCallIndex: number
  }

  // 再開地点（チェックポイント）
  checkpoint: RunCheckpoint
}

CardInstance（カード実体）

同名カード複数を区別するため uid必須

アップグレードは最小で upgrade（数値でも boolean でも可）

type CardInstance = {
  uid: string
  cardId: string
  upgrade: number           // 0=未強化, 1=+ 等
  // 将来: cursed?:boolean, modifiers?:... は追加でOK
}

RunCheckpoint（戦闘中セーブなしのキモ）

「どこから再開できるか」を明示する。

type RunCheckpoint =
  | {
      kind: 'MAP'
      act: number
      nodeIndex: number
    }
  | {
      kind: 'PRE_BATTLE'
      act: number
      nodeIndex: number
      battleSeed: string            // その戦闘に入るためのseed
      battleCallIndex: number       // その戦闘開始時点の消費回数
      enemySetId: string            // 出現敵（固定したいなら）
      // 初期配置がランごとに違うなら initialTimelinePresetId 等
    }
  | {
      kind: 'POST_BATTLE'
      act: number
      nodeIndex: number
      rewardsPending: boolean       // 報酬選択中を表現したいなら
    }
  | {
      kind: 'EVENT'
      act: number
      nodeIndex: number
      eventId: string
      // 途中選択肢を保持したいなら state を持たせる
      state?: unknown
    }
  | {
      kind: 'SHOP'
      act: number
      nodeIndex: number
      shopId: string
      state?: unknown
    }

なぜ PRE_BATTLE に battleSeed/battleCallIndex を置く？

戦闘中セーブはしないが、戦闘開始時点を完全に再現できるとデバッグも安定する。

逆にここが曖昧だと「再開のたびに敵や初期CTが変わる」事故が起きる。

ロード時の復帰ルール
基本

SaveFile.run が存在するならラン復帰。

checkpoint.kind に従い、対応画面へ遷移する。

戦闘中だった場合

本仕様では「戦闘中セーブ」を作らないため、ロード時に戦闘中である情報は保存されない。

もし旧データ等で戦闘中を示す値が残っていた場合は、PRE_BATTLE に補正して再開する。

バージョニング（schemaVersion）運用

schemaVersion は 破壊的変更（フィールド削除/意味変更/型変更）でのみ増やす。

ロードは必ず migrate(fromVersion → latest) を通す。

追加フィールドはデフォルト値で埋められるように設計する。