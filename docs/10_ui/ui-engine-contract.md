UIとエンジンの契約仕様書（画面遷移＋操作＋Executeログ）
0. 目的

状態（GameState）の唯一の更新者はエンジン。UIは状態を直接変更しない。

UIは「操作の意図（Action）」を送るだけ。エンジンは検証し、次状態と外部要求を返す。

画面遷移は state.scene が唯一の真実（UIルーティングの根拠）。

戦闘のExecuteは 自動解決し、UI演出用に executionLog を返す。

1. 役割分担
UIの責務

GameState を描画（Scene別UI）

入力 → UIActionEnvelope を発行（clientSeq付き）

エンジンの requests（保存音トースト等）を実行

executionLog を再生（演出）。スキップ対応。

エンジンの責務

step() による状態更新（純粋関数に寄せる）

不正操作の拒否（受理表にないActionは reject）

RNG消費の管理（再現性）

SAVE_RUN要求タイミングの発行

戦闘の自動Executeと executionLog 生成

2. エンジンAPI（契約）
type EngineError = { code string; message string; data unknown }

type EffectRequest =
   { type'SAVE_PROFILE' }
   { type'SAVE_RUN' }
   { type'PLAY_SFX'; idstring }
   { type'PLAY_BGM'; idstring }
   { type'SHOW_TOAST'; textstring }

type UIActionEnvelope = {
  clientSeq number
  action UIAction
}

type EngineStepResult = {
  nextState GameState
  requests EffectRequest[]
  executionLog ExecutionLog       Executeが走ったときだけ
  error EngineError
}

type Engine = {
  init(profile ProfileSave, maybeRun RunSave) GameState
  step(state GameState, envelope UIActionEnvelope) EngineStepResult
}

3. clientSeq（二重送信対策）仕様（確定）
3.1 仕様

clientSeq は UI側で 単調増加。

エンジンは state.client.lastProcessedSeq を保持。

3.2 エンジンの処理規約

clientSeq = lastProcessedSeq のとき：

状態不変で返す

requests は出さない（保存や音の二重発火を防ぐ）

error は付けない（単なる重複として扱う）

正常処理したら lastProcessedSeq = clientSeq を更新。

4. Pauseの扱い（確定：modal）

S90_PAUSE は 画面遷移しない（Sceneは変えない）。

Pauseは state.ui.modal = 'PAUSE' のようなUI状態として表現。

PAUSE_OPEN  PAUSE_RESUME  PAUSE_QUIT_TO_TITLE は 全Sceneで受理可（ただしBattle中の副作用は無し）。

QUIT_TO_TITLE（確定）

PAUSE_QUIT_TO_TITLE はタイトルへ戻すが、ランは破棄しない。

次回「つづきから」で 直近チェックポイントから再開。

QUITは原則 SAVE_RUN を要求しない（チェックポイントが真実）。

5. UIAction（確定一覧・要点）

（型そのものは前回確定版を使用。ここでは仕様上の要点のみ）

戦闘Executeはステップ入力を使わない

BATTLE_STEP_EXECUTE は 廃止（常に不許可）

Executeトリガは BATTLE_END_PLAN

演出スキップは BATTLE_SKIP_ANIMATION（状態不変）

6. Sceneごとの受理表（確定）

表にないActionは reject（ACTION_NOT_ALLOWED）

S00_BOOT

許可：BOOT_DONE, PAUSE_OPEN, PAUSE_RESUME, PAUSE_QUIT_TO_TITLE

遷移：BOOT_DONE → S01_TITLE

S01_TITLE

許可：TITLE_START, TITLE_CONTINUE, TITLE_OPEN_OPTIONS, PAUSE_

遷移：

START → S10_HUB（仕様に合わせて直行）

CONTINUE → S03_SAVE_SELECT

OPTIONS → S02_TITLE_OPTION

S02_TITLE_OPTION

許可：OPTIONS_SET, OPTIONS_BACK, PAUSE_

遷移：BACK → S01_TITLE

S03_SAVE_SELECT

