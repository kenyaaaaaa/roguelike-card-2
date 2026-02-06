import type { SceneId, UIAction } from '../types';

const ACCEPT_TABLE: Record<SceneId, Set<UIAction['type']>> = {
  S00_BOOT: new Set(['BOOT_DONE']),
  S01_TITLE: new Set([]),
  S02_TITLE_OPTION: new Set([]),
  S03_SAVE_SELECT: new Set([]),
  S10_HUB: new Set([]),
  S20_AREA_PROGRESS: new Set([]),
  S21_EVENT: new Set([]),
  S22_MINIGAME: new Set([]),
  S23_SHOP: new Set([]),
  S24_SHRINE: new Set([]),
  S30_BATTLE: new Set([]),
  S31_BATTLE_REWARD: new Set([]),
  S70_GAMEOVER_DEATH: new Set([]),
  S71_RUN_RESULT: new Set([]),
};

export const isActionAccepted = (sceneId: SceneId, action: UIAction): boolean => {
  return ACCEPT_TABLE[sceneId]?.has(action.type) ?? false;
};
