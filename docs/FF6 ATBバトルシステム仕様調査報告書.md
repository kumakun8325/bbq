# FF6 ATBバトルシステム仕様調査報告書

## 1. 概要

本システムは、各キャラクターが個別の「ATBゲージ」を持ち、その蓄積量に応じて行動順が決定されるセミリアルタイムシステムである。素早さ（Speed）のステータスがゲージの蓄積速度に直結し、ステータス異常（ヘイスト、スロウ等）が動的に影響を与える。

---

## 2. ATBゲージの蓄積メカニズム

ATBゲージはフレーム単位（またはティック単位）で増加し、規定の満タン値（一般的に内部値で `65536` または単に `100%`）に達すると行動可能となる。

### 2.1 ゲージ増加量（Tickごとの加算）

基本となるゲージ増加量は、キャラクターの「素早さ」と「ステータス補正」によって決定される。

$$\Delta Gauge = \text{BaseSpeed} + \text{StatusModifier}$$

**各変数の定義:**

- **BaseSpeed**: キャラクター固有の素早さ（0〜255）
- **StatusModifier**:
    - **ヘイスト (Haste)**: $+ (\text{BaseSpeed} / 2)$ 程度の加算（約1.5倍速）
    - **スロウ (Slow)**: $- (\text{BaseSpeed} / 3)$ 程度の減算（約0.66倍速）
    - **ストップ (Stop)**: 増加量 $0$（ゲージ停止）

### 2.2 初期ゲージ（バックアタック/サイドアタック）

戦闘開始時のゲージ量は、エンカウントの種類によって変化する。

- **通常戦闘**: ランダム（0〜最大値の範囲で、素早さが高いほど有利なランダム補正がかかる）
- **バックアタック/挟み撃ち**: 敵側のゲージが満タンに近い状態で開始される。

---

## 3. ダメージ計算式（仕様詳細）

FF6のダメージ計算は、**「基本ダメージの算出」と「倍率補正の適用」**の2段階で行われる。

※以下の式はオリジナル版のアルゴリズムを再現するための近似式およびロジックである。

### 3.1 物理ダメージ (Physical Damage)

物理攻撃の基礎ダメージは「攻撃力（Battle Power）」と「力（Vigor/Strength）」、そして「レベル」に依存する。

### ステップ1: 基本ダメージ値 (Base Damage)

$$\text{BaseDamage} = \text{BattlePower} + \left( \frac{\text{Level}^2 \times \text{BattlePower} \times \text{Vigor}}{256} \times \frac{3}{2} \right)$$

*(注: 実際の内部処理ではオーバーフローを防ぐため、乗算と除算の順序が厳密に定義されている)*

### ステップ2: 倍率補正 (Multipliers)

算出した `BaseDamage` に対し、以下の順で補正を掛ける。

$$\text{FinalDamage} = \text{BaseDamage} \times \left( \frac{Random(224, 255)}{256} \right) \times \text{Modifiers}$$

**主な Modifiers:**

1. **クリティカル**: $2.0$倍（発生時）
2. **バーサク状態**: $1.5$倍
3. **後列補正 (Back Row)**: $0.5$倍
4. **防御 (Defend command)**: $0.5$倍
5. **アトラスの腕輪 (Atlas Armlet)**: $1.25$倍
6. 防御力による軽減:
    
    $$\text{Final} = \text{Damage} \times \left( \frac{255 - \text{Defense}}{256} \right)$$
    

### 3.2 魔法ダメージ (Magic Damage)

魔法攻撃は「魔法威力（Spell Power）」と「魔力（Magic Power）」に依存する。

### ステップ1: 基本魔法ダメージ

$$\text{BaseMagicDamage} = \text{SpellPower} + \left( \frac{\text{Level}^2 \times \text{MagicPower} \times \text{SpellPower}}{256} \times \frac{3}{2} \right)$$

### ステップ2: 魔法倍率補正

物理同様に乱数補正がかかるが、**魔法には「分散ダメージ（Split Damage）」**の概念がある。

