0. 用語（最小）

Engine: 純粋なゲーム進行ロジック（src/engine）。UIに状態更新をさせない。

UI: 描画と入力（src/ui, src/app）。状態を直接変更しない。

State: 進行に必要な全データ。UIは参照のみ。

Step: Engine.step(envelope) の1回呼び出しで発生する状態遷移。

Scene: 画面レベルの状態（Title / SaveSelect / Hub / Battle …）。

Battle: 戦闘Scene内部のフェーズ進行（Read / Plan / Distortion / Execute / Cleanup）。

TimelineIcon: タイムライン上の予約行動（唯一の行動モデル）。

SlotEffect: TimelineIconに貼る“一時干渉”。Statusとは別系統。

Status: キャラに貼り付く状態異常。Triggerで反応する。

ExecutionLog: 「状態は確定しているがUIは順番に見せたい」ための再生用ログ。ゲーム進行の分岐には使用しない。

1. アーキテクチャ不変条件（破ったら即NG）
1.1 Engineは純粋関数である

Engine.step は純粋関数でなければならない。

外部状態を読まない（Date / Math.random / localStorage 等禁止）。

外部状態を書き換えない。

副作用は requests として返すのみ。

同一の初期State・同一の入力列・同一seedに対して、
必ず同一のStateとExecutionLogを生成すること（決定性保証）。

1.2 UIはstateを直接変更しない

UIは Engine.step(actionEnvelope) を呼び、戻り値の nextState を描画するだけ。

UI側で状態更新（手札減少、HP減少、CT変更など）をしてはいけない。

行動可否判定はEngineの受理結果を真とする。UIが先読みしてロジックを持ってはならない。

1.3 戦闘解決は一本化（パイプライン無視禁止）

戦闘の効果処理は必ず
Event → Intent → Resolve → Execute
の順で処理する。

ダメージ / CT変更 / 状態付与などの副作用は Execute 以外で起こしてはいけない。

「使った瞬間にHPが減る」等のパイプラインを経ない直書き処理は禁止。

※ Planフェーズ中の“インスタント”処理は許可されるが、
　必ず同一パイプラインを通した上で即時にExecuteまで回すこと。

1.4 TimelineIcon.ct が唯一の真実

行動順・残りCTは TimelineIcon.ct を真とする。

UI表示用にCTを別管理したり、二重化して整合を取る実装は禁止。

1.5 Battleフェーズの境界固定

戦闘フェーズは
Read → Plan → Distortion → Execute → Cleanup
の順。

DistortionはPlan確定後〜Execute前の専用干渉フェーズ。

Execute中の割り込みは禁止（例外は仕様で明記された場合のみ）。

1.6 RNGは分離し、再現可能であること

RNGは最低でも runRng / battleRng / uiRng に分離する。

battleRng は seed+入力ログで完全再現できなければならない。

UI演出のランダムは uiRng を用い、進行に影響させない。

1.7 ExecutionLogの扱い

ExecutionLogはUI再生専用。

ゲーム進行の判定・分岐に使用してはならない。

決定性保証の対象に含まれる（同入力で同一ログ生成）。

1.8 セーブ/ロードは schemaVersion + migrate 前提

SaveFileは schemaVersion を持つ。

schema変更は migrate を必ず追加する。

戦闘中セーブは禁止（仕様のチェックポイントに従う）。

PauseはSceneを変更せず、UIモーダルとして扱う。

2. 実装ルール（AIの暴走防止）
2.1 “勝手に新概念”を増やさない

新しい大枠概念（新フェーズ、新サブシステム、新しい状態管理）を勝手に導入しない。

既存の命名・フォルダ境界・型を尊重し、必要最小限の追加に留める。

2.2 public APIは最小

UI↔Engineの境界（Engine.index.ts）は極力増やさない。

迷ったら内部関数に閉じ込める。

2.3 変更範囲を宣言してから作業する

触るファイル/ディレクトリを先に宣言し、それ以外は触らない。

“ついでのリファクタ”は禁止。

2.4 テスト or 決定性ログは必須

Engineのロジック変更はVitestを最低1本追加/更新する。

テストが難しい場合は、同seedで同一State・同一ExecutionLogになる手順を提示する。

3. Done（完了条件）テンプレ

各タスクの完了は最低でも以下を満たすこと。

 変更ファイル一覧

 仕様上の根拠（章タイトルでOK）

 テスト1本以上、または決定性ログ手順

 主要な型/関数のI/O説明（3〜8行）

 受理表（acceptTable）がある場合、許可/拒否が意図通り

4. 今回の実装スタイル（推奨）

小さい縦スライスで進める（1タスク10ファイル未満目安）

Scene遷移 → 戦闘最小 → 拡張の順

UIとEngineを同時に大きく作らない（片方を薄く）

5. 出力フォーマット（AI返答形式）

目的

変更概要

変更ファイル一覧

テスト/確認方法

仕様の根拠