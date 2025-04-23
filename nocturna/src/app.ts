import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader, TransformNode, AbstractMesh, PointLight, Animation } from "@babylonjs/core";
import { GameScene } from "./GameScene";
import { InputHandler } from "./InputHandler";

export class App {
    engine: Engine;
    scene: GameScene;
    canvas: HTMLCanvasElement;
    inputHandler: InputHandler;

    constructor() {
        document.addEventListener('DOMContentLoaded', () => {
            const cards: NodeListOf<HTMLElement> = document.querySelectorAll('.mode-card');
            const startButton: HTMLElement | null = document.getElementById('start-game');
            let selectedMode: string | null = null;

            if (!startButton) {
                console.error('Start button not found');
                return;
            }

            cards.forEach((card: HTMLElement) => {
                card.addEventListener('click', () => {
                    // Remove selected class from all cards
                    cards.forEach((c: HTMLElement) => c.classList.remove('selected'));

                    // Add selected class to clicked card
                    card.classList.add('selected');

                    // Store selected mode
                    selectedMode = card.dataset.mode || null;

                    // Show start button
                    startButton.classList.remove('hidden');
                    setTimeout(() => {
                        startButton.classList.add('visible');
                    }, 50);
                });
            });

            startButton.addEventListener('click', () => {
                if (selectedMode) {
                    console.log(`Starting ${selectedMode} mode`);
                    //delete the div with id "game-mode-selection"
                    const gameModeSelectionDiv: HTMLElement | null = document.getElementById('game-mode-selection');
                    if (gameModeSelectionDiv) {
                        gameModeSelectionDiv.remove();
                    }
                    switch (selectedMode) {
                        case 'singleplayer':
                            this.start();
                            break;
                        case 'multiplayer':
                            this.start();
                            break;
                        case 'tutorial':
                            this.start();
                            break;
                        default:
                            console.error('Unknown game mode selected');
                    }
                }
            });
        });

        this.inputHandler = new InputHandler();
    }

    async start() {
        // create the canvas html element and attach it to the webpage
        this.canvas = document.createElement("canvas");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // hide overflow
        document.body.style.overflow = "hidden";
        this.canvas.id = "gameCanvas";
        this.canvas.classList.add("game-canvas"); // Add class instead of inline styles
        document.body.appendChild(this.canvas);

        // initialize babylon scene and engine
        this.engine = new Engine(this.canvas, true);
        this.scene = new GameScene(this.engine, this.inputHandler);
        await this.scene.initializeScene();
        this.gameLoop();
    }

    gameLoop() {
        const divFps = document.getElementById("fps");

        // run the main render loop
        this.engine.runRenderLoop(() => {
            this.scene.update(this.engine.getDeltaTime());
            this.scene.render();
            divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
        });
    }


}
const gameEngine = new App();
// gameEngine.start();

export { gameEngine as app };
