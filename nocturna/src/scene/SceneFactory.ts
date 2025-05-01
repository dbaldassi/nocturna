import { Scene, Engine } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { GameScene } from "./GameScene";
import { EditorScene } from "./EditorScene";
// import { AnotherScene } from "./AnotherScene"; // Exemple d'autres scènes

export class SceneFactory {
    private static scenes: { [key: string]: (engine: Engine) => Promise<BaseScene> } = {
        singleplayer: (engine: Engine) => GameScene.createScene(engine),
        editor: (engine: Engine) => EditorScene.createScene(engine),
    };

    /**
     * Crée une scène en fonction de son nom.
     * @param name Nom de la scène à créer.
     * @param engine L'instance de l'engine Babylon.js.s
     * @returns Une instance de la scène demandée.
     */
    public static async createScene(name: string, engine: Engine): Promise<BaseScene> {
        const sceneCreator = this.scenes[name];
        if (!sceneCreator) {
            throw new Error(`Scene "${name}" not found in SceneFactory.`);
        }

        return sceneCreator(engine);
    }
}