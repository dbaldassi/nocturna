
import { Scene } from "@babylonjs/core";

import { InputHandler } from "../InputHandler";

export abstract class BaseScene {
    protected scene: Scene;
    protected inputHandler: InputHandler;

    constructor(engine: any, inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.scene = new Scene(engine);
    }

    public abstract update(dt: number) : void;

    public render() {
        this.scene.render();
    }

    public restart() {
        this.scene.dispose();
        this.scene = new Scene(this.scene.getEngine());
    }
}