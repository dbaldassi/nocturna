import { Player } from "./GameObjects/Player";
import { Scene } from "@babylonjs/core";
import { CharacterInput, EndConditionObserver } from "./types";
import { Cube } from "./Cube";

export class LooseCondition {
    private player: Player;
    private scene: Scene;
    private timeBelowThreshold: number = 0;
    private loseThreshold: number = 3000; // 3 seconds in milliseconds
    private lastYPos: number; // Example threshold for y-axis
    private lastTimer: number = 0; // Last timer value when the player was below the threshold
    private observers: EndConditionObserver[] = [];
    private current: number = 0;
    private targetScore: number;
    private ended: boolean = false;

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

    public checkLoose(_: number): boolean {
        console.log(this.player.getMesh().position.y, -Cube.DefaultSize / 2);
        // temp fix
        return this.player.getMesh().position.y < (-Cube.DefaultSize);
    }

    /*public checkLoose(timer: number): boolean {
        if (this.lastYPos === undefined) {
            this.lastYPos = this.player.getMesh().position.y; // Initialize lastYPos on first check
        }
        const playerY = this.player.getMesh().position.y;
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
    }*/

    public addObserver(observer: EndConditionObserver): void {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    public removeObserver(observer: EndConditionObserver): void {
        this.observers = this.observers.filter((obs) => obs !== observer);
    }

    public display(score: number, timer: number): void {
        const loseScreen = document.getElementById("game-over-screen") as HTMLElement;
        loseScreen.classList.remove("hidden");
        this.animateScore(score, timer);
    }

    public hide(): void {
        const loseScreen = document.getElementById("game-over-screen") as HTMLElement;
        loseScreen.classList.add("hidden"); // Ajouter la classe "hidden" pour masquer l'écran
    }

    public animateScore(score: number, time: number): void {
        this.targetScore = score;
        this.setRandomDeathMessage();
        const finalTimerElement = document.getElementById("loose-timer")
        const finalTime = Math.floor(time / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        finalTimerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

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
            this.observers.forEach(obs => obs.onRetry());
        });
        menuButton.addEventListener("click", () => {
            this.observers.forEach(obs => obs.onQuit());
        });
    }

    public updateScore(dt: number) {
        const finalScoreElement = document.getElementById("final-loose-score")

        this.current += dt;
        if (this.current >= this.targetScore) {
            finalScoreElement.textContent = this.targetScore.toLocaleString();
        } else {
            finalScoreElement.textContent = Math.floor(this.current).toLocaleString();
        }
    }

    public update(dt: number, _: CharacterInput): void {
        if(this.ended) this.updateScore(dt);
    }

}
