# Effect 解決モデル仕様

**Event → Intent → Resolve → Execute**

## 目的

本ゲームでは、カード・敵行動・状態異常・レリック・アビリティによる効果を即時実行せず、すべてキュー経由で解決する。

これにより以下を保証する:

- 解決順の完全固定
- 割り込み・連鎖の安全な処理
- 再現性・デバッグ容易性
- 実装経路の一本化

## 全体フロー

1. **Event 発生**
2. **Reaction収集**(IntentEffect生成)
3. **Effectキューに積む**
4. **解決順に1つ取り出す**
5. **resolve** → ResolvedEffect生成
6. **execute**(副作用のみ)
7. **新Event発生** → ①へ戻る

**重要**: 直接ダメージ・CT変更・状態付与を行う処理は禁止。すべて Effectキュー経由で処理する。

---

## 1. Event(事実の記録)

### 定義

Event は「世界で起きた事実」のみを表す。意図・処理内容・将来の結果を含めない。

### 最小 Event 定義

```typescript
// ==============================
// Event Definitions (Final)
// ==============================

export type Event =
  // ----------------------------
  // Timeline / Action
  // ----------------------------
  | {
      type: 'IconScheduled'
      iconId: IconId
    }
  | {
      type: 'BeforeExecute'
      iconId: IconId
    }
  | {
      type: 'AfterExecute'
      iconId: IconId
    }
  | {
      type: 'IconRemoved'
      iconId: IconId
      reason: 'executed' | 'cancelled'
    }

  // ----------------------------
  // HP / Damage
  // ----------------------------
  | {
      type: 'DamageApplied'
      target: CharacterId
      amount: number
    }
  | {
      type: 'HealApplied'
      target: CharacterId
      amount: number
    }

  // ----------------------------
  // CT / Timeline modification
  // ----------------------------
  | {
      type: 'CtModified'
      iconId: IconId
      oldCt: number
      newCt: number
    }

  // ----------------------------
  // Status
  // ----------------------------
  | {
      type: 'StatusApplied'
      target: CharacterId
      statusId: StatusId
      stacks: number
    }
  | {
      type: 'StatusRemoved'
      target: CharacterId
      statusId: StatusId
    }
  | {
      type: 'StatusStackChanged'
      target: CharacterId
      statusId: StatusId
      oldStacks: number
      newStacks: number
    }

  // ----------------------------
  // Resource
  // ----------------------------
  | {
      type: 'ResourceChanged'
      target: CharacterId
      resource: 'HP' | 'AP' | 'FP' 
      oldValue: number
      newValue: number
    }

  // ----------------------------
  // Card / Deck
  // ----------------------------
  | {
      type: 'CardDrawn'
      cardId: CardId
    }
  | {
      type: 'CardPlayed'
      cardId: CardId
    }
  | {
      type: 'CardDiscarded'
      cardId: CardId
      reason: 'use' | 'effect'
    }

  // ----------------------------
  // Turn
  // ----------------------------
  | {
      type: 'TurnStarted'
      owner: 'player' | 'enemy'
    }
  | {
      type: 'TurnEnded'
      owner: 'player' | 'enemy'
    }
```

### 方針

- Event はログ用途にも使用可能
- Event は世界の事実のみを表現する

---

## 2. Reaction収集(IntentEffect生成)

Event が発生した際、以下の要素が反応可能:

- Status
- Relic
- Ability(常在)
- パッシブ効果

### 例

**Event:**
```
DamageApplied(target=A, amount=10)
```

**Reaction:**

- 毒Status → IntentEffect(Damage)
- 被ダメ時回復レリック → IntentEffect(GainResource)
- CT反応Status → IntentEffect(CtChange)

すべて IntentEffect に変換して返す。

### ターゲット定義

```typescript
// ==============================
// Target Definitions
// ==============================

export type CharacterTarget =
  | 'self'
  | 'player'
  | 'enemy'
  | { type: 'specific'; id: CharacterId }

export type DamageTarget =
  | CharacterTarget
  | 'allEnemies'
  | 'randomEnemy'

export type CtTarget =
  | 'nextEnemyIcon'
  | 'nextPlayerIcon'
  | 'allEnemyIcons'
  | { type: 'icon'; iconId: IconId }

export type ActionTarget =
  | 'nextEnemyIcon'
  | 'nextPlayerIcon'
  | { type: 'icon'; iconId: IconId }

export type ResourceType =
  | 'HP'
  | 'AP'
  | 'FP'
  | 'Energy'
```