許可：SAVE_SELECT_SLOT, SAVE_CREATE_SLOT, SAVE_DELETE_SLOT, TITLE_BACK, PAUSE_

遷移：スロット選択 → S10_HUB  BACK → S01_TITLE

S10_HUB（拠点）

許可：HUB_SELECT_PLAYER, HUB_UPGRADE_META, HUB_EQUIP_ABILITY, HUB_LAUNCH_RUN, HUB_BACK_TO_TITLE, PAUSE_

遷移：出撃 → S20_AREA_PROGRESS

S20_AREA_PROGRESS（エリア進行）

許可：AREA_NEXT, AREA_OPEN_MAP, AREA_CLOSE_MAP, PAUSE_

遷移：抽選により S21_EVENTS22_MINIGAMES23_SHOPS24_SHRINES30_BATTLE

S21_EVENT

許可：EVENT_CHOOSE, EVENT_CONFIRM, PAUSE_

遷移：結果確定 → S20_AREA_PROGRESS

S22_MINIGAME

許可：EVENT_CONFIRM（または専用Actionを追加しても良い）, PAUSE_

遷移：結果確定 → S20_AREA_PROGRESS

S23_SHOP

許可：SHOP_BUY, SHOP_SELL_CARD, SHOP_LEAVE, PAUSE_

遷移：退店 → S20_AREA_PROGRESS

S24_SHRINE

許可：SHRINE_LOCK_CARD, SHRINE_UNLOCK_CARD, SHRINE_CONFIRM, SHRINE_LEAVE, PAUSE_

遷移：確定スキップ → S20_AREA_PROGRESS

S30_BATTLE（戦闘：5フェーズ制）

内部フェーズ：Read  Plan  Distortion  Execute  Cleanup

受理は phase でさらに制限：

phase=read

許可：BATTLE_CONFIRM_READ, PAUSE_

phase=plan

許可：BATTLE_PLAY_CARD, BATTLE_SET_ABILITY, BATTLE_UNDO_LAST(任意), BATTLE_END_PLAN, PAUSE_

phase=distortion

許可：DISTORTION_CHOOSE, DISTORTION_CONFIRM, PAUSE_

歪曲が自動なら DISTORTION_ は不許可で良い

phase=execute

許可：BATTLE_SKIP_ANIMATION, PAUSE_

※ BATTLE_END_PLAN を受けた時点で 自動Executeし、executionLog を返す（後述）

BATTLE_STEP_EXECUTE は不許可

phase=cleanup

許可：BATTLE_SKIP_ANIMATION, PAUSE_

遷移：勝利 → S31_BATTLE_REWARD  敗北 → S70_GAMEOVER_DEATH

S31_BATTLE_REWARD（戦闘報酬）

許可：REWARD_PICK_CARD, REWARD_SKIP_CARD, REWARD_CONFIRM, PAUSE_

遷移：確定 → S20_AREA_PROGRESS

S70_GAMEOVER_DEATH

許可：RESULT_CONFIRM, PAUSE_

遷移：続ける → S71_RUN_RESULT

S71_RUN_RESULT

許可：RESULT_CONFIRM, PAUSE_

遷移：拠点へ戻る → S10_HUB

7. Execute仕様（確定：自動＋TURN_ENDまで）
7.1 基本

BATTLE_END_PLAN を受理したら、エンジンは 自動Executeを開始。

Executeは TURN_END（ターン終わり）まで進めて返す。

7.2 TURN_END の終了条件

次のPlanに戻れる状態になった
または

勝敗が確定した（BATTLE_END）

7.3 返却

nextState：Execute完了後の確定状態

executionLog：そのExecuteで起きた“見せるべき出来事”の列

8. executionLog スキーマ（確定）
8.1 返却形式
type ExecutionLog = {
  executionId string
  scope 'TURN_END'  'BATTLE_END'      通常は TURN_END
  events ExecEvent[]                  seq連番
}

8.2 参照の統一
type ActorRef =
   { kind'player' }
   { kind'enemy'; indexnumber }

type CardRef = { kind'card'; uidstring }
type IconRef = { kind'icon'; idstring }

