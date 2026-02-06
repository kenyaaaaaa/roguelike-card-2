import { describe, expect, it } from 'vitest';

import { init, step, type ActionEnvelope } from '../../src/engine/index';

describe('Engine.step', () => {
  it('returns a new nextState without mutating previous state', () => {
    const state = init();
    const envelope: ActionEnvelope = {
      clientSeq: 1,
      action: { type: 'BOOT_DONE' },
    };

    const result = step(state, envelope);

    expect(result.nextState).not.toBe(state);
    expect(state.client.lastProcessedSeq).toBe(-1);
    expect(result.nextState.client.lastProcessedSeq).toBe(1);
  });
});
