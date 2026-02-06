1. 状態の基本構造

すべての状態異常は、1つの Status インスタンスとして管理される。

Status = {
  stack: number | null
  duration: number | null
  flags?: Record<string, boolean>
  tickPolicy: TickPolicy
  stackPolicy: StackPolicy
  refreshPolicy: RefreshPolicy
  maxStack?: number
  maxDuration?: number
}

各要素の意味

stack
強度・回数・残量など。
意味は Statusごとに定義 される。

duration
残り期限。
null の場合は無期限（永続）。

tickPolicy
duration が「いつ減るか」。

stackPolicy
stack が「いつ・どう減るか」。

refreshPolicy
同じ Status を再付与されたときの更新ルール。

2. 発火イベント（Trigger 一覧）

状態は以下のイベントに反応できる。

Trigger	意味
OnApply	状態が付与された瞬間
OnTurnStart	プレイヤーターン開始
OnTurnEnd	プレイヤーターン終了
OnCTReady	CTが0になり行動権を得た瞬間
OnActorActionStart	行動内容が確定し、実行直前
OnActorActionEnd	行動の全処理が完了した直後
OnDealDamage	ダメージを与えた瞬間
OnTakeDamage	ダメージを受けた瞬間
OnCardPlayed	カードを使用した瞬間
OnStatusExpire	状態が消滅した瞬間
3. duration の減少ルール（tickPolicy）
tickPolicy	内容
NONE	減らない（永続）
TURN_END_OWNER	所有者のターン終了ごとに -1
TURN_START_OWNER	所有者のターン開始ごとに -1
ACTION_END_OWNER	所有者が行動するたび -1
CT_READY_OWNER	所有者が行動権を得るたび -1
GLOBAL_TURN_END	全体ターン終了で -1（特殊用）
4. stack の減少ルール（stackPolicy）
stackPolicy	内容
NONE	減らない（蓄積）
ON_TRIGGER_X	特定トリガ発生時に -n
CONSUME_ON_USE	効果が発動した瞬間に消費
DECAY_PER_TICK	duration tick のたびに -n
5. 再付与ルール（refreshPolicy）
refreshPolicy	内容
STACK_ADD	stack += Δ
DURATION_ADD	duration += Δ
BOTH_ADD	stack / duration 両方加算
DURATION_REFRESH_MAX	duration = max(現在, 新規)
REPLACE	完全上書き
IGNORE_IF_PRESENT	既にあれば無効


状態異常・バフデバフ定義
汎用デバフ / バフ
脆弱（Vulnerable）

種別：デバフ

効果：被ダメージ +X%

stack：なし（固定倍率）

duration：n

tickPolicy：TURN_END_OWNER

stackPolicy：NONE

refreshPolicy：DURATION_REFRESH_MAX

Trigger：

OnTakeDamage（ダメージ計算時に参照）

Expire：

duration <= 0 → OnStatusExpire

備考：

再付与しても短くならない

この攻撃に新規付与分は乗らない（次から有効）

脱力（Weak）

種別：デバフ

効果：与ダメージ -X%

stack：なし（固定倍率）

duration：n

tickPolicy：TURN_END_OWNER

stackPolicy：NONE

refreshPolicy：DURATION_REFRESH_MAX

Trigger：

OnDealDamage（ダメージ計算時に参照）

Expire：

duration <= 0 → OnStatusExpire

備考：

汎用的な一時弱体

疫病師の「衰弱」とは別物

Block

種別：バフ

効果：被ダメージを stack 分軽減（先に消費）

stack：Block値

duration：

TURN_END_OWNER（ターン制Block）

または NONE（永続Block）

tickPolicy：

TURN_END_OWNER（ターン制の場合）

stackPolicy：NONE

refreshPolicy：STACK_ADD

Trigger：

OnTakeDamage（ダメージ計算時に消費）

Expire：

stack <= 0 または duration <= 0

備考：

Armor より先に消費される

Armor

種別：バフ

効果：Block消費後、被ダメージを stack 分軽減

stack：装甲値

duration：NONE

tickPolicy：NONE

stackPolicy：NONE

refreshPolicy：STACK_ADD

Trigger：

OnTakeDamage（Block消費後に使用）

Expire：

stack <= 0

備考：

永続防御

腐食・破壊系デバフの対抗軸

迅速（Haste）

種別：バフ

効果：speed + (stack × 基準値)

stack：強度

duration：n

tickPolicy：TURN_END_OWNER

stackPolicy：NONE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD

Trigger：

CT計算時に参照

Expire：

duration <= 0

備考：

再付与で強度は積み、期間は延長されない

鈍重（Slow）

種別：デバフ

効果：speed - (stack × 基準値)

stack：強度

duration：n

tickPolicy：TURN_END_OWNER

stackPolicy：NONE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD

Trigger：

CT計算時に参照

Expire：

duration <= 0

備考：

迅速と同仕様・逆効果

毒（Poison）※スレスパ型・汎用

種別：デバフ

効果：ターン終了時に stack ダメージ

stack：毒量

duration：NONE

tickPolicy：NONE

