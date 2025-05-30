import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine } from "@babylonjs/core";
import { BaseScene } from "./scene/BaseScene";
import { SceneFactory } from "./scene/SceneFactory";
import { InputHandler } from "./InputHandler";
import { NocturnaAudio } from "./NocturnaAudio";
import { CookieManager } from "./utils/CookieManager";

export class App {
    public static selectedGraphics: string = "low";
    private engine: Engine;
    private scene: BaseScene;
    private canvas: HTMLCanvasElement;
    private inputHandler: InputHandler;
    private lastUpdateTime: number = 0;
    public static readonly FPS_LIMIT: number = 120;
    public static readonly FPS_LIMIT_MS: number = 1000 / App.FPS_LIMIT;

    constructor() {
        App.selectedGraphics = CookieManager.get("graphics") || "low";
        this.inputHandler = InputHandler.getInstance();
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
            // Set initial active class based on selected graphics
            if (button.getAttribute('data-graphics') === App.selectedGraphics) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }

            // Add click event to toggle active class
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                App.selectedGraphics = button.getAttribute('data-graphics');

                // Save selected graphics in cookies
                CookieManager.set("graphics", App.selectedGraphics);                
                console.log(`Selected graphics: ${App.selectedGraphics}`);
            });
        });

        this.setupAudioUI();

        NocturnaAudio.getInstance().then(audio => {
            // get slider volume value
            const audioSlider = document.getElementById("audio-slider") as HTMLInputElement;
            if (audioSlider) {
               const volume = parseFloat(audioSlider.value);
               audio.setVolume(volume);
            }
            audio.setBackgroundMusic("assets/music/lobby.mp3", 0.1);
        });
    }

    setupAudioUI() {
        const audioControl = document.getElementById("audio-control");
        const audioIcon = document.getElementById("audio-icon") as HTMLImageElement;
        const audioSlider = document.getElementById("audio-slider") as HTMLInputElement;
        

        if (audioControl && audioIcon && audioSlider) {
            let isMuted = CookieManager.get("muted") === "true";
            audioSlider.value = CookieManager.get("volume") || "0.5"; // Default volume is 0.5 if not set in cookies
            let lastVolume = parseFloat(audioSlider.value);

            NocturnaAudio.getInstance().then(audio => {
                if(isMuted) {
                    audio.setVolume(0); // Mute audio if previously muted
                    audioIcon.src = "/assets/hud/audioOff.png";
                } else {
                    audioIcon.src = "/assets/hud/audioOn.png";
                    audio.setVolume(lastVolume); // Set last volume if not muted
                }
            });
                
            // Affiche le slider au hover
            audioControl.addEventListener("mouseenter", () => {
                audioSlider.style.display = "inline-block";
            });
            audioControl.addEventListener("mouseleave", () => {
                audioSlider.style.display = "none";
            });

            // Slider volume
            audioSlider.addEventListener("input", async () => {
                const audio = await NocturnaAudio.getInstance();

                const volume = parseFloat(audioSlider.value);
                if (audio) {
                    audio.setVolume(volume);
                    CookieManager.set("volume", volume.toString()); // Save volume in cookies
                }
                if (volume === 0) {
                    isMuted = true;
                    audioIcon.src = "/assets/hud/audioOff.png";
                } else {
                    isMuted = false;
                    audioIcon.src = "/assets/hud/audioOn.png";
                    lastVolume = volume;
                }
            });

            // Mute/unmute au clic sur l'icône
            audioIcon.addEventListener("click", async () => {
                const audio = await NocturnaAudio.getInstance();
                if (isMuted) {
                    audioSlider.value = lastVolume.toString();
                    if (audio) audio.setVolume(lastVolume);
                    audioIcon.src = "/assets/hud/audioOn.png";
                    isMuted = false;
                } else {
                    lastVolume = parseFloat(audioSlider.value);
                    audioSlider.value = "0";
                    if (audio) audio.setVolume(0);
                    audioIcon.src = "/assets/hud/audioOff.png";
                    isMuted = true;
                }

                CookieManager.set("muted", isMuted.toString()); // Save muted state in cookies
            });

            const musicControl = document.getElementById("music-control");
            const musicIcon = document.getElementById("music-icon") as HTMLImageElement;

            if (musicControl && musicIcon) {
                let musicMuted = CookieManager.get("musicMuted") === "true";
                if(musicMuted) {
                    NocturnaAudio.getInstance().then(audio => {
                        console.log("Music is muted by default");
                        audio.muteBackgroundMusic(true); // Mute music if previously muted
                    });
                    musicIcon.src = "/assets/hud/musicOff.png";
                } else {
                    musicIcon.src = "/assets/hud/musicOn.png";
                }

                musicControl.addEventListener("click", async () => {
                    const audio = await NocturnaAudio.getInstance();
                    if (musicMuted) {
                        audio.muteBackgroundMusic(false);
                        musicIcon.src = "/assets/hud/musicOn.png";
                        musicMuted = false;
                    } else {
                        audio.muteBackgroundMusic(true);
                        musicIcon.src = "/assets/hud/musicOff.png";
                        musicMuted = true;
                    }

                    CookieManager.set("musicMuted", musicMuted.toString()); // Save music muted state in cookies
                });
            }
        }
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
        this.lastUpdateTime = performance.now();

        // run the main render loop
        this.engine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastUpdateTime;
            if (deltaTime < App.FPS_LIMIT_MS) {
                return; // Skip rendering if the frame is too fast
            }
            this.lastUpdateTime = currentTime;
            
            this.scene.update(this.engine.getDeltaTime());
            this.scene.render();
            
            divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
        });
    }


}

const gameEngine = new App();