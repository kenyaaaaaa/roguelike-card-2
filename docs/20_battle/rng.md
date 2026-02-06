RNG仕様

RNGの分離

runRng：ラン全体

battleRng：戦闘ロジック専用

uiRng：演出専用（結果に影響しない）

Run Seed

ラン開始時に runSeed を1つ生成し、セーブデータに保存する。

Battle RNG

戦闘開始時に battleSeed を runRng から派生して生成し、battleRng を初期化する（または battleSeed 自体を保存する）。

使用領域の固定

battleRng は戦闘エンジンの確率処理にのみ使用する。

UI/演出/表示では battleRng を使用しない（必要なら uiRng を使用する）。

RNG呼び出し規約

戦闘ロジックでの乱数取得は、エンジンが提供するラッパー関数を経由して行う（直接 next() を呼ばない）。

ログ

重要イベントごとに、rngCallIndex または結果をログに記録する。

セーブ互換（任意）

戦闘中セーブを行う場合、battleSeed と battleRngState（または rngCallIndex）を保存する。