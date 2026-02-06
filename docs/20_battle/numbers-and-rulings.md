# appendix.md — 数値と裁定（v0.1）

この文書は「数値定数」と「裁定（ルールの断定）」だけを集める。
カード/敵/演出の追加で迷ったら、まずここを更新する。

---

## 0. 共通の表記

- % は「加算式」をデフォルトとする（乗算禁止）
  - 例：与ダメ +20% と +30% → 合計 +50%
- 端数処理：**小数は切り捨て**
  - 例：ダメージ 7 * 1.5 = 10.5 → 10
- 上限/下限：特記なければ clamp する（0未満禁止）

---

## 1. CT / Speed 定数

### 1.1 CT計算式（再掲）
- scheduledCt = max(minCt, baseCt * 100 / (100 + speed))

### 1.2 Haste/Slow の「基準値」
- HASTE_SPEED_PER_STACK = +10
- SLOW_SPEED_PER_STACK  = -10

※ speed は実数を許可してよいが、表示は整数に丸める（切り捨て）。

### 1.3 CTクランプ（唯一の正解）
- clampedCt = max(
    proposedCt,
    icon.minCtFrozen ?? 0,
    battleRules.ctFloorThisTurn ?? 0
  )

### 1.4 ctFloorThisTurn 初期値
- CT_FLOOR_INITIAL = 0
- ターン開始で 0 に戻す

---

## 2. ダメージ倍率（ステータス）定数

### 2.1 Vulnerable（被ダメ増）
- VULNERABLE_TAKEN_DAMAGE_PCT = +50%

### 2.2 Weak（与ダメ減）
- WEAK_DEAL_DAMAGE_PCT = -25%

### 2.3 Weakened（疫病師・積み上げ）
- WEAKENED_DEAL_DAMAGE_PCT_PER_STACK = -10%  (stack上限=6 推奨)
- WEAKENED_MAX_STACK = 6

---

## 3. DoT / 反応系の裁定（発火と軽減）

### 3.1 DoTの防御適用
- Poison / Corrosionはblockで軽減できないが、Armorでブロックできる
- Bleed　Block / Guard で完全防御できたら発動しない（被ダメ前提）

※「疫病師が弱すぎる」場合のみ Corrosion を Armor 無視に変更してよい（その場合は明記する）。

### 3.2 Poison（ターン終わり）
- ターン終了時：takeDamage(stack) → stack -= 1

### 3.3 Corrosion（CTReady）
- OnCTReady：takeDamage(stack) → stack -= 1

### 3.4 Bleed（被ダメ）
- OnTakeDamage：takeDamage(stack) → stack -= 1

---

## 4. Block / Armor の裁定

### 4.1 ダメージ適用順
1) 攻撃側 modifier（Weak/Weakened 等）
2) 防御側 modifier（Vulnerable 等）
3) Block 消費
4) Armor 消費
5) HP 減少

### 4.2 Block のターン減衰
- TURN_BLOCK_DECAY = 全消滅（ターン終了で 0）
  - 永続ブロックが欲しくなったら別ステータスで表現する（例：Barrier）

### 4.3 Armor の初期仕様
- Armor は「スタック量ぶんを毎回軽減」ではなく「軽減のための“消費される盾”」として扱う
  - 例：Armor=8 → 被ダメ 10 のとき 8 軽減して Armor=0、HPに2
（※この仕様なら「腐食・破壊系の対抗軸」になる）

---

## 5. 同CT / 死亡 / キャンセルの裁定（重要）

### 5.1 タイムライン同CTの順序（再掲）
- sortKey = (ct asc, ownerPriority, createdSeq asc, id asc)
- ownerPriority は player < enemy

### 5.2 「死亡した瞬間」の扱い（死体が殴らない）
- 任意の処理で HP <= 0 になった瞬間：
  - そのキャラの **未実行アイコンを全てキャンセル**（IconRemoved reason='cancelled'）
  - 以降、そのキャラ由来の BeforeExecute/AfterExecute は発火しない

### 5.3 同CTで相互に致死する場合
- 上記のソート順で実行する
- 先に処理された側が相手を殺した場合：
  - 相手の残りアイコンは 5.2 により全キャンセル

---

## 6. リソース（FP/AP/HP/Gold）の裁定

### 6.1 0未満禁止
- FP/AP/Gold は 0 未満にならない（clamp）
- HP は 0 未満を許可してよいが、表示は 0 に丸める

### 6.2 支払いの失敗
- コストが足りない action は reject（状態不変）
  - 例：FP不足でカード使用不可、AP不足でアビリティ使用不可

### 6.3 1ターン中のAP回復（原則）
- AP は原則「戦闘中回復なし」
- 例外を入れる場合は **カード/レリックの効果として明示**し、上限 apMax で clamp

---

## 7. Distortion（歪曲）の最低裁定

### 7.1 歪曲の選択権
- distortion.mode = 'auto' | 'playerSelect'
  - auto：敵が自動で対象選択・適用（UIは閲覧のみ）
  - playerSelect：UIで対象選択が必要（DISTORTION_CHOOSE が許可される）

### 7.2 1ターン上限
- distortion.maxPerTurn は厳守（超えたら以降は発火しない）

---

## 8. 乱数（RNG）の最低裁定

- battleRng は「結果に影響する処理」にしか使わない
- uiRng は演出だけ
- 重要イベントは rngCallIndex をログに残す

---

## 9. 推奨：上限（暴走防止）

- SPEED_MIN = -80（これ未満は -80 に clamp）
- SPEED_MAX = +120（これ超えは +120 に clamp）
- CT_MAX_DISPLAY = 120（UI表示上の上限。内部値は持ってもいいが、lockToEnd 等は 100〜120 で十分）

---

## Changelog
- v0.1: 初版（倍率・DoT防御・死亡キャンセル・AP/FP裁定を確定）
