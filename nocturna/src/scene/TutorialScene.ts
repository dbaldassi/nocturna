import { Engine, Vector3, FreeCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight, FollowCamera, Scene } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";
import { InputHandler } from "../InputHandler";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { ParentNode } from "../ParentNode"; // Ensure correct ParentNode type is imported
import { GameObject, GameObjectConfig, GameObjectFactory, GameObjectVisitor } from "../types";
import { Player } from "../GameObjects/Player";
import { Cube } from "../Cube";
import { VictoryCondition } from "../GameObjects/Victory";
import { GameScene, LoadingState, InGameState } from "./GameScene";
import { LooseCondition } from "../Loose";
import { HpBar } from "../HpBar";
import { Translation } from "../utils/translation";

export class TutorialScene extends GameScene {
    protected static override sceneName: string = "tutorial.json";
    protected static readonly sceneOrder: string[] = ["jump.json", "platforms.json", "spike_trap.json", "rocket.json"];
    private static readonly explainationsByScene: number[] = [3, 1, 2, 2];
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
        LooseCondition.mode = "tutorial";
        return scene;
    }

    public onLevelLoaded(): void {
        this.setupCamera();
        this.setupCollisions();
        // start a timer from 0 to infinity
        // this.startTimer();
        this.loseCondition = new LooseCondition(this.player, this.cube.getSize()); // Initialize the lose condition

        this.hpBar = new HpBar(this.player.getMaxHp());

        this.state.exit();
        this.state = new InGameState(this);
        this.state.enter();
        this.pauseScene();
    }

    public async recreateScene(nextStep: boolean = false) {
        if (nextStep) {
            TutorialScene.sceneIndex += 1;
        }
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

    private pauseScene() {
        const timer = document.getElementById("game-timer") as HTMLElement;
        timer.classList.add("hidden");
        const pauseOverlay = document.getElementById("pause-overlay") as HTMLElement;
        pauseOverlay.classList.remove("hidden");
        this.displayTutorialExplainations();
        this.gameObjects.forEach((obj: GameObject) => {
            if (obj.onPause) {
                obj.onPause();
            }
        });
        this.inputHandler.onPause();
        const resumeButton = document.getElementById("resume-button") as HTMLElement;
        resumeButton.addEventListener("click", () => {
            this.resumeScene();
        });
    }

    private resumeScene() {
        const pauseOverlay = document.getElementById("pause-overlay") as HTMLElement;
        pauseOverlay.classList.add("hidden");
        this.gameObjects.forEach((obj: GameObject) => {
            if (obj.onResume) {
                obj.onResume();
            }
        });
        this.inputHandler.onResume();
    }

    private displayTutorialExplainations() {
        const container = document.querySelector('.pause-explanations') as HTMLElement;
        container.innerHTML = '';

        for (let i = 1; i <= TutorialScene.explainationsByScene[TutorialScene.sceneIndex]; i++) {
            this.addSectionToPauseMenu(container, i);
        }
    }

    private addSectionToPauseMenu(container: HTMLElement, iteration: number): void {
        const sceneIndex = TutorialScene.sceneIndex;
        const titleKey = `tutorial.phase${sceneIndex + 1}.title${iteration}`;
        const descKey = `tutorial.phase${sceneIndex + 1}.desc${iteration}`;
        const title = Translation.getTranslation(titleKey);
        const desc = Translation.getTranslation(descKey);
        const section = document.createElement('section');
        section.className = 'pause-section';
        section.innerHTML = `
        <h3 class="pause-section-title" data-translate="${titleKey}">${title}</h3>
        <p class="pause-section-desc" data-translate="${descKey}">${desc}</p>
    `;
        container.appendChild(section);
    }

    public onRetry() {
        this.recreateScene();
    }

    public onQuit() {
        window.location.reload();
    }

    public onContinue() {
        this.recreateScene(true);
    }
}