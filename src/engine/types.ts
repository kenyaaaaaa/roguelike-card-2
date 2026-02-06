export type SceneId =
  | 'S00_BOOT'
  | 'S01_TITLE'
  | 'S02_TITLE_OPTION'
  | 'S03_SAVE_SELECT'
  | 'S10_HUB'
  | 'S20_AREA_PROGRESS'
  | 'S21_EVENT'
  | 'S22_MINIGAME'
  | 'S23_SHOP'
  | 'S24_SHRINE'
  | 'S30_BATTLE'
  | 'S31_BATTLE_REWARD'
  | 'S70_GAMEOVER_DEATH'
  | 'S71_RUN_RESULT';

export type UIAction = {
  type: string;
  payload?: Record<string, unknown>;
};
