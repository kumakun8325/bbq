import Phaser from 'phaser';

export class VirtualJoystick extends Phaser.GameObjects.Container {
    private base: Phaser.GameObjects.Arc;
    private stick: Phaser.GameObjects.Arc;
    private _isDown: boolean = false;
    private _pointerId: number | null = null;
    private _vector: Phaser.Math.Vector2;
    private maxDistance: number = 50; // スティックの可動範囲

    constructor(scene: Phaser.Scene, x: number, y: number, size: number = 100) {
        super(scene, x, y);

        this.maxDistance = size / 2;
        this._vector = new Phaser.Math.Vector2(0, 0);

        // ベース部分（半透明の円）
        this.base = scene.add.arc(0, 0, size / 2, 0, 360, false, 0xffffff, 0.2);
        this.base.setStrokeStyle(2, 0xffffff, 0.5);
        this.add(this.base);

        // スティック部分（操作する円）
        this.stick = scene.add.arc(0, 0, size / 4, 0, 360, false, 0xffffff, 0.5);
        this.add(this.stick);

        // コンテナ自体をインタラクティブにはせず、シーン全体の入力で制御する
        // (誤操作防止のため、特定のエリアだけで反応するようにセットアップ)

        // 画面サイズに応じて配置調整などは呼び出し側で行う
        scene.add.existing(this);
        this.setScrollFactor(0); // カメラ移動に追従しない
        this.setDepth(10000); // 最前面に表示

        this.setupInput(scene);
    }

    private setupInput(scene: Phaser.Scene): void {
        // マルチタッチ対応のため、特定のポインターIDを追跡
        scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // タッチ位置がジョイスティックの近く（半径の2倍程度）なら有効化
            const d = Phaser.Math.Distance.Between(this.x, this.y, pointer.x, pointer.y);
            if (d < this.maxDistance * 2.5) {
                this._pointerId = pointer.id;
                this._isDown = true;
                this.updateStick(pointer.x, pointer.y);
            }
        });

        scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this._isDown && pointer.id === this._pointerId) {
                this.updateStick(pointer.x, pointer.y);
            }
        });

        // 離した時の処理
        const onUp = (pointer: Phaser.Input.Pointer) => {
            if (pointer.id === this._pointerId) {
                this._isDown = false;
                this._pointerId = null;
                this._vector.set(0, 0);
                this.stick.setPosition(0, 0);
            }
        };

        scene.input.on('pointerup', onUp);
        scene.input.on('pointerupoutside', onUp);
    }

    private updateStick(x: number, y: number): void {
        const dx = x - this.x;
        const dy = y - this.y;

        // 角度と距離を計算
        const angle = Math.atan2(dy, dx);
        let dist = Math.sqrt(dx * dx + dy * dy);

        // 可動範囲内に制限
        if (dist > this.maxDistance) {
            dist = this.maxDistance;
        }

        // スティック位置更新
        this.stick.setPosition(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist
        );

        // 出力ベクトル計算 (-1.0 ~ 1.0)
        this._vector.set(
            Math.cos(angle) * (dist / this.maxDistance),
            Math.sin(angle) * (dist / this.maxDistance)
        );
    }

    // パブリックAPI
    public get isDown(): boolean {
        return this._isDown;
    }

    public get x_axis(): number {
        return this._vector.x;
    }

    public get y_axis(): number {
        return this._vector.y;
    }

    public get direction(): 'up' | 'down' | 'left' | 'right' | null {
        if (!this._isDown || this._vector.length() < 0.2) return null;

        const absX = Math.abs(this._vector.x);
        const absY = Math.abs(this._vector.y);

        if (absX > absY) {
            return this._vector.x > 0 ? 'right' : 'left';
        } else {
            return this._vector.y > 0 ? 'down' : 'up';
        }
    }
}
