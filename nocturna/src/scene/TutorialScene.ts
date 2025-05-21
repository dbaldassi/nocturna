import { Engine, Vector3, FreeCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight, FollowCamera, Scene } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";
import { InputHandler } from "../InputHandler";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { ParentNode } from "../ParentNode"; // Ensure correct ParentNode type is imported
import { GameObject, GameObjectConfig, GameObjectFactory, GameObjectVisitor } from "../types";
import { Player } from "../GameObjects/Player";
import { Cube } from "../Cube";
import { VictoryCondition } from "../GameObjects/Victory";
import { GameScene, LoadingState } from "./GameScene";

export class TutorialScene extends GameScene {
    protected static override sceneName: string = "tutorial.json";
    protected static sceneOrder: string[] = ["jump.json", "platforms.json", "spike_trap.json", "rocket.json"];
    protected static sceneIndex: number = 0;

    static async createScene(engine: Engine, inputHandler: InputHandler, tutorialScene: TutorialScene = null): Promise<BaseScene> {
        let scene = null;
        if (tutorialScene) {
            scene = tutorialScene;
        } else {
            scene = new TutorialScene(engine, inputHandler);
        }
        await scene.addPhysic();
        scene.state = new LoadingState(scene);
        scene.loadLevel(this.sceneOrder[this.sceneIndex]);
        VictoryCondition.mode = "tutorial";
        return scene;
    }

    public async recreateScene() {
        TutorialScene.sceneIndex += 1;
        this.state.exit();
        this.state = new LoadingState(this);
        this.state.enter();

        this.gameObjects = []
        this.player = null;
        this.parent = null;

        this.cube = null;

        this.scene.dispose();
        this.scene = new Scene(this.engine);
        this.levelLoader.setScene(this.scene);
        if (TutorialScene.sceneIndex >= TutorialScene.sceneOrder.length) {
            this.showEndTutorial();
            return;
        }
        TutorialScene.createScene(this.engine, this.inputHandler, this);
    }

    public showEndTutorial() {
        const showEndTutorial = document.getElementById("end-tutorial") as HTMLElement;
        showEndTutorial.classList.remove("hidden");

        const menuButton = document.getElementById("finish-tutorial-button") as HTMLElement;
        menuButton.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

}