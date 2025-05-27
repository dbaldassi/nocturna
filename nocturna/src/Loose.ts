import { Player } from "./GameObjects/Player";
import { Scene } from "@babylonjs/core";
import { CharacterInput, EndConditionObserver } from "./types";
import { Cube } from "./Cube";

export class LooseCondition {
    private player: Player;
    private observers: EndConditionObserver[] = [];
    private current: number = 0;
    private targetScore: number;
    private ended: boolean = false;
    private ground: number;
    public static mode: string = "normal";

    private deathMessages: string[] = [
        "The darkness has consumed you...",
        "Your light has been extinguished...",
        "The night claims another soul...",
        "The shadows have overwhelmed you...",
        "Your journey ends here... for now...",
    ];

    constructor(player: Player, ground: number) {
        this.player = player;
        this.ground = ground;
    }

    public checkLoose(_: number): boolean {
        return !this.player.isAlive();
    }

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
