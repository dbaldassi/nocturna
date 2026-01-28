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
    private currentPlatformId: string | null = null;
    private platformCollisionObservers: Map<string, any> = new Map();

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

        // Reset phase 2 instruction state when loading a new level
        if (TutorialScene.sceneIndex === 1) {
            this.phase2InstructionSwitch = false;
            this.currentPlatformId = null;
        }

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

        // Clean up collision observers
        this.cleanupPlatformCollisionObservers();

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

        // Hide tutorial instructions when showing end tutorial screen
        this.hideTutorialInstruction();

        const menuButton = document.getElementById("finish-tutorial-button") as HTMLElement;
        menuButton.addEventListener("click", () => {
            window.location.href = "index.html";
        }, { once: true });
    }

    protected override setupCollisions() {
        super.setupCollisions();
        
        // Clean up any existing collision observers
        this.cleanupPlatformCollisionObservers();
        
        // Add special collision handling for phase 2 platforms
        if (TutorialScene.sceneIndex === 1) {
            this.gameObjects.forEach((object) => {
                const mesh = object.getMesh();
                if (object.getType() === "fixed_platform" && mesh.physicsBody) {
                    mesh.physicsBody.setCollisionCallbackEnabled(true);

                    const observer = mesh.physicsBody.getCollisionObservable().add((collider) => {
                        if (collider.collidedAgainst === this.player.getMesh().physicsBody) {
                            const platformId = object.getId();
                            this.onPlatformContact(platformId);
                        }
                    });
                    this.platformCollisionObservers.set(object.getId(), observer);
                }
            });
        }
    }

    private cleanupPlatformCollisionObservers() {
        this.platformCollisionObservers.forEach((observer) => {
            if (observer && observer.remove) {
                observer.remove();
            }
        });
        this.platformCollisionObservers.clear();
        }

    private onPlatformContact(platformId: string) {
        // platform_0 is the first moving platform - show rotation instructions
        if (platformId === "platform_2") {
            if (this.phase2InstructionSwitch) {
                // Player returned to first platform, show first instruction again
                this.phase2InstructionSwitch = false;
                this.currentPlatformId = platformId;
                this.updatePhase2Instruction();
            }
        } else if (platformId === "platform_5") {
            // platform_3 is the second moving platform - show axis selection instructions
            if (!this.phase2InstructionSwitch) {
                this.phase2InstructionSwitch = true;
                this.currentPlatformId = platformId;
                this.updatePhase2Instruction();
            }
        }
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
            // Phase 2: Platform rotation instructions
            // Don't reset phase2InstructionSwitch - keep the state based on platform collisions
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

    public override update(dt: number) {
        super.update(dt);
        
        // Check if we need to hide instructions when transitioning to end state
        if (this.checkWin() || this.checkLoose()) {
            this.hideTutorialInstruction();
        }
    }
}
