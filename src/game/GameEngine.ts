import { Engine, Scene } from '@babylonjs/core';
import { Havok } from 'havok-js';

export class GameEngine {
    private engine: Engine;
    private scene: Scene;
    private lastTime: number;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.lastTime = 0;
    }

    public start(): void {
        this.engine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            this.update(deltaTime);
            this.render();
        });
    }

    public update(deltaTime: number): void {
        // Update game logic here
    }

    public render(): void {
        this.scene.render();
    }

    public stop(): void {
        this.engine.stopRenderLoop();
    }
}