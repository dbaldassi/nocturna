
import { Engine, Vector3, HavokPlugin } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";

export class EditorScene extends BaseScene {

    constructor(engine: Engine) {
        super(engine);
    }

    static async createScene(engine: Engine) {
        const scene = new EditorScene(engine);

        return scene;
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
    }
}