### IntentEffect 定義

```typescript
// ==============================
// IntentEffect (Final)
// ==============================

export type IntentEffect =
  // ----------------------------
  // Damage / HP
  // ----------------------------
  | {
      kind: 'Damage'
      base: number
      scaleBy?: 'statusCount' | 'missingHp' | 'poisonStacks'
      target: DamageTarget
    }

  | {
      kind: 'Heal'
      base: number
      scaleBy?: 'statusCount' | 'overheal'
      target: CharacterTarget
    }

  // ----------------------------
  // CT / Timeline
  // ----------------------------
  | {
      kind: 'CtChange'
      delta: number
      target: CtTarget
    }

  | {
      kind: 'CancelAction'
      target: ActionTarget
    }

  // ----------------------------
  // Status
  // ----------------------------
  | {
      kind: 'ApplyStatus'
      statusId: StatusId
      stacks: number
      target: CharacterTarget
    }

  | {
      kind: 'RemoveStatus'
      statusId: StatusId
      target: CharacterTarget
    }

  // ----------------------------
  // Resource
  // ----------------------------
  | {
      kind: 'GainResource'
      resource: ResourceType
      amount: number
      target: CharacterTarget
    }

  | {
      kind: 'LoseResource'
      resource: ResourceType
      amount: number
      target: CharacterTarget
    }

  // ----------------------------
  // Card / Deck
  // ----------------------------
  | {
      kind: 'Draw'
      count: number
      target: 'player'
    }

  | {
      kind: 'Discard'
      count: number
      target: 'player'
      reason: 'effect'
    }
```

---

## 3. Effectキュー(IntentEffectの管理)

### キュー構造

```typescript
type EffectQueueItem = {
  source: EffectSource   // card / status / relic / ability
  intent: IntentEffect
}
```

### ルール

- キューに積むのは IntentEffectのみ
- 即時実行は禁止
- この段階では順序管理のみ行う

---

## 4. 解決順(優先度)

### 解決カテゴリ(固定)

1. 行動阻害 / キャンセル系
2. CT / Speed操作
3. ダメージ / HP変動
4. リソース操作
5. 状態付与 / 更新
6. その他

### 実装指針

```typescript
priority(intent): number
```

キューは priority昇順 → FIFO で処理する

---

## 5. Resolve(評価フェーズ)

### 定義

IntentEffect を現在のゲーム状態を参照して ResolvedEffect に変換する唯一の判断フェーズ。

```typescript
ResolvedEffect[] = resolve(intent, gameState)
```

### resolver が参照する情報

- 状態数
- タイムライン(TimelineIcon)
- 軽減 / 無効 / 置換ルール
- owner / source

### resolver の責務

- 対象の確定
- 数値の確定
- 無効化判定(例: 無敵)
- 置換処理(例: ダメージ → シールド消費)

**条件分岐・参照ロジックはすべて resolver に集約する。**

---

## 6. Execute(実行フェーズ)

### 定義

ResolvedEffect をそのまま実行する。

```typescript
execute(resolvedEffect)
```

### 許可される処理

- HPの増減
- CTの書き換え
- Statusの追加・更新
- リソース変動

### 禁止事項

- 条件分岐
- 状態参照
- 判定ロジック

### 実行後

必ず Event を発火する。

```typescript
emit({ type: 'DamageApplied', ... })
```

---

## 7. 実行ループ(再帰禁止)

### 基本ループ

```typescript
while (effectQueue.notEmpty()) {
  const item = dequeue()
  const resolved = resolve(item.intent, state)
  for (const r of resolved) {
    execute(r)
  }
}
```

**再帰呼び出しは禁止**

Event → Intent → キュー追加 → ループ処理のみ

---

## 8. 処理例(カード1枚)

### プレイヤーがカード使用

1. カードが IntentEffect を生成
2. キューに追加

### 処理

1. **Intent: Damage**
2. **resolve** → ApplyDamage(18)
3. **execute** → HP減少
4. **emit** DamageApplied

### Event反応

- 毒Status → Intent: Damage
- レリック → Intent: Heal
- → キュー追加 → 優先順で解決
- → 自然に連鎖処理が進行

---

## 9. 無限ループ防止

最低限、以下のいずれかを採用する:

- 同一Eventから生成される IntentEffect は1回のみ
- 1フレーム内の最大解決数に上限を設ける(例: 100)