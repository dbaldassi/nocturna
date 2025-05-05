import { Scene, Engine } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { GameScene } from "./GameScene";
import { EditorScene } from "./EditorScene";
import { InputHandler } from "../InputHandler";
import { TutorialScene } from "./TutorialScene";

export class SceneFactory {
    private static scenes: { [key: string]: (engine: Engine, inputHandler: InputHandler) => Promise<BaseScene> } = {
        singleplayer: (engine: Engine, inputHandler: InputHandler) => GameScene.createScene(engine, inputHandler),
        editor: (engine: Engine, inputHandler: InputHandler) => EditorScene.createScene(engine, inputHandler),
        tutorial: (engine, inputHandler) => TutorialScene.createScene(engine, inputHandler),
    };

    /**
     * Crée une scène en fonction de son nom.
     * @param name Nom de la scène à créer.
     * @param engine L'instance de l'engine Babylon.js.s
     * @returns Une instance de la scène demandée.
     */
    public static async createScene(name: string, engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const sceneCreator = this.scenes[name];
        if (!sceneCreator) {
            throw new Error(`Scene "${name}" not found in SceneFactory.`);
        }

        return sceneCreator(engine, inputHandler);
    }
}