- **単体掛け**: 補正なし
- **複数掛け（全体化）**: ダメージ $\times 0.5$
- **シェル状態**: ダメージ $\times 0.66$ (2/3)

---

## 4. 命中と回避 (Hit & Evasion)

FF6（SFC/SNES版）には有名な**「回避率バグ」**が存在するが、新規開発においては修正版（GBA/Pixel Remaster版）のロジックを採用すべきである。

### 4.1 命中判定ロジック（修正版準拠）

攻撃が命中するかどうかは、以下の判定式で行われる。

$$\text{HitChance} (\%) = (\text{BaseHitRate} + \text{AttackerStats}) - \text{TargetEvasion}$$

- **物理回避 (Physical Evade)**: 物理攻撃に対する回避率。
- **魔法回避 (Magic Block)**: 魔法攻撃に対する回避率。

> SFC版の特異仕様（参考）:
> 
> 
> オリジナル版では「物理回避率」のステータスが機能しておらず、物理・魔法すべての回避判定に「魔法回避率（MBlock%）」が使用されていた。
> 

### 4.2 必中攻撃

以下の条件では命中判定をスキップする（必中）。

- 対象が睡眠（Sleep）、石化（Petrify）、ストップ（Stop）、麻痺（Paralyze）状態。
- アルテマなどの防御無視・回避無視属性を持つ攻撃。

---

## 5. 特殊システム仕様

### 5.1 瀕死必殺技 (Desperation Attacks)

各キャラクターに設定された隠し必殺技。以下の条件を満たした状態で「たたかう（Attack）」を選択した際、確率で発動する。

- 発動条件:
    
    $$\text{CurrentHP} < \frac{\text{MaxHP}}{8}$$
    
- 発動確率:
    
    約 $\frac{1}{16}$ (およそ6.25%)
    
    ※「たたかう」入力時に乱数判定が行われ、当選した場合のみ通常攻撃が必殺技に置き換わる。
    

### 5.2 待機モード (Wait Mode)

コンフィグで「ウェイト」を選択した場合の挙動仕様。

- **タイマーストップ条件**:
    - 魔法・アイテム選択のサブウィンドウが開いている間。
    - ターゲット選択カーソルが表示されている間。
    - エフェクト再生中はゲージが止まる（これはアクティブモードでも共通の場合が多いが、演出による）。

### 5.3 連続行動 (Dual Wield / X-Fight)

- **二刀流 (Genji Glove)**:
    - 「右手攻撃」→「左手攻撃」の順に処理。
    - ダメージ計算はそれぞれの武器の攻撃力で個別に行う。
- **みだれうち (Offering / Master's Scroll)**:
    - 4回連続で物理攻撃を行う。
    - ダメージ補正: 1発あたりのダメージは $0.5$倍 になる。
    - ターゲット: ランダムに選択される（指定不可）。

---

## 6. 実装に向けた推奨データ構造

### クラス設計（例）

C#

`class Battler {
    // Core Stats
    int Speed;
    int Vigor; // 力
    int MagicPower; // 魔力
    int Defense;
    int MagicDefense;

    // ATB Logic
    float AtbGauge; // 0.0 to 100.0 (or 0 to 65536)
    float StatusMultiplier; // 1.0 (Normal), 1.5 (Haste), 0.66 (Slow)

    void UpdateATB(float deltaTime) {
        if (IsStopped) return;
        
        // ゲージ加算式
        float increment = (BaseSpeed * StatusMultiplier * deltaTime);
        AtbGauge += increment;

        if (AtbGauge >= MaxGauge) {
            AtbGauge = MaxGauge;
            SetReadyState();
        }
    }
}`

### 開発時の注意点

1. **オーバーフロー対策**: 古典的な計算式（2乗計算など）は数値が大きくなりやすいため、変数の型（Int32/Int64/Float）に注意する。
2. **ウェイトの実装**: UI表示フラグとGlobalTimeScaleを連動させる仕組みが必要。
3. **乱数の偏り**: オリジナルを再現する場合、乱数生成アルゴリズム（RNG）の特性も考慮する必要があるが、現代的な開発では標準の乱数で問題ない。