UIとエンジンの契約仕様書（画面遷移＋操作＋Executeログ）
0. 目的

状態（GameState）の唯一の更新者は Engine。

UI は state を直接変更しない。

画面遷移の唯一の真実は state.sceneId。

Scene固有データは state.scene に保持してよいが、遷移判定は sceneId のみ。

戦闘の Execute は自動解決され、UI演出用に ExecutionLog が返る。

1. 役割分担
UIの責務

GameState を描画（sceneId に基づく）

入力 → UIActionEnvelope を生成（clientSeq付き）

EffectRequest を実行

ExecutionLog を順序通り再生（スキップ可）

Engineの責務

step() による状態更新（純粋関数）

不正操作の reject（ACTION_NOT_ALLOWED）

RNG消費管理（再現性保証）

SAVE_RUN要求タイミング発行

戦闘の自動Executeと ExecutionLog 生成

2. エンジンAPI（型準拠）
type UIActionEnvelope = {
  clientSeq: number
  action: UIAction
}

type EngineStepResult = {
  nextState: GameState
  requests: EffectRequest[]
  executionLog: ExecutionLog | null
  error: EngineError | null
}

成功時

error = null

executionLog = null または ExecutionLog

nextState は更新済み

reject時

nextState は入力stateと同一

requests = []

executionLog = null

error != null

clientSeq重複時

nextState 不変

requests = []

executionLog = null

error = null

3. clientSeq（二重送信対策）

UIは clientSeq を単調増加させる。

Engineは state.client.lastProcessedSeq を保持する。

正常処理後に更新する。

4. Pause（modal）

PauseはScene遷移しない。

state.ui.modal = 'PAUSE'

PAUSE_OPEN / PAUSE_RESUME / PAUSE_QUIT_TO_TITLE は全Sceneで受理可。

PAUSE_QUIT_TO_TITLE はランを破棄しない。

5. UIAction

UIAction は union型で完全列挙される。

表にないActionは reject。

BATTLE_STEP_EXECUTE は存在しない（常に不許可）。

Executeトリガは BATTLE_END_PLAN。

演出スキップは BATTLE_SKIP_ANIMATION（状態不変）。

6. Sceneごとの受理表

Scene遷移の真実は sceneId。

各Sceneで許可される UIAction は acceptTable により制限。

（内容は現行仕様と同じ。省略せずそのまま維持）

7. Execute仕様（型準拠）

BATTLE_END_PLAN を受理したら自動Execute開始。

Executeは TURN_END まで進行。

戻り値：

executionLog: ExecutionLog


（Executeが走らないStepでは null）

8. ExecutionLog スキーマ（types.ts準拠）
type ExecutionLog = {
  executionId: string
  scope: 'TURN_END' | 'BATTLE_END'
  events: ExecEvent[]
}

共通
type ExecEventBase = {
  seq: number
  source: SourceRef
  tags: string[]
}

主なイベント

ICON_SCHEDULED

ICON_CT_CHANGED

ICON_EXECUTING

ICON_RESOLVED

HP_CHANGED

FP_CHANGED

AP_CHANGED

STATUS_APPLIED

STATUS_REMOVED

STATUS_TICKED

CARD_MOVED

DRAW

TURN_ENDED

BATTLE_ENDED

EFFECT_CANCELLED

※ フィールド名は types.ts の定義を唯一の正本とする。

9. SAVE_RUN 発行点

以下のタイミングで EffectRequest { type: 'SAVE_RUN' } を返す：

ラン生成直後

AREA_NEXT確定直後

PRE_BATTLE確定直後

戦闘報酬確定直後

ショップ確定直後

祠確定直後

イベント確定直後

以下では出さない：

戦闘中（Read/Plan/Distortion/Execute/Cleanup）

Pause開閉

演出スキップ

UI表示切替

10. 戦闘中セーブなし

PRE_BATTLE がチェックポイント

戦闘中クラッシュ → 戦闘開始から再開

QUIT_TO_TITLE でも同様