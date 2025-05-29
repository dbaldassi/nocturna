/**
 * EndScreenHUD.ts defines the interfaces and classes for displaying end-of-level screens (win/lose)
 * in both singleplayer and multiplayer modes.
 * 
 * Responsibilities:
 * - Provides interfaces for HUD display and event listeners.
 * - Implements concrete HUD classes for win and lose screens, including multiplayer variants.
 * - Handles UI updates, button actions (retry, continue, quit), and animated score display.
 * - Supports random death messages for lose screens.
 * - Integrates with the DOM to show/hide relevant overlays and update content.
 * 
 * Usage:
 * - Use the factory functions (`createWinScreenHUD`, `createLoseScreenHUD`, etc.) to create HUD instances.
 * - Pass an `IEndScreenHUDListener` to handle user actions.
 * - Call `update(dt, input)` in the game loop to animate scores.
 * - Call `dispose()` to clean up listeners and hide overlays.
 */

import { CharacterInput } from "../types";

/**
 * IEndScreenHUD defines the interface for end screen HUDs.
 */
export interface IEndScreenHUD {
    update(deltaTime: number, input: CharacterInput): void;
    dispose(): void;
}

/**
 * IEndScreenHUDListener defines callbacks for end screen actions.
 */
export interface IEndScreenHUDListener {
    onRetry(): void;
    onContinue(): void;
    onQuit(): void;
}

/**
 * Factory function to create a win screen HUD.
 * @param listener The HUD event listener.
 * @param mode The mode ("continue" or "normal").
 * @param score The final score.
 * @param time The completion time.
 */
export function createWinScreenHUD(listener: IEndScreenHUDListener, mode: string, score: number, time: number): WinScreenHUD {
    return new WinScreenHUD(listener, mode, score, time);
}

/**
 * Factory function to create a lose screen HUD.
 * @param listener The HUD event listener.
 * @param targetScore The target score.
 * @param time The completion time.
 */
export function createLoseScreenHUD(listener: IEndScreenHUDListener, targetScore: number, time: number): loseScreenHUD {
    return new loseScreenHUD(listener, targetScore, time);
}

/**
 * Factory function to create a multiplayer lose screen HUD.
 * @param listener The HUD event listener.
 */
export function createMultiLoseScreenHUD(listener: IEndScreenHUDListener): MultiLoseScreenHUD {
    return new MultiLoseScreenHUD(listener);
}

/**
 * Factory function to create a multiplayer win screen HUD.
 * @param listener The HUD event listener.
 */
export function createMultiWinScreenHUD(listener: IEndScreenHUDListener): MultiWinScreenHUD {
    return new MultiWinScreenHUD(listener);
}

/**
 * EndScreenHUD is an abstract base class for all end screen HUDs.
 * - Manages observer listeners and message display.
 * - Provides methods to show/hide overlays and set random messages.
 */
abstract class EndScreenHUD implements IEndScreenHUD {
    protected observers: IEndScreenHUDListener[] = [];
    protected messages: string[] = [];

    constructor(listener: IEndScreenHUDListener) {
        this.observers.push(listener);
    }

    /**
     * Displays the HUD overlay by removing the "hidden" class.
     * @param balise The DOM element ID to show.
     */
    protected display(balise: string): void {
        const loseScreen = document.getElementById(balise) as HTMLElement;
        loseScreen.classList.remove("hidden");
    }

    /**
     * Hides the HUD overlay by adding the "hidden" class.
     * @param balise The DOM element ID to hide.
     */
    public hide(balise: string): void {
        const loseScreen = document.getElementById(balise) as HTMLElement;
        loseScreen.classList.add("hidden");
    }

    /**
     * Sets a random message from the messages array in the specified DOM element.
     * @param balise The DOM element ID to update.
     */
    protected setRandomMessage(balise: string): void {
        const deathMessageElement = document.getElementById(balise) as HTMLElement;
        const randomIndex = Math.floor(Math.random() * this.messages.length);
        deathMessageElement.textContent = this.messages[randomIndex];
    }

