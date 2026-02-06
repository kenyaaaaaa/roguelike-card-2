# タイムライン干渉仕様（SlotEffect / TimelineIcon）v1

## 目的

本システムでは、時間操作・割り込み・遅延を **「状態異常（Status）」とは別系統**として扱う。

- **Status**：キャラクターに貼り付き、時間経過や行動に反応する（duration/stack/trigger を持つ）
- **SlotEffect**：タイムライン上の **特定の行動（Icon）** にのみ作用する一時的干渉（キャラに貼らない）

これにより以下を保証する：

- 誰が（source）
- どこに（どの Icon）
- いつまで（その Icon が消えるまで）

効くかが、データ構造として明示される。


---

## 用語（重要）

- **TimelineIcon.ct が唯一の真実（Single Source of Truth）**
  - 戦闘ロジックが参照する CT は常に `icon.ct` のみ
  - `slotEffects` は **UI表示/ログ用の注釈**であり、原則として CT 計算根拠に使わない
- 例外的に「予約時ルール改変（onSchedule）」のようなことをやりたくなった場合は、
  SlotEffect に混ぜず **ルール層（RuleModifier）**として管理する（SlotEffect 禁止）

---

## 1. TimelineIcon（統一行動モデル）

プレイヤー・敵の行動は、すべて TimelineIcon としてタイムライン上に配置される。