stackPolicy：ON_TRIGGER_X（OnTurnEnd で stack -= 1）

refreshPolicy：STACK_ADD

Trigger：

OnTurnEnd：takeDamage(stack) → stack -= 1

Expire：

stack <= 0

備考：

他職も使用可能

安定・分かりやすいDoT

出血（Bleed）

種別：デバフ

効果：被ダメージ時に stack ダメージ

stack：出血量

duration：NONE

tickPolicy：NONE

stackPolicy：ON_TRIGGER_X（OnTakeDamage で stack -= 1）

refreshPolicy：STACK_ADD

Trigger：

OnTakeDamage：takeDamage(stack) → stack -= 1

Expire：

stack <= 0

備考：

多段ヒットと強く噛み合う

行動では減らない

固有ステータス（キャラ専用）
腐食（Corrosion）※疫病師の主軸

種別：デバフ

効果：行動権を得るたび stack ダメージ

stack：腐食量

duration：NONE

tickPolicy：NONE

stackPolicy：ON_TRIGGER_X（OnCTReady で stack -= 1）

refreshPolicy：STACK_ADD

Trigger：

OnCTReady：takeDamage(stack) → stack -= 1

Expire：

stack <= 0

備考：

行動するほど削れる

CT依存・疫病師の看板DoT

衰弱（Weakened）※疫病師専用弱体

種別：デバフ

効果：与ダメージ - (10% × stack)

stack：強度

duration：n

tickPolicy：TURN_END_OWNER

stackPolicy：NONE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD

Trigger：

OnDealDamage（modifier参照）

Expire：

duration <= 0

備考：

Weakより重い・積み上げ型

疫病師の制圧用デバフ

壊死（Necrosis）

種別：デバフ（カウンタ）

効果：行動するたび stack が増える

stack：壊死量

duration：NONE

tickPolicy：NONE

stackPolicy：NONE

refreshPolicy：STACK_ADD

Trigger：

OnActorActionEnd（所有者）：stack += 1

Expire：

なし（カード効果でのみ除去）

備考：

直接ダメージは出さない

他カードの参照用リソース

増殖（Proliferation）

種別：バフ

効果：次の「状態異常付与」の効果量を +stack

stack：増幅量

duration：n（通常1）

tickPolicy：TURN_END_OWNER

stackPolicy：CONSUME_ON_USE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD

Trigger：

OnCardPlayed（状態異常付与カード）：効果量 +stack → 消費

Expire：

消費 or duration <= 0

備考：

「次の1回だけ」系バフ

多段付与は1回として扱う

準備（Setup）※剣士

種別：バフ

効果：次の自分ターン開始時に AP +1

stack：回数

duration：n（通常1）

tickPolicy：TURN_START_OWNER

stackPolicy：CONSUME_ON_USE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD

Trigger：

OnTurnStart：gainAP(stack) → 消費

Expire：

消費 or duration <= 0

備考：

剣士のテンポ加速用バフ

id: nextAttackPlus

種別：バフ

stack：加算値（例：+2）

duration：n（通常1）

tickPolicy：TURN_END_OWNER

stackPolicy：CONSUME_ON_USE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD 

Trigger

OnDealDamage（ただし “次の攻撃” 判定が成立したときのみ）

ダメージに +stack してから消費する

3.2 NextAttackPct（次の攻撃に%加算）

id: nextAttackPct

種別：バフ

stack：%加算（例：+20% を stack=20 として扱う等、表現はどちらでもOK）

duration：n（通常1）

tickPolicy：TURN_END_OWNER

stackPolicy：CONSUME_ON_USE

refreshPolicy：DURATION_REFRESH_MAX + STACK_ADD 

Trigger

OnDealDamage（“次の攻撃”成立時のみ）

攻撃側 modifier として %加算 してから消費



9. 解決順（同時発火の優先順位）

イベントが連鎖した場合、必ず以下の順で解決する。

OnApply

OnTurnStart

OnCTReady

OnActorActionStart

行動本体（攻撃 / カード効果）

OnDealDamage / OnTakeDamage

OnActorActionEnd

duration / stack の tick

OnTurnEnd

Expire → OnStatusExpire


同一イベント（例：OnCTReady）に対して複数の効果が反応する場合、以下の順で処理する

行動阻害 / 強制（キャンセル・スタン・沈黙・恐怖）

CT/Speed変更（遅延・加速）

ダメージ・HP変動（腐食/毒/自傷など）

リソース変動（AP/FPなど）

状態付与/更新（OnApply的なもの）

ドロー/生成/その他

同順位なら次で決着：

同じStatus内：固定

複数Status：付与が古い順（FIFO）


ダメージ処理（推奨の固定順）

基礎ダメージ算出（カード/技の数値）

攻撃側 modifier（Weak / Weakened / バフ等）

防御側 modifier（Vulnerable など）

軽減処理
4-1) Block消費
4-2) Armor消費

HP減少

OnDealDamage / OnTakeDamage 発火

死判定（0以下）→ 死亡処理

派生イベントがあればキューへ

同CT到達時の行動順

1. タイムライン上で先に配置されていた順（同ctの場合はプレイヤー優先で配置される）