type SourceRef =
   CardRef
   IconRef
   { kind'ability'; idstring }
   { kind'enemyMove'; enemyIndexnumber; moveIdstring }

8.3 イベント（最小セット）

seq は 0..n-1 連番（UIはソート不要）

アイコン解決は基本 ICON_EXECUTING → (変動) → ICON_RESOLVED の順

type ExecEventBase = {
  seq number
  source SourceRef
  tags string[]
}

type ExecEvent =
   (ExecEventBase & { kind'ICON_SCHEDULED'; iconIconRef; ownerActorRef; baseCtnumber; ctnumber; minCtnumber })
   (ExecEventBase & { kind'ICON_CT_CHANGED'; iconIconRef; beforenumber; afternumber; reason'HASTE''SLOW''SWAP''DELAY''ACCEL''CLAMP_MIN''OTHER' })
   (ExecEventBase & { kind'ICON_EXECUTING'; iconIconRef; ownerActorRef })
   (ExecEventBase & { kind'ICON_RESOLVED'; iconIconRef; ownerActorRef })

   (ExecEventBase & { kind'HP_CHANGED'; targetActorRef; beforenumber; afternumber; deltanumber; nature'DAMAGE''HEAL''DRAIN''SELF''DOT' })
   (ExecEventBase & { kind'FP_CHANGED'; targetActorRef; beforenumber; afternumber; deltanumber; nature'GAIN''SPEND''OTHER' })
   (ExecEventBase & { kind'AP_CHANGED'; targetActorRef; beforenumber; afternumber; deltanumber; nature'GAIN''SPEND''LOCK''UNLOCK''OTHER' })

   (ExecEventBase & { kind'STATUS_APPLIED'; targetActorRef; statusIdstring; beforeStacknumbernull; afterStacknumbernull; beforeDurationnumbernull; afterDurationnumbernull })
   (ExecEventBase & { kind'STATUS_REMOVED'; targetActorRef; statusIdstring })
   (ExecEventBase & { kind'STATUS_TICKED'; targetActorRef; statusIdstring; beforeDurationnumbernull; afterDurationnumbernull; notestring })

   (ExecEventBase & { kind'CARD_MOVED'; cardCardRef; from'HAND''DRAW''DISCARD''EXHAUST''GENERATED'; to'HAND''DRAW''DISCARD''EXHAUST' })
   (ExecEventBase & { kind'DRAW'; actorActorRef; countnumber })

   (ExecEventBase & { kind'TURN_ENDED'; turnnumber })
   (ExecEventBase & { kind'BATTLE_ENDED'; result'WIN''LOSE' })

   (ExecEventBase & { kind'EFFECT_CANCELLED'; notestring })

8.4 UI側の再生ルール

UIは executionLog.events を seq順に再生して演出する

BATTLE_SKIP_ANIMATION が来たら：

以降のeventsを即時消化し、nextState を表示（状態は既に確定済み）

9. SAVE_RUN 発行点（表で固定・戦闘中セーブなし）

原則：不可逆確定 または クラッシュ時に戻したい境界で SAVE_RUN を要求

タイミング	SAVE_RUN	備考
ラン生成直後（出撃確定）	✅	ラン開始点固定
ノード確定直後（AREA_NEXTの確定後）	✅	進行境界
戦闘突入確定直後（PRE_BATTLE確定）	✅	戦闘中セーブなしの要
戦闘勝利後：報酬「確定」直後	✅	デッキ資源が変化
ショップ：購入売却「確定」直後	✅	不可逆
祠：選択「確定」直後	✅	不可逆
イベント：結果「確定」直後	✅	不可逆が多い
明確に「出さない」

戦闘の ReadPlanExecuteCleanup 中：❌

Pause開閉：❌

演出スキップ：❌

表示切替（マップ開閉等）：❌

10. 戦闘中セーブなしの復帰仕様（再掲）

戦闘開始前に PRE_BATTLE チェックポイントを保存しているため、

戦闘中に落ちた場合：戦闘開始からやり直し

PAUSE_QUIT_TO_TITLE で抜けた場合も、再開は 直近チェックポイントから。