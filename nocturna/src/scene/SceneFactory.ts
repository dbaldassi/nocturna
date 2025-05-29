import { Scene, Engine } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { GameScene } from "./GameScene";
import { EditorScene } from "./EditorScene";
import { InputHandler } from "../InputHandler";
import { TutorialScene } from "./TutorialScene";
import { MultiScene } from "./MultiScene";

/**
 * SceneFactory is responsible for creating and initializing scenes in Nocturna.
 * 
 * Provides a static interface to instantiate different types of scenes (singleplayer, editor, tutorial, multiplayer)
 * based on a string identifier. Each scene is created asynchronously and returns a BaseScene instance.
 */
export class SceneFactory {
    private static scenes: { [key: string]: (engine: Engine, inputHandler: InputHandler) => Promise<BaseScene> } = {
        singleplayer: (engine: Engine, inputHandler: InputHandler) => GameScene.createScene(engine, inputHandler),
        editor: (engine: Engine, inputHandler: InputHandler) => EditorScene.createScene(engine, inputHandler),
        tutorial: (engine, inputHandler) => TutorialScene.createScene(engine, inputHandler),
        multiplayer: (engine: Engine, inputHandler: InputHandler) => MultiScene.createScene(engine, inputHandler),
    };

    /**
     * Creates a scene based on its name.
     * @param name The name of the scene to create ("singleplayer", "editor", "tutorial", "multiplayer").
     * @param engine The Babylon.js engine instance.
     * @param inputHandler The input handler for the scene.
     * @returns A promise resolving to the requested scene instance.
     * @throws If the scene name is not found in the factory.
     */
    public static async createScene(name: string, engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const sceneCreator = this.scenes[name];
        if (!sceneCreator) {
            throw new Error(`Scene "${name}" not found in SceneFactory.`);
        }

        return sceneCreator(engine, inputHandler);
    }
}