    /**
     * Updates the HUD (default: no-op).
     */
    public update(_: number, __: CharacterInput): void {}

    /**
     * Disposes the HUD and cleans up resources (abstract).
     */
    abstract dispose(): void;
}

/**
 * BaseEndScreenHUD extends EndScreenHUD to add score/time animation logic.
 */
abstract class BaseEndScreenHUD extends EndScreenHUD {
    private targetScore: number = 0;
    private time: number = 0;
    private current: number = 0;

    constructor(listener: IEndScreenHUDListener, targetScore: number, time: number) {
        super(listener);
        this.targetScore = targetScore;
        this.time = time;
    }

    /**
     * Animates the display of the final time in mm:ss format.
     * @param balise The DOM element ID to update.
     */
    protected animateScore(balise: string): void {
        const finalTimerElement = document.getElementById(balise);
        const finalTime = Math.floor(this.time / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        finalTimerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Animates the score incrementally up to the target score.
     * @param balise The DOM element ID to update.
     * @param dt The delta time.
     */
    protected updateScore(balise: string, dt: number): void {
        const finalScoreElement = document.getElementById(balise);

        this.current += dt;
        if (this.current >= this.targetScore) {
            finalScoreElement.textContent = this.targetScore.toLocaleString();
        } else {
            finalScoreElement.textContent = Math.floor(this.current).toLocaleString();
        }
    }
}

/**
 * WinScreenHUD displays the win screen, handles continue/retry/quit actions, and animates the score.
 */
class WinScreenHUD extends BaseEndScreenHUD {
    protected mode: string = "normal";

    constructor(listener: IEndScreenHUDListener, mode: string, score: number, time: number) {
        super(listener, score, time);

        this.mode = mode;
        this.display();
    }

    public onRetry(): void {
        this.observers.forEach(obs => obs.onRetry());
    }
    public onContinue(): void {
        this.observers.forEach(obs => obs.onContinue());
    }
    public onQuit(): void {
        this.observers.forEach(obs => obs.onQuit());
    }

    /**
     * Initializes button event listeners for continue/retry/quit.
     */
    protected initialiseButtons(): void {
        const restartButton = document.getElementById("continue-button") as HTMLElement;
        const menuButton = document.getElementById("win-menu-button") as HTMLElement;
        if (this.mode == "normal") {
            restartButton.textContent = "Restart";
            restartButton.addEventListener("click", this.onRetry.bind(this));
        } else if (this.mode == "continue") {
            restartButton.textContent = "Continue";
            restartButton.addEventListener("click", this.onContinue.bind(this));
        }

        menuButton.addEventListener("click", this.onQuit.bind(this));
    }

    /**
     * Displays the win screen and initializes buttons and score.
     */
    protected display(): void {
        super.display("win-screen");
        this.initialiseButtons();
        this.animateScore("final-timer");
    }

    /**
     * Cleans up event listeners and hides the win screen.
     */
    public dispose(): void {
        this.hide("win-screen");
        const restartButton = document.getElementById("continue-button") as HTMLElement;
        if(this.mode == "normal") restartButton.removeEventListener("click", this.onRetry.bind(this));
        else restartButton.removeEventListener("click", this.onContinue.bind(this));
        const menuButton = document.getElementById("win-menu-button") as HTMLElement;
        menuButton.removeEventListener("click", this.onQuit.bind(this));

        this.observers = [];
    }

    /**
     * Updates the animated score display.
     */
    public update(dt: number, _: CharacterInput): void {
        this.updateScore("final-score", dt);
    }
}

/**
 * loseScreenHUD displays the lose screen, handles retry/quit actions, and animates the score.
 * Also displays a random death message.
 */
class loseScreenHUD extends BaseEndScreenHUD {

    constructor(listener: IEndScreenHUDListener, targetScore: number, time: number) {
        super(listener, targetScore, time);
        this.messages = [
            "The darkness has consumed you...",
            "Your light has been extinguished...",
            "The night claims another soul...",
            "The shadows have overwhelmed you...",
            "Your journey ends here... for now...",
        ];

        this.display();
    }

    /**
     * Displays the lose screen, sets a random message, and initializes buttons and score.
     */
    protected display(): void {
        super.display("game-over-screen");
        this.setRandomMessage("death-message");
        this.initialiseButtons();
        this.animateScore("loose-timer");
    }

    /**
     * Cleans up event listeners and hides the lose screen.
     */
    public dispose(): void {
        this.hide("game-over-screen");
        const restartButton = document.getElementById("retry-button") as HTMLElement;
        restartButton.removeEventListener("click", this.onRetry.bind(this));
        const menuButton = document.getElementById("game-over-menu-button") as HTMLElement;
        menuButton.removeEventListener("click", this.onQuit.bind(this));

        this.observers = [];
    }

    public onRetry(): void {
        this.observers.forEach(obs => obs.onRetry());
    }
    public onQuit(): void {
        this.observers.forEach(obs => obs.onQuit());
    }

    /**
     * Initializes button event listeners for retry/quit.
     */
    protected initialiseButtons(): void {
        const restartButton = document.getElementById("retry-button") as HTMLElement;
        const menuButton = document.getElementById("game-over-menu-button") as HTMLElement;
        restartButton.addEventListener("click", this.onRetry.bind(this));
        menuButton.addEventListener("click", this.onQuit.bind(this));
    }

    /**
     * Updates the animated score display.
     */
    public update(dt: number, _: CharacterInput): void {
        this.updateScore("final-loose-score", dt);
    }
}

/**
 * MultiLoseScreenHUD displays the multiplayer lose screen, disables the retry button, and handles quit.
 */
class MultiLoseScreenHUD extends loseScreenHUD {

    constructor(listener: IEndScreenHUDListener) {
        super(listener, 0, 0);
    }

    /**
     * Displays the multiplayer lose screen and hides the stats container.
     */
    protected display(): void {
        super.display();
        const finalScoreElement = document.getElementById("lose-stats-container") as HTMLElement;
        finalScoreElement.classList.add("hidden");
    }

    /**
     * Cleans up and hides the lose screen.
     */
    public dispose(): void {
        this.hide("game-over-screen");
    }

    /**
     * Initializes button event listeners for quit only (retry is hidden).
     */
    protected initialiseButtons(): void {
        const restartButton = document.getElementById("retry-button") as HTMLElement;
        restartButton.classList.add("hidden");

        const menuButton = document.getElementById("game-over-menu-button") as HTMLElement;
        menuButton.addEventListener("click", () => {
            this.observers.forEach(obs => obs.onQuit());
        });
    }

    public update(__: number, _: CharacterInput): void { }
}

/**
 * MultiWinScreenHUD displays the multiplayer win screen, disables the continue button, and handles quit.
 */
class MultiWinScreenHUD extends WinScreenHUD {

    constructor(listener: IEndScreenHUDListener) {
        super(listener, "normal", 0, 0);
    }

    /**
     * Displays the multiplayer win screen and hides the stats container.
     */
    protected display(): void {
        super.display();
        const finalScoreElement = document.getElementById("win-stats-container") as HTMLElement;
        finalScoreElement.classList.add("hidden");
    }

    /**
     * Initializes button event listeners for quit only (continue is hidden).
     */
    protected initialiseButtons(): void {
        const restartButton = document.getElementById("continue-button") as HTMLElement;
        restartButton.classList.add("hidden");

        const menuButton = document.getElementById("win-menu-button") as HTMLElement;
        menuButton.addEventListener("click", () => {
            this.observers.forEach(obs => obs.onQuit());
        });
    }

    public update(__: number, _: CharacterInput): void { }
}