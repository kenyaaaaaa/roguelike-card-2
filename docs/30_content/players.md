// player.ts (fully aligned to current spec)
// - Effects are IntentEffect ONLY (Event -> Intent -> Resolve -> Execute)
// - No direct state mutation or "PlayerEffect" legacy
// - PlayerDefinition is STATIC (no battle-time mutable fields)
// - Battle-time values (current HP/FP/AP, statuses, timeline icons) live in BattleState
//
// Notes:
// - If you already have shared types (IntentEffect/CharacterTarget/etc), replace local copies with imports.
// - "SwapCt" is intentionally introduced as an IntentEffect to keep timeline operations explicit and testable.

//////////////////////
// Core Identifiers
//////////////////////

export type PlayerId = 'vanguard' | 'plaguebearer' | 'bloodlord'

export type StatusId = string
export type CardId = string
export type IconId = string
export type PlayerAbilityId = string
export type RelicId = string

//////////////////////
// Target Types (same as enemy.ts / effect model)
//////////////////////

export type CharacterId = { kind: 'player' } | { kind: 'enemy'; index: number }

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

export type ResourceType = 'HP' | 'AP' | 'FP'

//////////////////////
// IntentEffect (FINAL-ish)
//////////////////////

export type IntentEffect =
  // ----------------------------
  // Damage / HP
  // ----------------------------
  | {
      kind: 'Damage'
      base: number
      target: DamageTarget
      hits?: number
      scaleBy?: 'statusCount' | 'missingHp' | 'poisonStacks'
    }
  | {
      kind: 'Heal'
      base: number
      target: CharacterTarget
      scaleBy?: 'statusCount' | 'overheal'
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
  | {
      // ★Recommended: explicit swap for timeline puzzle
      // Resolve: iconA/iconB must be validated to exist and be owned/allowed
      // Execute: swap their ct values (then resort)
      kind: 'SwapCt'
      iconA: IconId
      iconB: IconId
    }

  // ----------------------------
  // Status
  // ----------------------------
  | {
      kind: 'ApplyStatus'
      statusId: StatusId
      stacks: number
      target: CharacterTarget
      // duration is controlled by Status definition table; keep out of Intent by default
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

export type Effect = IntentEffect

//////////////////////
// Card instance (RunSave spec compatible)
//////////////////////

export type CardInstance = {
  uid: string
  cardId: CardId
  upgrade: number // 0=base, 1=+ ... (matches your save spec)
}

//////////////////////
// Player static resource spec (NOT battle-time values)
//////////////////////

export type PlayerResourceSpec = {
  maxHp: number
  fpMax: number // FP refills to this every turn
  apMax: number // AP is mostly non-regenerating during battle
  speed: number
  abilitySlots: number
}

//////////////////////
// Abilities / Relics
//////////////////////

export type AbilityKind = 'instant' | 'scheduled'

export type PlayerAbilityDefinition = {
  id: PlayerAbilityId
  name: string
  kind: AbilityKind
  costAp: number

  // For kind='scheduled' (rare): baseCt/minCt/payload would be needed.
  // For now, keep abilities instant by default.
  effects: Effect[]

  // UI helpers (optional)
  ui?: {
    short?: string
    description?: string
  }
}

export type RelicTrigger =
  // Align with Event model / executionLog; keep it small and expand later
  | 'OnTurnStart'
  | 'OnTurnEnd'
  | 'OnIconExecuted' // after icon resolves (good for "heavy payoff" etc.)
  | 'OnCardPlayed'
  | 'OnDamageApplied' // generic hook

export type RelicTriggerSpec = {
  trigger: RelicTrigger
  effects: Effect[]
  // Safety valve
  limit?: { type: 'perTurn'; n: number } | { type: 'perBattle'; n: number }
}

export type RelicDefinition = {
  id: RelicId
  name: string
  triggers: RelicTriggerSpec[]
  ui?: { description?: string }
}

//////////////////////
// PlayerDefinition
//////////////////////

export type PlayerDefinition = {
  id: PlayerId
  name: string

  resources: PlayerResourceSpec

  // start loadout (static)
  startingDeck: CardId[] // if you generate uids at run start
  startingRelics: RelicId[]

  // Choose N from candidates at run launch / battle start (your Hub equip flow)
  abilityCandidateIds: PlayerAbilityId[]
}

//////////////////////
// Concrete Content
//////////////////////

// ----------------------------
// Abilities
// ----------------------------

export const playerAbilities: Record<PlayerAbilityId, PlayerAbilityDefinition> = {
  // ===== Vanguard (beginner) =====
  vgd_advance: {
    id: 'vgd_advance',
    name: 'Advance',
    kind: 'instant',
    costAp: 1,
    effects: [{ kind: 'CtChange', target: 'nextPlayerIcon', delta: -10 }],
    ui: {
      short: 'Your next icon CT -10',
      description: 'Reduce the CT of your next scheduled action by 10.',
    },
  },

  vgd_delay: {
    id: 'vgd_delay',
    name: 'Delay',
    kind: 'instant',
    costAp: 1,
    effects: [{ kind: 'CtChange', target: 'nextEnemyIcon', delta: +10 }],
    ui: {
      short: 'Enemy next icon CT +10',
      description: 'Increase the CT of the enemy’s next action by 10.',
    },
  },

  vgd_guard: {
    id: 'vgd_guard',
    name: 'Guard',
    kind: 'instant',
    costAp: 1,
    effects: [{ kind: 'ApplyStatus', target: 'player', statusId: 'block', stacks: 6 }],
    ui: {
      short: 'Block +6',
      description: 'Gain 6 Block.',
    },
  },

  // ===== Plaguebearer (from your v2 doc; keep minimal here) =====
  plg_culture: {
    id: 'plg_culture',
    name: 'Culture',
    kind: 'instant',
    costAp: 1,
    effects: [{ kind: 'ApplyStatus', target: 'enemy', statusId: 'necrosis', stacks: 1 }],
  },

  plg_exacerbate: {
    id: 'plg_exacerbate',
    name: 'Exacerbate',
    kind: 'instant',
    costAp: 2,
    // NOTE: gating "only if necrosis>=1" is enforced by Engine accept table / validator
    effects: [{ kind: 'CtChange', target: 'nextEnemyIcon', delta: +15 }],
  },

  plg_ward: {
    id: 'plg_ward',
    name: 'Ward',
    kind: 'instant',
    costAp: 1,
    effects: [{ kind: 'ApplyStatus', target: 'player', statusId: 'block', stacks: 6 }],
  },

  // ===== Bloodlord (placeholder, keep consistent; tune later) =====
  bld_rush: {
    id: 'bld_rush',
    name: 'Rush',
    kind: 'instant',
    costAp: 1,
    effects: [
      { kind: 'ApplyStatus', target: 'player', statusId: 'haste', stacks: 1 },
      { kind: 'LoseResource', target: 'player', resource: 'HP', amount: 3 },
    ],
    ui: { short: 'Haste +1, HP -3' },
  },
}

// ----------------------------
// Relics
// ----------------------------

export const relics: Record<RelicId, RelicDefinition> = {
  // Vanguard starter relic: "use CT manipulation -> small defense payoff"
  vgd_training_compass: {
    id: 'vgd_training_compass',
    name: 'Training Compass',
    triggers: [
      {
        trigger: 'OnTurnEnd',
        // NOTE: conditional "if used any CT ability this turn" must be checked in resolver/validator.
        // Keep effects simple; the condition lives in relic state or battleRules flags.
        effects: [{ kind: 'ApplyStatus', target: 'player', statusId: 'block', stacks: 3 }],
        limit: { type: 'perTurn', n: 1 },
      },
    ],
    ui: {
      description:
        'At end of turn, if you used a CT ability this turn, gain 3 Block. (Once per turn)',
    },
  },

  // Plaguebearer starter relic (from your doc): when enemy icon executes -> corrosion +1 (cap 2/turn per enemy)
  plg_tainted_hourglass: {
    id: 'plg_tainted_hourglass',
    name: 'Tainted Hourglass',
    triggers: [
      {
        trigger: 'OnIconExecuted',
        // NOTE: needs resolver logic: if executed icon owner is enemy -> ApplyStatus to that enemy
        // and enforce "per enemy 2 per turn" via relic internal state.
        effects: [{ kind: 'ApplyStatus', target: 'enemy', statusId: 'corrosion', stacks: 1 }],
        // limit here is global; per-enemy cap handled by relic state
        limit: { type: 'perTurn', n: 99 },
      },
    ],
  },
}

// ----------------------------
// Players
// ----------------------------

export const players: Record<PlayerId, PlayerDefinition> = {
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard',
    resources: {
      maxHp: 110,
      fpMax: 3,
      apMax: 3,
      speed: 8,
      abilitySlots: 2,
    },
    // Card IDs here are placeholders; wire to your card catalog
    startingDeck: [
      'slash',
      'slash',
      'slash',
      'slash',
      'steady_thrust',
      'small_finisher',
      'parry',
      'parry',
      'parry',
      'tidy_up',
    ],
    startingRelics: ['vgd_training_compass'],
    abilityCandidateIds: ['vgd_advance', 'vgd_delay', 'vgd_guard'],
  },

  plaguebearer: {
    id: 'plaguebearer',
    name: 'Plaguebearer',
    resources: {
      maxHp: 115,
      fpMax: 3,
      apMax: 3,
      speed: 6,
      abilitySlots: 2,
    },
    startingDeck: [
      'corrosion_seed',
      'corrosion_seed',
      'necrosis_seed',
      'weaken_spray',
      'ward_block',
      'ward_block',
      'tidy_up',
      'proliferation',
      'proliferation',
      'collapse',
    ],
    startingRelics: ['plg_tainted_hourglass'],
    abilityCandidateIds: ['plg_culture', 'plg_exacerbate', 'plg_ward'],
  },

  bloodlord: {
    id: 'bloodlord',
    name: 'The Bloodlord',
    resources: {
      maxHp: 105,
      fpMax: 3,
      apMax: 3,
      speed: 9,
      abilitySlots: 2,
    },
    startingDeck: [
      'blood_slash',
      'blood_slash',
      'blood_slash',
      'blood_slash',
      'bite',
      'parry',
      'parry',
      'parry',
      'tidy_up',
      'blood_pact',
    ],
    startingRelics: [],
    abilityCandidateIds: ['bld_rush'],
  },
}

//////////////////////
// Helper (optional)
//////////////////////

export const getPlayer = (id: PlayerId): PlayerDefinition => {
  const p = players[id]
  if (!p) throw new Error(`Unknown playerId: ${id}`)
  return p
}

export const getAbility = (id: PlayerAbilityId): PlayerAbilityDefinition => {
  const a = playerAbilities[id]
  if (!a) throw new Error(`Unknown abilityId: ${id}`)
  return a
}

export const getRelic = (id: RelicId): RelicDefinition => {
  const r = relics[id]
  if (!r) throw new Error(`Unknown relicId: ${id}`)
  return r
}
