import { createWinScreenHUD, createLoseScreenHUD, IEndScreenHUD } from "../HUD/EndScreenHUD";
import { LevelSelectionObserver, LevelSelectionScene } from "../LevelSelection";
import { GameScene } from "../scene/GameScene";
import { CharacterInput } from "../types";

export abstract class AbstractGameSceneState {
    protected gameScene: GameScene;

    constructor(gameScene: GameScene) {
        this.gameScene = gameScene;
    }

    public enter(): void {
        console.log(`Entering state: ${this.constructor.name}`);
    }
    public exit(): void {

    }

    public render(): void { }
    public update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return null;
    }
}

export class InGameState extends AbstractGameSceneState {
    constructor(gameScene: GameScene) {
        super(gameScene);
    }

    public exit(): void {
        this.gameScene.hideUI();
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.gameScene.updateObjects(dt, input);
        this.gameScene.updateTimer(dt);

        if(this.gameScene.checkWin()) {
            return new EndState(this.gameScene, 
                createWinScreenHUD(this.gameScene,
                    this.gameScene.hasNextLevel() ? "continue" : "normal",
                    this.gameScene.getScore(), 
                    this.gameScene.getTimer()));
        }

        if(this.gameScene.checkLoose()) {
            return new EndState(this.gameScene, createLoseScreenHUD(this.gameScene, this.gameScene.getScore(), this.gameScene.getTimer()));
        }

        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }
}

export class LoadingState extends AbstractGameSceneState {

    constructor(gameScene: GameScene) {
        super(gameScene);
    }

}

export class EndState extends AbstractGameSceneState {
    protected hud: IEndScreenHUD;

    constructor(scene: GameScene, hud: IEndScreenHUD) {
        super(scene);
        this.hud = hud;   
    }

    render(): void {}
    enter(): void {
        this.gameScene.removePhysics()
    }
    exit() {
        this.hud.dispose();
        this.hud = null;
    }

    update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.hud.update(dt, input);
        return null;
    }
}

export class SelectionState extends AbstractGameSceneState implements LevelSelectionObserver {
    private levelSelector: LevelSelectionScene;
    private level: string = null;
    private file: string = "game_levels.json";

    constructor(gameScene: GameScene) {
        super(gameScene);
    }

    public render(): void {
        this.gameScene.getScene().render();
    }

    public name(): string {
        return "Selection state";
    }

    enter() {
        this.levelSelector = new LevelSelectionScene(this.gameScene.getScene(), this, this.file);
    }

    exit() {
        // this.gameScene.getScene().dispose();
        this.levelSelector.dispose();
        this.gameScene.createLevel(this.level);
    }

    update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return this.level ? new LoadingState(this.gameScene) : null;
    }

    onLevelSelected(level: string): void {
        this.level = level;
    }
}