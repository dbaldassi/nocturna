import { Player } from "./GameObjects/Player";
import { Scene } from "@babylonjs/core";
import { CharacterInput } from "./types";

export class LooseCondition {
    private player: Player;
    private scene: Scene;
    private timeBelowThreshold: number = 0;
    private loseThreshold: number = 3000; // 3 seconds in milliseconds
    private lastYPos: number; // Example threshold for y-axis
    private lastTimer: number = 0; // Last timer value when the player was below the threshold

    private deathMessages: string[] = [
        "The darkness has consumed you...",
        "Your light has been extinguished...",
        "The night claims another soul...",
        "The shadows have overwhelmed you...",
        "Your journey ends here... for now...",
    ];

    constructor(player: Player, scene: Scene) {
        this.player = player;
        this.scene = scene;
    }

    public checkLoose(timer: number): boolean {
        if (this.lastYPos === undefined) {
            this.lastYPos = this.player.mesh.position.y; // Initialize lastYPos on first check
        }
        const playerY = this.player.mesh.position.y;
        if (playerY === this.lastYPos) {
            this.lastTimer = 0;
        }

        if (playerY < this.lastYPos) {
            this.lastYPos = playerY; // Update lastYPos if the player is below the previous position
            if (this.lastTimer === 0) {
                this.lastTimer = timer; // Set lastTimer when the player is below the threshold
            }
            if (timer - this.lastTimer > this.loseThreshold) {
                return true;
            }
        }

        return false;
    }

    public display(score: number, timer: number): void {
        const loseScreen = document.getElementById("game-over-screen") as HTMLElement;
        loseScreen.classList.remove("hidden");
        this.animateScore(score, timer);
    }

    public animateScore(score: number, time: number): void {
        const duration = 2000;
        const interval = 20;
        const step = score / (duration / interval);
        let current = 0;

        this.setRandomDeathMessage();
        const finalScoreElement = document.getElementById("final-loose-score")
        const finalTimerElement = document.getElementById("loose-timer")
        const finalTime = Math.floor(time / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        finalTimerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const timer = setInterval(() => {
            current += step;
            if (current >= score) {
                finalScoreElement.textContent = score.toLocaleString();
                clearInterval(timer);
            } else {
                finalScoreElement.textContent = Math.floor(current).toLocaleString();
            }
        }, interval);
        this.initialiseButtons();
    }

    private setRandomDeathMessage(): void {
        const deathMessageElement = document.getElementById("death-message") as HTMLElement;
        const randomIndex = Math.floor(Math.random() * this.deathMessages.length);
        deathMessageElement.textContent = this.deathMessages[randomIndex];
    }

    private initialiseButtons(): void {
        const restartButton = document.getElementById("retry-button") as HTMLElement;
        const menuButton = document.getElementById("game-over-menu-button") as HTMLElement;
        restartButton.addEventListener("click", () => {
            window.location.reload(); // Reload the page to restart the game
        });
        menuButton.addEventListener("click", () => {
            window.location.reload(); // Reload the page to restart the game
        });
    }

    public update(dt: number, input: CharacterInput) {

    }

}
