import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine } from "@babylonjs/core";
import { BaseScene } from "./scene/BaseScene";
import { SceneFactory } from "./scene/SceneFactory";
import { InputHandler } from "./InputHandler";
import { TutorialScene } from "./scene/TutorialScene";

export class App {
    public static selectedGraphics: string = "low";
    private engine: Engine;
    private scene: BaseScene;
    private canvas: HTMLCanvasElement;
    private inputHandler: InputHandler;

    constructor() {
        this.inputHandler = new InputHandler();
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
                    this.start(selectedMode);
                }
            });
        });

        const buttons = document.querySelectorAll<HTMLButtonElement>('.graphics-btn');

        buttons.forEach(button => {
            // Add click event to toggle active class
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                App.selectedGraphics = button.getAttribute('data-graphics');
                
            });
        });
    }

    async start(mode) {
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
        this.scene = await SceneFactory.createScene(mode, this.engine, this.inputHandler);
        // if scene is tutorial call initUI
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