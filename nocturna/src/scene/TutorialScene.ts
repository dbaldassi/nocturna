import { Engine, Scene } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";
import { InputHandler } from "../InputHandler";
import { GameObject } from "../types";
import { LoadingState, InGameState } from "../states/GameStates";
import { HpBar } from "../HUD/HpBar";
import { Translation } from "../utils/translation";
import { NocturnaAudio } from "../NocturnaAudio";
import { GameScene } from "./GameScene";

export class TutorialScene extends GameScene {
    protected override sceneName: string = "tutorial.json";
    protected static readonly sceneOrder: string[] = ["jump.json", "platforms.json", "spike_trap.json", "rocket.json"];
    private static readonly explainationsByScene: number[] = [3, 1, 2, 2];
    private static nextStep: boolean = false;
    protected static sceneIndex: number = 0;
    private instructionElement: HTMLElement | null = null;
    private phase2InstructionSwitch: boolean = false;
    private phase2SwitchTimer: number = 0;
    private readonly PHASE2_SWITCH_TIME: number = 15000; // 15 seconds

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
        return scene;
    }

    public hasNextLevel(): boolean {
        return true;
    }

    public onLevelLoaded(): void {
        this.setupCamera();
        this.setupCollisions();
        // start a timer from 0 to infinity
        // this.startTimer();

        this.hpBar = new HpBar(this.player.getMaxHp());

        this.state.exit();
        this.state = new InGameState(this);
        this.state.enter();
        this.pauseScene();
        NocturnaAudio.getInstance().then(audio => {
            audio.setBackgroundMusic("assets/music/background.mp3");
        });
    }

    public async recreateScene() {
        if (TutorialScene.nextStep) {
            TutorialScene.sceneIndex += 1;
        }
        this.state.exit();
        this.state = new LoadingState(this);
        this.state.enter();

        this.gameObjects = []
        this.player = null;
        this.parent = null;

        this.cube = null;
        this.win = false;

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
        
        // Hide in-game tutorial instructions when paused
        this.hideTutorialInstruction();
        
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
        
        // Show in-game tutorial instructions when resuming
        this.showTutorialInstruction();
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
        TutorialScene.nextStep = false;
        this.recreateScene();
    }

    public onQuit() {
        window.location.reload();
    }

    public onContinue() {
        TutorialScene.nextStep = true;
        this.recreateScene();
    }

    private showTutorialInstruction() {
        if (!this.instructionElement) {
            this.instructionElement = document.getElementById("tutorial-instruction");
        }
        
        if (!this.instructionElement) {
            console.warn("Tutorial instruction element not found in DOM");
            return;
        }
        
        const sceneIndex = TutorialScene.sceneIndex;
        
        // Only show instructions for phase 1 and phase 2
        if (sceneIndex === 0) {
            // Phase 1: Jump and movement instructions
            const instructionText = Translation.formatWithKeyBindings(
                "tutorial.ingame.phase1",
                this.inputHandler.getKeyBindings()
            );
            this.instructionElement.innerHTML = instructionText;
            this.instructionElement.classList.remove("hidden");
        } else if (sceneIndex === 1) {
            // Phase 2: Platform rotation instructions (start with first platform)
            // Reset phase 2 timer and switch state
            this.phase2InstructionSwitch = false;
            this.phase2SwitchTimer = 0;
            this.updatePhase2Instruction();
            this.instructionElement.classList.remove("hidden");
        } else {
            // Phase 3 and 4: No instructions
            this.instructionElement.classList.add("hidden");
        }
    }

    private updatePhase2Instruction() {
        if (!this.instructionElement) return;

        const instructionKey = this.phase2InstructionSwitch 
            ? "tutorial.ingame.phase2.platform2" 
            : "tutorial.ingame.phase2.platform1";
        
        const instructionText = Translation.formatWithKeyBindings(
            instructionKey,
            this.inputHandler.getKeyBindings()
        );
        this.instructionElement.innerHTML = instructionText;
    }

    private hideTutorialInstruction() {
        if (this.instructionElement) {
            this.instructionElement.classList.add("hidden");
        }
    }

    public override update() {
        super.update();
        
        // Handle phase 2 instruction switching (only if in phase 2 and not yet switched)
        if (TutorialScene.sceneIndex === 1 && !this.phase2InstructionSwitch) {
            this.phase2SwitchTimer += this.scene.getEngine().getDeltaTime();
            if (this.phase2SwitchTimer >= this.PHASE2_SWITCH_TIME) {
                this.phase2InstructionSwitch = true;
                this.updatePhase2Instruction();
            }
        }
    }
}