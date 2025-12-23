import Phaser from 'phaser';

/**
 * バーチャルゲームパッド
 * 左側にジョイスティック、右側に4ボタン(A,B,X,Y)を配置
 */
export class VirtualGamepad extends Phaser.GameObjects.Container {
    // ジョイスティック部品
    private base!: Phaser.GameObjects.Arc;
    private stick!: Phaser.GameObjects.Arc;

    // ボタン部品
    private btnA!: Phaser.GameObjects.Arc;
    private btnB!: Phaser.GameObjects.Arc;
    private btnX!: Phaser.GameObjects.Arc;
    private btnY!: Phaser.GameObjects.Arc;

    // 状態
    private _stickIsDown: boolean = false;
    private _pointerId: number | null = null;
    private _vector: Phaser.Math.Vector2;
    private maxDistance: number = 60; // スティック可動範囲

    // ボタン状態
    public A: boolean = false;
    public B: boolean = false;
    public X: boolean = false;
    public Y: boolean = false;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);

        this._vector = new Phaser.Math.Vector2(0, 0);

        // 画面サイズ取得
        const width = scene.scale.width;
        const height = scene.scale.height;

        // レイヤー設定（最前面）
        this.setScrollFactor(0);
        this.setDepth(10000);

        // ジョイスティック作成 (左下)
        this.createJoystick(scene, 120, height - 120);

        // ボタン作成 (右下)
        // A: 決定 (右)
        this.btnA = this.createButton(scene, width - 80, height - 100, 'A', 0xff0000);
        // B: キャンセル (下)
        this.btnB = this.createButton(scene, width - 160, height - 60, 'B', 0xffff00);
        // X: メニュー (上)
        this.btnX = this.createButton(scene, width - 80, height - 180, 'X', 0x0000ff);
        // Y: サブ (左)
        this.btnY = this.createButton(scene, width - 160, height - 140, 'Y', 0x00ff00);

        scene.add.existing(this);
        this.setupInput(scene);
    }

    private createJoystick(scene: Phaser.Scene, x: number, y: number): void {
        // ベース（半透明の濃い円）
        this.base = scene.add.arc(x, y, 60, 0, 360, false, 0xffffff, 0.2);
        this.base.setStrokeStyle(4, 0xffffff, 0.5);
        this.add(this.base);

        // スティック
        this.stick = scene.add.arc(x, y, 30, 0, 360, false, 0xffffff, 0.5);
        this.add(this.stick);
    }

    private createButton(scene: Phaser.Scene, x: number, y: number, label: string, color: number): Phaser.GameObjects.Arc {
        const btn = scene.add.arc(x, y, 35, 0, 360, false, 0xffffff, 0.2);
        btn.setStrokeStyle(3, 0xffffff, 0.5);

        const text = scene.add.text(x, y, label, {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add(btn);
        this.add(text);

        // タッチインタラクション
        btn.setInteractive(new Phaser.Geom.Circle(0, 0, 35), Phaser.Geom.Circle.Contains);

        // ボタンイベント
        btn.on('pointerdown', () => this.updateButtonState(label, true));
        btn.on('pointerup', () => this.updateButtonState(label, false));
        btn.on('pointerout', () => this.updateButtonState(label, false));

        // 視覚フィードバック
        btn.on('pointerdown', () => btn.setFillStyle(0xffffff, 0.5));
        btn.on('pointerup', () => btn.setFillStyle(0xffffff, 0.2));
        btn.on('pointerout', () => btn.setFillStyle(0xffffff, 0.2));

        return btn;
    }

    private updateButtonState(label: string, isDown: boolean): void {
        switch (label) {
            case 'A': this.A = isDown; break;
            case 'B': this.B = isDown; break;
            case 'X': this.X = isDown; break;
            case 'Y': this.Y = isDown; break;
        }
    }

    private setupInput(scene: Phaser.Scene): void {
        // ジョイスティック操作
        scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // ベース付近のタッチのみ反応
            const d = Phaser.Math.Distance.Between(this.base.x, this.base.y, pointer.x, pointer.y);
            if (d < 100) {
                this._pointerId = pointer.id;
                this._stickIsDown = true;
                this.updateStick(pointer.x, pointer.y);
            }
        });

        scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this._stickIsDown && pointer.id === this._pointerId) {
                this.updateStick(pointer.x, pointer.y);
            }
        });

        const onUp = (pointer: Phaser.Input.Pointer) => {
            if (pointer.id === this._pointerId) {
                this._stickIsDown = false;
                this._pointerId = null;
                this._vector.set(0, 0);
                this.stick.setPosition(this.base.x, this.base.y);
            }
        };

        scene.input.on('pointerup', onUp);
        scene.input.on('pointerupoutside', onUp);
    }

    private updateStick(x: number, y: number): void {
        const dx = x - this.base.x;
        const dy = y - this.base.y;

        const angle = Math.atan2(dy, dx);
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.maxDistance) {
            dist = this.maxDistance;
        }

        this.stick.setPosition(
            this.base.x + Math.cos(angle) * dist,
            this.base.y + Math.sin(angle) * dist
        );

        this._vector.set(
            Math.cos(angle) * (dist / this.maxDistance),
            Math.sin(angle) * (dist / this.maxDistance)
        );
    }

    // パブリックAPI
    public get isStickDown(): boolean {
        return this._stickIsDown;
    }

    public get x_axis(): number {
        return this._vector.x;
    }

    public get y_axis(): number {
        return this._vector.y;
    }

    public get direction(): 'up' | 'down' | 'left' | 'right' | null {
        if (!this._stickIsDown || this._vector.length() < 0.2) return null;

        const absX = Math.abs(this._vector.x);
        const absY = Math.abs(this._vector.y);

        if (absX > absY) {
            return this._vector.x > 0 ? 'right' : 'left';
        } else {
            return this._vector.y > 0 ? 'down' : 'up';
        }
    }
}