```ts
type TimelineIcon = {
  id: IconId

  // 生成（初回スケジュール）順。単調増加で一意。
  createdSeq: number

  owner:
    | { type: 'player' }
    | { type: 'enemy'; index: number }

  source:
    | { type: 'card'; cardId: CardId }
    | { type: 'enemyAction'; moveId: EnemyMoveId; actionIndex: number }
    | { type: 'ability'; abilityId: PlayerAbilityId } // scheduled系のみ

  baseCt: number        // 基礎CT（計算元）
  ct: number            // 残りCT（表示・並び替えに使用）
  minCt?: number        // 下限CT（なければ0）※運用方針は別仕様に従う

  payload: Effect[]     // 実行時に処理される Effect 群

  slotEffects: SlotEffect[] // このIconに貼られた一時的干渉（注釈/表示/ログ）
}
設計意図
プレイヤーカード / 敵Action / 必殺アビリティを完全同型に扱う

Executeフェーズでは 「CT=0のIconを取り出して payload を実行するだけ」 にする

Status の Trigger 処理と 完全分離する


2. SlotEffect（行動スロット効果）

SlotEffect は特定の TimelineIcon にのみ作用する 付箋型効果（注釈）。
キャラに貼らない
ターンをまたがない（Iconが消えたら消滅）
Status の duration / stack / trigger を持たない


SlotEffect の位置づけ
- `slotEffects[]` は **UI 表示・ログ・演出注釈専用**
- SlotEffect から CT を再計算することは禁止
- SlotEffect は「なぜその CT になったか」を説明するための **履歴情報** に過ぎない
禁止事項
- CT 操作を「slotEffects の積み重ね」で表現すること
- slotEffects を元に CT を再構築・再評価する処理




type SlotEffect = {
  id: SlotEffectId

  // 付与順（単調増加）
  appliedSeq: number

  magnitude?: number       // 数値効果（+20 / -15 / 100 等）
  source: SlotEffectSource // 付与元（Ability / Distortion 等）

  policy: 'add' | 'max' | 'replace' | 'ignore'
  timing: 'applyNow' | 'beforeExecute'

  tags?: string[]          // UI表示用（lock, delayed 等）
}
主な SlotEffectId 例（拡張可）
id	意味
ctDelta	CTを加算・減算（表示/ログ用）
lockToEnd	行動を最後尾に固定（表示/ログ用）
lock	行動不可（将来拡張）
targetOverride	対象固定（将来拡張）
3. SlotEffect の適用ルール
3.1 寿命
SlotEffect の寿命 = Iconの寿命

Icon が Execute される or 破棄されると同時に消滅

3.2 重なり方（policy）
add：数値は累積（+20 と +10 → +30）

replace：既存効果を上書き（lockToEnd など）

max：大きい方を採用

ignore：既存があれば無効

3.3 優先度ルール（固定）
lockToEnd (replace) は最優先

それ以外は基本 add 前提で運用してよい

注意：policy は SlotEffect の「表示/注釈の統合ルール」。
実際の CT の変更は Effect 解決モデルを通して確定する（後述）。

4. Distortion / Ability の統合方針
基本原則
Distortion も PlayerAbility も **「TimelineIcon を編集する操作」**として統一する
ただし 直接編集は禁止（Effect 解決モデルを経由）

フェーズ別責務（UI視点）
Plan フェーズ

プレイヤーが Icon を追加/編集する意図を発行

表示のために SlotEffect を付与してよい（※注釈として）

Distortion フェーズ

敵（主にボス）が同じ編集APIを使って Icon への干渉意図を発行

対象や回数に制限を設けるだけ（能力差）

Execute フェーズ

編集済み TimelineIcon を CT順に処理

SlotEffect の新規付与は原則禁止（ログ注釈を増やしたいなら executionLog 側へ）

5. Effect 解決モデルと Timeline 編集 API の接続点（最重要）
5.1 原則
TimelineIcon を 直接書き換える処理は禁止

すべての操作は Effect 解決モデルを経由する

5.2 フェーズ別責務（エンジン視点）
Resolve フェーズ
CT変更は CtChange / CtModified 等の Effect として 発行するのみ

TimelineIcon.ct は変更しない

Execute フェーズ
Effect 解決結果をもとに updateCt() を呼び出し、実体CTを確定する

CT の実変更は Execute フェーズでのみ許可される

5.3 Plan フェーズ即時効果の扱い
Plan 中に発動するアビリティ・Distortion であっても、内部的には必ず以下を通す：

IntentEffect(CtChange)
→ resolve
→ execute(updateCt)
特例・ショートカットは禁止

6. タイムライン編集 API（最小セット）
注意：API名は「UIが呼ぶもの」と「エンジンが確定に使うもの」を分ける。
UI/Plan/Distortion は “意図を発行する” まで。確定は Execute のみ。

6.1 参照
findIcons(query): TimelineIcon[]

6.2 意図の発行（Plan/Distortion）
emitIntent(effect: IntentEffect): void

例：IntentEffect(CtChange) / IntentEffect(SwapCt) 等

6.3 注釈（UI/ログ用）
applySlotEffect(iconId, slotEffect): void

禁止事項：この関数が icon.ct を直接更新してはならない

SlotEffect は “なぜそうなったか” の説明のために貼るだけ

6.4 CT確定（Executeのみ）
updateCt(iconId, newCt, reason?): void

CTを直接更新する 唯一の入口

実行ログ（executionLog）に reason を残せる

6.5 並び替え
resortTimeline(): void

(ct, ownerPriority, createdSeq) で常に安定ソート

7. 代表的な効果の表現例
A. プレッシャー（敵の次行動 CT +20）
対象：敵の次Icon

処理：

emitIntent(CtChange { targetIconId, delta:+20 })

UI注釈として SlotEffect { id:'ctDelta', magnitude:+20, policy:'add', timing:'applyNow' } を付与してよい

B. タイムロック（最後尾に飛ばす）
対象：敵の最も近いIcon

処理：

emitIntent(CtSetOrMax { targetIconId, value:100, policy:'max' }) 等で表現

UI注釈として SlotEffect { id:'lockToEnd', magnitude:100, policy:'replace' }

C. swapTwoPlayerIcons（歪曲）
対象：プレイヤーIcon 2つ

処理：

emitIntent(SwapCt { iconA, iconB })

UI注釈を出したい場合のみ、両Iconに SlotEffect を付与

8. Status との明確な分離
項目	Status	SlotEffect
貼り先	キャラクター	TimelineIcon
寿命	duration / stack	Iconが消えるまで
Trigger	あり	なし
再発火	する	しない
主用途	病気・体質	時間干渉・割り込み





minCt（CT下限）の仕様：3概念を必ず分離する


1) Card/Ability 定義の minCt（設計値）

対象：CardDefinition.minCt / AbilityDefinition.minCt
意味：その技が「軽すぎて壊れる」のを防ぐ 予約時の下限（設計値）
適用タイミング：スケジュール（予約）生成時のみ
予約CTはまず式で算出し、次に definition.minCt で下限を掛ける

例：
scheduledCt = max(
  definition.minCt ?? 0,
  baseCt * 100 / (100 + speed)
)


2) TimelineIcon の minCtFrozen（凍結値・個別下限）

対象：TimelineIcon.minCtFrozen
意味：そのアイコン固有の下限。予約時に 定義の minCt をコピーして凍結する。
狙い：後からカード定義が変わっても、既に並んだアイコンの挙動が変わらないようにする（再現性の担保）。

予約生成時：
icon.ct = scheduledCt
icon.minCtFrozen = definition.minCt ?? 0

3) BattleRules の ctFloorThisTurn（ターン環境下限）

対象：battleRules.ctFloorThisTurn
意味：歪曲やルール改変により「このターン中、CTは最低◯◯」を強制する 環境ルール
ctFloorThisTurn は ターン開始時 0（または undefined）にリセット
操作API例：
raiseCtFloorThisTurn(value)：ctFloorThisTurn = max(ctFloorThisTurn, value)

クランプ（下限適用）は“1本化”して固定する

CTを変更する全ルート（予約生成 / modifyQueuedCT / swap / 書き換え等）は、最終的に 同一のクランプ式を必ず通す。
正式なクランプ式（唯一の正解）
clampedCt = max(
  proposedCt,
  icon.minCtFrozen ?? 0,
  battleRules.ctFloorThisTurn ?? 0
)


重要：この式を“どこでも同じ”にすること（分岐・例外禁止）

実装規約：CTを書き換える処理は updateCt(iconId, proposedCt, reason) に集約し、クランプを内部で必ず実行する

ターン環境下限の適用範囲（おすすめ：既存アイコンにも効かせる）

ctFloorThisTurn は「このターンのルール」なので、既に並んでいるアイコンにも効く仕様にする。

ルール

ctFloorThisTurn が更新された瞬間に、全TimelineIconを再クランプして反映する
icon.ct = max(icon.ct, icon.minCtFrozen, ctFloorThisTurn)

これにより「既存アイコンだけ抜け穴」みたいな不自然さが消える