import { CharacterInput } from "../types";

export interface IEndScreenHUD {
    update(deltaTime: number, input: CharacterInput): void;
    dispose(): void;
}

export interface IEndScreenHUDListener {
    onRetry(): void;
    onContinue(): void;
    onQuit(): void;
}

export function createWinScreenHUD(listener: IEndScreenHUDListener, mode: string, score: number, time: number): WinScreenHUD {
    return new WinScreenHUD(listener, mode, score, time);
}

export function createLoseScreenHUD(listener: IEndScreenHUDListener, targetScore: number, time: number): loseScreenHUD {
    return new loseScreenHUD(listener, targetScore, time);
}

export function createMultiLoseScreenHUD(listener: IEndScreenHUDListener): MultiLoseScreenHUD {
    return new MultiLoseScreenHUD(listener);
}
export function createMultiWinScreenHUD(listener: IEndScreenHUDListener): MultiWinScreenHUD {
    return new MultiWinScreenHUD(listener);
}

abstract class EndScreenHUD implements IEndScreenHUD {
    protected observers: IEndScreenHUDListener[] = [];
    protected messages: string[] = [];

    constructor(listener: IEndScreenHUDListener) {
        this.observers.push(listener);
    }

    protected display(balise: string): void {
        const loseScreen = document.getElementById(balise) as HTMLElement;
        loseScreen.classList.remove("hidden");
    }

    public hide(balise: string): void {
        const loseScreen = document.getElementById(balise) as HTMLElement;
        loseScreen.classList.add("hidden"); // Ajouter la classe "hidden" pour masquer l'écran
    }

    protected setRandomMessage(balise: string): void {
        const deathMessageElement = document.getElementById(balise) as HTMLElement;
        const randomIndex = Math.floor(Math.random() * this.messages.length);
        deathMessageElement.textContent = this.messages[randomIndex];
    }

    public update(_: number, __: CharacterInput): void {

    }

    abstract dispose(): void;
}

abstract class BaseEndScreenHUD extends EndScreenHUD {
    private targetScore: number = 0;
    private time: number = 0;
    private current: number = 0;

    constructor(listener: IEndScreenHUDListener, targetScore: number, time: number) {
        super(listener);
        this.targetScore = targetScore;
        this.time = time;
    }

    protected animateScore(balise: string): void {
        const finalTimerElement = document.getElementById(balise);
        const finalTime = Math.floor(this.time / 1000);
        const minutes = Math.floor(finalTime / 60);
        const seconds = finalTime % 60;
        finalTimerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    protected updateScore(balise: string, dt: number): void {
        const finalScoreElement = document.getElementById(balise)

        this.current += dt;
        if (this.current >= this.targetScore) {
            finalScoreElement.textContent = this.targetScore.toLocaleString();
        } else {
            finalScoreElement.textContent = Math.floor(this.current).toLocaleString();
        }
    }
}

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

    protected display(): void {
        super.display("win-screen");
        this.initialiseButtons();
        this.animateScore("final-score"); // Initialize score display
    }

    public dispose(): void {
        this.hide("win-screen");
        const restartButton = document.getElementById("continue-button") as HTMLElement;
        if(this.mode == "normal") restartButton.removeEventListener("click", this.onRetry.bind(this));
        else restartButton.removeEventListener("click", this.onContinue.bind(this));
        const menuButton = document.getElementById("win-menu-button") as HTMLElement;
        menuButton.removeEventListener("click", this.onQuit.bind(this));

        this.observers = []; // Clear observers to prevent memory leaks
    }

    public update(dt: number, _: CharacterInput): void {
        this.updateScore("final-score", dt);
    }
}

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

    protected display(): void {
        super.display("game-over-screen");
        this.setRandomMessage("death-message");
        this.initialiseButtons();
        this.animateScore("final-loose-score"); // Initialize score display
    }

    public dispose(): void {
        this.hide("game-over-screen");
        const restartButton = document.getElementById("retry-button") as HTMLElement;
        restartButton.removeEventListener("click", this.onRetry.bind(this));
        const menuButton = document.getElementById("game-over-menu-button") as HTMLElement;
        menuButton.removeEventListener("click", this.onQuit.bind(this));

        this.observers = []; // Clear observers to prevent memory leaks
    }

    public onRetry(): void {
        this.observers.forEach(obs => obs.onRetry());
    }
    public onQuit(): void {
        this.observers.forEach(obs => obs.onQuit());
    }

    protected initialiseButtons(): void {
        const restartButton = document.getElementById("retry-button") as HTMLElement;
        const menuButton = document.getElementById("game-over-menu-button") as HTMLElement;
        restartButton.addEventListener("click", this.onRetry.bind(this));
        menuButton.addEventListener("click", this.onQuit.bind(this));
    }

    public update(dt: number, _: CharacterInput): void {
        this.updateScore("final-loose-score", dt);
    }
}

class MultiLoseScreenHUD extends loseScreenHUD {

    constructor(listener: IEndScreenHUDListener) {
        super(listener, 0, 0);
    }

    protected display(): void {
        super.display();
        const finalScoreElement = document.getElementById("lose-stats-container") as HTMLElement;
        finalScoreElement.classList.add("hidden");
    }

    public dispose(): void {
        this.hide("game-over-screen");
    }

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

class MultiWinScreenHUD extends WinScreenHUD {

    constructor(listener: IEndScreenHUDListener) {
        super(listener, "normal", 0, 0);
    }

    protected display(): void {
        super.display();
        const finalScoreElement = document.getElementById("win-stats-container") as HTMLElement;
        finalScoreElement.classList.add("hidden");
    }

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