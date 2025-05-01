
import { Scene } from "@babylonjs/core";

import { InputHandler } from "../InputHandler";

export abstract class BaseScene {
    protected scene: Scene;
    protected inputHandler: InputHandler;

    constructor(engine: any) {
        this.scene = new Scene(engine);
        this.inputHandler = new InputHandler();
    }

    public abstract update(dt: number) : void;

    public render() {
        this.scene.render();
    }
}